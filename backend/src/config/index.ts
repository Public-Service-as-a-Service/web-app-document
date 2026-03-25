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
} = process.env;
