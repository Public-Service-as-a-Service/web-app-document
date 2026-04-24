#!/usr/bin/env node
/**
 * Copies the pdfjs-dist web worker into /public so Next.js can serve it at a
 * predictable URL. The worker is ~1MB and bound to the exact pdfjs-dist
 * version in node_modules, so we derive both ends from the installed package
 * instead of CDN-ing or checking the file into git.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const source = join(root, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const destDir = join(root, 'public');
const dest = join(destDir, 'pdf.worker.min.mjs');

if (!existsSync(source)) {
  // In CI environments `yarn install` may run before pdfjs-dist is fully
  // extracted on the first cold cache — fail loudly rather than silently
  // shipping a broken preview.
  console.error(`[copy-pdf-worker] Source missing: ${source}`);
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(source, dest);
console.log(`[copy-pdf-worker] ${dest}`);
