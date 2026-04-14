import { expect, test } from '@playwright/test';
import http, { type Server } from 'http';

const backendUrl = new URL(process.env.BACKEND_URL || 'http://127.0.0.1:3010');
const backendPort = Number(backendUrl.port || '80');
const backendHost = backendUrl.hostname;

const mockDocument = {
  registrationNumber: '2026-2281-0001',
  revision: 1,
  description: 'Publicerad riktlinje',
  type: 'POLICY',
  created: '2026-04-14T10:00:00.000Z',
  files: [
    {
      fileName: 'riktlinje.pdf',
      mimeType: 'application/pdf',
      fileSizeInBytes: 128,
      downloadUrl: '/d/2026-2281-0001/files/test-token',
      previewUrl: '/d/2026-2281-0001/preview/test-token',
      previewSupported: true,
    },
  ],
  downloadAllUrl: '/d/2026-2281-0001/download',
  metadataList: [{ key: 'kategori', value: 'Riktlinje' }],
};

test.describe('Public document links', () => {
  test.describe.configure({ mode: 'serial' });

  let server: Server;

  test.beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/api/public/d/2026-2281-0001') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(mockDocument));
        return;
      }

      if (req.url === '/api/public/d/missing') {
        res.statusCode = 404;
        res.end(JSON.stringify({ message: 'Not found' }));
        return;
      }

      if (req.url?.startsWith('/api/public/d/2026-2281-0001/preview/')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.end('pdf');
        return;
      }

      if (req.url?.startsWith('/api/public/d/2026-2281-0001/files/')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="riktlinje.pdf"');
        res.end('pdf');
        return;
      }

      res.statusCode = 404;
      res.end(JSON.stringify({ message: 'Not found' }));
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(backendPort, backendHost, () => resolve());
    });
  });

  test.afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('shows a public document without redirecting to login or locale prefix', async ({
    page,
  }) => {
    await page.goto('/d/2026-2281-0001');

    await expect(page).toHaveURL(/\/d\/2026-2281-0001$/);
    await expect(page.getByRole('heading', { name: 'Publicerad riktlinje' })).toBeVisible();
    await expect(page.getByText('2026-2281-0001')).toBeVisible();
    await expect(page.getByRole('link', { name: /ladda ner|download/i }).first()).toBeVisible();
  });

  test('shows neutral not found for unavailable public documents', async ({ page }) => {
    await page.goto('/d/missing');

    await expect(page).toHaveURL(/\/d\/missing$/);
    await expect(page.getByRole('heading', { name: /kunde inte hittas/i })).toBeVisible();
  });
});
