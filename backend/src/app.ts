import {
  APP_NAME,
  AUTH_TYPE,
  AUTHORIZED_GROUPS,
  BASE_URL_PREFIX,
  CREDENTIALS,
  LOG_FORMAT,
  NODE_ENV,
  ORIGIN,
  PORT,
  SAML_CALLBACK_URL,
  SAML_ENTRY_SSO,
  SAML_FAILURE_REDIRECT,
  SAML_IDP_PUBLIC_CERT,
  SAML_ISSUER,
  SAML_LOGOUT_CALLBACK_URL,
  SAML_PRIVATE_KEY,
  SAML_PUBLIC_KEY,
  SECRET_KEY,
  SESSION_MEMORY,
} from '@config';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import 'reflect-metadata';
import { getMetadataArgsStorage, useExpressServer } from 'routing-controllers';
import { routingControllersToSpec } from 'routing-controllers-openapi';
import { defaultMetadataStorage } from 'class-transformer/cjs/storage';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
import swaggerUi from 'swagger-ui-express';
import type { SchemaObject, ReferenceObject } from 'openapi3-ts';
import errorMiddleware from './middlewares/error.middleware';
import { logger, stream } from './utils/logger';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// SAML imports — only used when AUTH_TYPE=saml
import bodyParser from 'body-parser';
import session from 'express-session';
import passport from 'passport';
import { Strategy, VerifiedCallback } from '@node-saml/passport-saml';
import createMemoryStore from 'memorystore';
import createFileStore from 'session-file-store';
import { Profile } from './interfaces/profile.interface';
import { authorizeGroups, getPermissions, getRole } from './services/authorization.service';

const corsWhitelist = (ORIGIN || '').split(',');

function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

class App {
  public app: express.Application;
  public env: string;
  public port: string | number;

  constructor(Controllers: Function[]) {
    this.app = express();
    this.env = NODE_ENV || 'development';
    this.port = parseInt(PORT || '3000', 10);

    this.initializeDataFolders();
    this.initializeMiddlewares();

    if (AUTH_TYPE === 'saml') {
      this.initializeSaml();
    } else {
      logger.info('Auth mode: token — SAML disabled');
    }

    this.initializeRoutes(Controllers);
    this.initializeSwagger(Controllers);
    this.initializeErrorHandling();
  }

