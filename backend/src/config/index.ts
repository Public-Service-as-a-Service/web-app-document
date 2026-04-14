import { config } from 'dotenv';
import { existsSync } from 'fs';
import { APIS } from './api-config';

export { APIS };

const env = process.env.NODE_ENV || 'development';
const envFiles = [`.env.${env}`, '.env'];

envFiles.forEach((envFile) => {
  if (existsSync(envFile)) {
    config({ path: envFile });
  }
});

export const {
  NODE_ENV,
  PORT,
  API_BASE_URL,
  LOG_FORMAT,
  LOG_DIR,
  ORIGIN,
  CLIENT_KEY,
  CLIENT_SECRET,
  BASE_URL_PREFIX,
  MUNICIPALITY_ID,
  NAMESPACE,

  // Auth
  AUTH_TYPE = 'saml',
  AUTH_MODE = 'oauth2',
  OAUTH2_TOKEN_URL,
  ACCESS_TOKEN = '',
  SECRET_KEY = 'default-secret-change-me',
  SESSION_MEMORY,
  CREDENTIALS,

  // SAML (only used when AUTH_TYPE=saml)
  SAML_CALLBACK_URL,
  SAML_LOGOUT_CALLBACK_URL,
  SAML_FAILURE_REDIRECT,
  SAML_ENTRY_SSO,
  SAML_ISSUER,
  SAML_IDP_PUBLIC_CERT,
  SAML_PRIVATE_KEY,
  SAML_PUBLIC_KEY,
  AUTHORIZED_GROUPS,
  ADMIN_GROUP,
  USER_GROUP,
} = process.env;
