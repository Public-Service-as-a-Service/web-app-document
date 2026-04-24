#!/usr/bin/env node
/**
 * Copies the pdfjs-dist web worker into /public so Next.js can serve it at a
 * predictable URL. The worker must match the pdfjs-dist version react-pdf
 * actually runs against — a mismatch between the main-thread lib and the
 * worker manifests as "Node cannot be found in the current page" warnings
 * and silent `onLoadError`s ("Kunde inte ladda förhandsvisning") in prod.
 *
 * So resolve the worker through react-pdf's own dependency tree rather than
 * trusting top-level hoisting: if a newer pdfjs-dist gets hoisted next to
 * react-pdf's pinned older copy, the hoisted one is wrong but "closer" to
 * the root.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(import.meta.url);

const reactPdfPkgPath = require.resolve('react-pdf/package.json');
const pdfjsPkgPath = require.resolve('pdfjs-dist/package.json', {
  paths: [dirname(reactPdfPkgPath)],
});
const source = join(dirname(pdfjsPkgPath), 'build', 'pdf.worker.min.mjs');

if (!existsSync(source)) {
  console.error(`[copy-pdf-worker] Source missing: ${source}`);
  process.exit(1);
}

const destDir = join(root, 'public');
const dest = join(destDir, 'pdf.worker.min.mjs');
mkdirSync(destDir, { recursive: true });
copyFileSync(source, dest);

// Log the resolved version so build logs make the binding obvious — if this
// ever drifts in CI it'll be visible at a glance.
const { version } = require(pdfjsPkgPath);
console.log(`[copy-pdf-worker] pdfjs-dist@${version} → ${dest}`);