  public listen() {
    const server = this.app
      .listen(this.port, () => {
        logger.info(`=================================`);
        logger.info(`======= ENV: ${this.env} =======`);
        logger.info(`======= AUTH: ${AUTH_TYPE} =======`);
        logger.info(`App listening on port ${this.port}`);
        logger.info(`=================================`);
      })
      .on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          logger.error(
            `Port ${this.port} is already in use. Kill the existing process or use a different port.`
          );
        } else {
          logger.error(`Failed to start server: ${err.message}`);
        }
        process.exit(1);
      });

    return server;
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    this.app.use(morgan(LOG_FORMAT || 'dev', { stream }));
    this.app.use(hpp());
    this.app.use(helmet());
    this.app.use(compression());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());

    this.app.use(
      cors({
        credentials: CREDENTIALS === 'true',
        origin: function (origin, callback) {
          if (
            origin === undefined ||
            corsWhitelist.indexOf(origin) !== -1 ||
            corsWhitelist.indexOf('*') !== -1
          ) {
            callback(null, true);
          } else {
            if (NODE_ENV === 'development') {
              callback(null, true);
            } else {
              callback(new Error('Not allowed by CORS'));
            }
          }
        },
      })
    );
  }

  private initializeSaml() {
    this.validateSamlConfig();

    // Session store
    const SessionStoreCreate =
      SESSION_MEMORY === 'true' ? createMemoryStore(session) : createFileStore(session);
    const sessionTTL = 4 * 24 * 60 * 60; // 4 days
    const sessionStore = new SessionStoreCreate(
      SESSION_MEMORY === 'true'
        ? { checkPeriod: sessionTTL * 1000 }
        : { ttl: sessionTTL, path: './data/sessions' }
    );

    this.app.use(
      session({
        secret: SECRET_KEY,
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {
          path: '/',
          secure: NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'lax',
        },
      })
    );

    // Passport
    passport.serializeUser(function (user: any, done) {
      done(null, user);
    });
    passport.deserializeUser(function (user: any, done) {
      done(null, user);
    });

    const samlStrategy = new Strategy(
      {
        disableRequestedAuthnContext: true,
        identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified',
        callbackUrl: SAML_CALLBACK_URL || '',
        entryPoint: SAML_ENTRY_SSO || '',
        privateKey: SAML_PRIVATE_KEY,
        idpCert: SAML_IDP_PUBLIC_CERT || '',
        issuer: SAML_ISSUER || 'web-app-document',
        wantAssertionsSigned: false,
        signatureAlgorithm: 'sha256',
        digestAlgorithm: 'sha256',
        wantAuthnResponseSigned: false,
        acceptedClockSkewMs: 30000,
        logoutCallbackUrl: SAML_LOGOUT_CALLBACK_URL,
      },
      async function (profile: Profile | null, done: VerifiedCallback) {
        if (!profile) {
          logger.error('SAML verify: No profile received from IdP');
          return done(new Error('SAML_MISSING_PROFILE'));
        }

        logger.info(
          'SAML verify: Profile received, attributes: %s',
          JSON.stringify(Object.keys(profile))
        );
        logger.debug('SAML verify: Full profile: %s', JSON.stringify(profile, null, 2));

        const givenName =
          profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] ??
          profile['givenName'];
        const surname =
          profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] ?? profile['sn'];
        const email =
          profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ??
          profile['email'];
        const groups =
          profile['http://schemas.xmlsoap.org/claims/Group']?.join(',') ?? profile['groups'];
        const username = profile['urn:oid:0.9.2342.19200300.100.1.1'];

        logger.info(
          'SAML verify: Extracted - givenName=%s, surname=%s, email=%s, groups=%s, username=%s',
          givenName,
          surname,
          email,
          groups,
          username
        );

        if (!givenName || !surname) {
          logger.error(
            'SAML verify: Missing required attributes (givenName=%s, surname=%s)',
            givenName,
            surname
          );
          return done(new Error('SAML_MISSING_ATTRIBUTES'));
        }

        if (!groups || !authorizeGroups(groups)) {
          logger.error(
            'SAML verify: Group authorization failed. User groups: "%s", authorized: "%s"',
            groups,
            AUTHORIZED_GROUPS
          );
          return done(null, undefined, { message: 'SAML_MISSING_GROUP' });
        }

        const findUser = {
          name: `${givenName} ${surname}`,
          firstName: givenName,
          lastName: surname,
          username: username || '',
          email: email || '',
          groups: groups,
          role: getRole(groups),
          permissions: getPermissions(groups),
        };

        return done(null, findUser);
      },
      // Logout verify callback
      function (profile: any, done: VerifiedCallback) {
        return done(null, profile);
      }
    );

    this.app.use(passport.initialize());
    this.app.use(passport.session());
    passport.use('saml', samlStrategy as any);

    // SAML routes

    // Login
    this.app.get(
      `${BASE_URL_PREFIX}/saml/login`,
      (req, res, next) => {
        if (req.session.returnTo) {
          req.query.RelayState = req.session.returnTo;
        } else if (req.query.successRedirect) {
          req.query.RelayState = req.query.successRedirect as string;
        }
        if (req.query.failureRedirect) {
          req.query.RelayState = `${req.query.RelayState},${req.query.failureRedirect}`;
        }
        next();
      },
      (req, res, next) => {
        passport.authenticate('saml', {
          failureRedirect: SAML_FAILURE_REDIRECT,
        })(req, res, next);
      }
    );

    // Metadata
    this.app.get(`${BASE_URL_PREFIX}/saml/metadata`, (req, res) => {
      res.type('application/xml');
      const metadata = samlStrategy.generateServiceProviderMetadata(
        SAML_PUBLIC_KEY || null,
        SAML_PUBLIC_KEY || null
      );
      res.status(200).send(metadata);
    });

    // Logout
    this.app.get(
      `${BASE_URL_PREFIX}/saml/logout`,
      (req, res, next) => {
        if (req.session.returnTo) {
          req.query.RelayState = req.session.returnTo;
        } else if (req.query.successRedirect) {
          req.query.RelayState = req.query.successRedirect as string;
        }
        next();
      },
      (req, res, next) => {
        const successRedirect = req.query.successRedirect as string;
        samlStrategy.logout(req as any, () => {
          req.logout((err) => {
            if (err) {
              return next(err);
            }
            res.redirect(successRedirect);
          });
        });
      }
    );

    // Logout callback
    this.app.get(
      `${BASE_URL_PREFIX}/saml/logout/callback`,
      bodyParser.urlencoded({ extended: false }),
      (req, res, next) => {
        req.logout((err) => {
          if (err) {
            return next(err);
          }

          let successRedirect: URL | undefined;
          let failureRedirect: URL | undefined;
          const urls = req?.body?.RelayState?.split(',') || [];

          if (urls[0] && isValidUrl(urls[0])) {
            successRedirect = new URL(urls[0]);
          }
          if (urls[1] && isValidUrl(urls[1])) {
            failureRedirect = new URL(urls[1]);
          } else {
            failureRedirect = successRedirect;
          }

          if (failureRedirect) {
            res.redirect(failureRedirect.toString());
          } else if (successRedirect) {
            res.redirect(successRedirect.toString());
          } else {
            res.redirect('/');
          }
        });
      }
    );

    // Login callback handler (shared between GET and POST bindings)
    const loginCallbackHandler = (req: any, res: any, next: any) => {
      let successRedirect: URL | undefined;
      let failureRedirect: URL | undefined;
      const relayState = req?.body?.RelayState || req?.query?.RelayState || '';
      const urls = relayState.split(',');

      if (urls[0] && isValidUrl(urls[0])) {
        successRedirect = new URL(urls[0]);
      }
      if (urls[1] && isValidUrl(urls[1])) {
        failureRedirect = new URL(urls[1]);
      } else {
        failureRedirect = successRedirect;
      }

      const failUrl = failureRedirect || successRedirect;
      const successUrl = successRedirect;

      passport.authenticate('saml', (err: any, user: any, info: any) => {
        if (err) {
          logger.error('SAML callback: Authentication error - %s: %s', err?.name, err?.message);
          if (err.stack) logger.debug('SAML callback: Stack trace: %s', err.stack);
          if (failUrl) {
            const queries = new URLSearchParams(failUrl.searchParams);
            queries.append('failMessage', 'SAML_UNKNOWN_ERROR');
            failUrl.search = queries.toString();
            return res.redirect(failUrl.toString());
          }
          return res.redirect('/');
        }

        if (!user) {
          logger.error('SAML callback: No user returned. Info: %s', JSON.stringify(info));
          if (failUrl) {
            const queries = new URLSearchParams(failUrl.searchParams);
            queries.append('failMessage', info?.message || 'NO_USER');
            failUrl.search = queries.toString();
            return res.redirect(failUrl.toString());
          }
          return res.redirect('/');
        }

        logger.info(
          'SAML callback: User authenticated successfully - %s (%s)',
          user.name,
          user.username
        );

        req.login(user, (loginErr: any) => {
          if (loginErr) {
            logger.error('SAML callback: Session login error - %s', loginErr?.message);
            if (failUrl) {
              const queries = new URLSearchParams(failUrl.searchParams);
              queries.append('failMessage', 'SAML_UNKNOWN_ERROR');
              failUrl.search = queries.toString();
              return res.redirect(failUrl.toString());
            }
            return res.redirect('/');
          }
          logger.info(
            'SAML callback: Session established, redirecting to %s',
            successUrl?.toString() || '/'
          );
          return res.redirect(successUrl ? successUrl.toString() : '/');
        });
      })(req, res, next);
    };

    // Login callback - POST (HTTP-POST binding)
    this.app.post(
      `${BASE_URL_PREFIX}/saml/login/callback`,
      bodyParser.urlencoded({ extended: false }),
      loginCallbackHandler
    );

    // Login callback - GET (HTTP-Redirect binding)
    this.app.get(`${BASE_URL_PREFIX}/saml/login/callback`, loginCallbackHandler);

    logger.info('SAML authentication initialized');
  }

  private validateSamlConfig() {
    const requiredConfig = {
      SAML_CALLBACK_URL,
      SAML_ENTRY_SSO,
      SAML_IDP_PUBLIC_CERT,
    };
    const missingConfig = Object.entries(requiredConfig)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingConfig.length > 0) {
      throw new Error(`Missing required SAML configuration: ${missingConfig.join(', ')}`);
    }
  }

  private initializeRoutes(controllers: Function[]) {
    useExpressServer(this.app, {
      routePrefix: BASE_URL_PREFIX,
      controllers: controllers,
      defaultErrorHandler: false,
    });
  }

  private initializeSwagger(controllers: Function[]) {
    const schemas = validationMetadatasToSchemas({
      classTransformerMetadataStorage: defaultMetadataStorage,
      refPointerPrefix: '#/components/schemas/',
    });

    const routingControllersOptions = {
      routePrefix: `${BASE_URL_PREFIX}`,
      controllers: controllers,
    };

    const storage = getMetadataArgsStorage();
    const spec = routingControllersToSpec(storage, routingControllersOptions, {
      components: {
        schemas: schemas as { [schema: string]: SchemaObject | ReferenceObject },
        securitySchemes: {
          basicAuth: {
            scheme: 'basic',
            type: 'http',
          },
        },
      },
      info: {
        title: `${APP_NAME} Proxy API`,
        description: '',
        version: '1.0.0',
      },
    });

    this.app.use(`${BASE_URL_PREFIX}/swagger.json`, (_req: express.Request, res: express.Response) => {
      res.json(spec);
    });
    this.app.use(`${BASE_URL_PREFIX}/api-docs`, swaggerUi.serve, swaggerUi.setup(spec));
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }

  private initializeDataFolders() {
    const logsDir: string = join(__dirname, '../data/logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    if (AUTH_TYPE === 'saml' && SESSION_MEMORY !== 'true') {
      const sessionsDir: string = join(__dirname, '../data/sessions');
      if (!existsSync(sessionsDir)) {
        mkdirSync(sessionsDir, { recursive: true });
      }
    }
  }
}

export default App;
