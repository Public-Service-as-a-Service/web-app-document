import { BASE_URL_PREFIX, LOG_FORMAT, NODE_ENV, ORIGIN, PORT } from '@config';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import 'reflect-metadata';
import { useExpressServer } from 'routing-controllers';
import errorMiddleware from './middlewares/error.middleware';
import { stream } from './utils/logger';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const corsWhitelist = (ORIGIN || '').split(',');

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
    this.initializeRoutes(Controllers);
    this.initializeErrorHandling();
  }

  public listen() {
    this.app.listen(this.port, () => {
      console.log(`=================================`);
      console.log(`======= ENV: ${this.env} =======`);
      console.log(`App listening on port ${this.port}`);
      console.log(`=================================`);
    });
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

    this.app.use(
      cors({
        origin: function (origin, callback) {
          if (origin === undefined || corsWhitelist.indexOf(origin) !== -1 || corsWhitelist.indexOf('*') !== -1) {
            callback(null, true);
          } else {
            if (NODE_ENV === 'development') {
              callback(null, true);
            } else {
              callback(new Error('Not allowed by CORS'));
            }
          }
        },
      }),
    );
  }

  private initializeRoutes(controllers: Function[]) {
    useExpressServer(this.app, {
      routePrefix: BASE_URL_PREFIX,
      controllers: controllers,
      defaultErrorHandler: false,
    });
  }

  private initializeErrorHandling() {
    this.app.use(errorMiddleware);
  }

  private initializeDataFolders() {
    const logsDir: string = join(__dirname, '../data/logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
  }
}

export default App;
