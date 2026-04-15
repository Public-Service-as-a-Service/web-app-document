import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const rootDir = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(rootDir, 'src');

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '@': srcDir,
      '@config': resolve(srcDir, 'config'),
      '@config/': `${resolve(srcDir, 'config')}/`,
      '@controllers/': `${resolve(srcDir, 'controllers')}/`,
      '@services/': `${resolve(srcDir, 'services')}/`,
      '@exceptions/': `${resolve(srcDir, 'exceptions')}/`,
      '@middlewares/': `${resolve(srcDir, 'middlewares')}/`,
      '@utils/': `${resolve(srcDir, 'utils')}/`,
    },
  },
});
