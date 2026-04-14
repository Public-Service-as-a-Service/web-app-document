import App from './app';
import { HealthController } from './controllers/health.controller';
import { DocumentController } from './controllers/document.controller';
import { DocumentTypeController } from './controllers/document-type.controller';
import { CompanyController } from './controllers/company.controller';
import { UserController } from './controllers/user.controller';
import { logger } from './utils/logger';

try {
  const app = new App([
    HealthController,
    DocumentController,
    DocumentTypeController,
    CompanyController,
    UserController,
  ]);

  app.listen();
} catch (error) {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  logger.error(`Fatal startup error: ${message}`);
  process.exit(1);
}
