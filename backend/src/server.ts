import App from './app';
import { HealthController } from './controllers/health.controller';
import { DocumentController } from './controllers/document.controller';
import { DocumentTypeController } from './controllers/document-type.controller';

const app = new App([HealthController, DocumentController, DocumentTypeController]);

app.listen();
