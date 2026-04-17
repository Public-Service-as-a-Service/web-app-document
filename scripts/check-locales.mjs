#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCALES_DIR = join(ROOT, 'frontend', 'locales');

const KEY_LINE_RE = /^\s*"([^"\\]+)"\s*:/;

function listLocaleFiles() {
  const out = [];
  for (const locale of readdirSync(LOCALES_DIR)) {
    const localePath = join(LOCALES_DIR, locale);
    if (!statSync(localePath).isDirectory()) continue;
    for (const entry of readdirSync(localePath)) {
      if (entry.endsWith('.json')) out.push(join(localePath, entry));
    }
  }
  return out;
}

function findDuplicateKeys(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const seen = new Map();
  const dupes = [];
  text.split('\n').forEach((line, idx) => {
    const m = KEY_LINE_RE.exec(line);
    if (!m) return;
    const key = m[1];
    const lineNo = idx + 1;
    if (seen.has(key)) {
      dupes.push({ key, firstLine: seen.get(key), dupeLine: lineNo });
    } else {
      seen.set(key, lineNo);
    }
  });
  return dupes;
}

function readKeys(filePath) {
  const json = JSON.parse(readFileSync(filePath, 'utf8'));
  return new Set(Object.keys(json));
}

function groupByNamespace(files) {
  const byNs = new Map();
  for (const f of files) {
    const rel = relative(LOCALES_DIR, f);
    const [locale, ...rest] = rel.split('/');
    const ns = rest.join('/');
    if (!byNs.has(ns)) byNs.set(ns, new Map());
    byNs.get(ns).set(locale, f);
  }
  return byNs;
}

let errors = 0;

const files = listLocaleFiles();
if (files.length === 0) {
  console.error(`No locale files found under ${LOCALES_DIR}`);
  process.exit(1);
}

for (const file of files) {
  const dupes = findDuplicateKeys(file);
  if (dupes.length > 0) {
    errors += dupes.length;
    console.error(`\n[duplicate keys] ${relative(ROOT, file)}`);
    for (const d of dupes) {
      console.error(`  "${d.key}" appears on line ${d.firstLine} and line ${d.dupeLine}`);
    }
  }
}

const byNs = groupByNamespace(files);
for (const [ns, locales] of byNs) {
  const localeNames = [...locales.keys()];
  if (localeNames.length < 2) continue;
  const keysByLocale = new Map();
  for (const [locale, file] of locales) {
    keysByLocale.set(locale, readKeys(file));
  }
  const allKeys = new Set();
  for (const set of keysByLocale.values()) for (const k of set) allKeys.add(k);
  for (const key of allKeys) {
    const missingFrom = [];
    for (const [locale, set] of keysByLocale) {
      if (!set.has(key)) missingFrom.push(locale);
    }
    if (missingFrom.length > 0) {
      errors++;
      console.error(
        `[locale parity] ${ns}: key "${key}" missing from ${missingFrom.join(', ')}`
      );
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} locale issue(s) found.`);
  process.exit(1);
}

console.log(`Locale check OK (${files.length} file(s)).`);
