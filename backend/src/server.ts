import App from './app';
import { HealthController } from './controllers/health.controller';
import { DocumentController } from './controllers/document.controller';

const app = new App([HealthController, DocumentController]);

app.listen();
