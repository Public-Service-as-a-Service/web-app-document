import App from './app';
import { HealthController } from './controllers/health.controller';
import { DocumentController } from './controllers/document.controller';
import { DocumentTypeController } from './controllers/document-type.controller';
import { UserController } from './controllers/user.controller';

const app = new App([HealthController, DocumentController, DocumentTypeController, UserController]);

app.listen();
