#!/usr/bin/env node
/**
 * Collect every resource URL (`url` / `urlEn`) defined under js/data/ and report
 * aggregate statistics: unique URL count, unique URLs per exam, and a breakdown
 * by domain (AWS official vs. other).
 *
 * Why this exists: counting / auditing links by reading each data file with an
 * LLM burns a lot of context. Running this script and reading the summary is
 * dramatically cheaper, and the JSON output can feed a link checker later.
 *
 * Usage (NODE_OPTIONS must be cleared in this sandbox):
 *   env -u NODE_OPTIONS node scripts/collect-resource-urls.mjs
 *   env -u NODE_OPTIONS node scripts/collect-resource-urls.mjs --json out.json
 *   env -u NODE_OPTIONS node scripts/collect-resource-urls.mjs --list
 */

import { readdir } from 'node:fs/promises';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const DATA_DIR = path.resolve(process.cwd(), 'js/data');
const SKIP_FILES = new Set(['_placeholder.js', 'common-defaults.js']);

/** Recursively pull every `url` / `urlEn` string out of an arbitrary value. */
function walk(value, sink, sourceFile) {
  if (Array.isArray(value)) {
    for (const entry of value) walk(entry, sink, sourceFile);
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const key of ['url', 'urlEn']) {
    const url = value[key];
    if (typeof url === 'string' && url.trim() !== '') {
      sink.push({ url: url.trim(), field: key, file: sourceFile });
    }
  }
  for (const entry of Object.values(value)) walk(entry, sink, sourceFile);
}

function domainOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return '(invalid)';
  }
}

/** Domains owned / operated by AWS (documentation, training, blogs, tools). */
const AWS_OFFICIAL = [
  /(^|\.)aws\.amazon\.com$/,
  /(^|\.)amazonaws\.com$/,
  /(^|\.)awsstatic\.com$/,
  /(^|\.)awscloud\.com$/,
  /(^|\.)aws\.training$/,
  /(^|\.)aws$/, // skillbuilder.aws, repost.aws, calculator.aws, ...
  /(^|\.)wellarchitectedlabs\.com$/,
];

function isAwsOfficial(hostname) {
  return AWS_OFFICIAL.some((pattern) => pattern.test(hostname));
}

/**
 * Canonical form used for de-duplication of the same document served in ja / en.
 * Strips the locale path segment (`/jp`, `/ja_jp`) but KEEPS the fragment,
 * because pages such as the Black Belt overview use `#:~:text=` fragments to
 * point at distinct decks - those are separate learning resources.
 */
function canonicalize(url, { dropFragment = false } = {}) {
  try {
    const u = new URL(url);
    let pathname = u.pathname.replace(/^\/(?:jp|ja_jp|ja)(?=\/|$)/, '');
    pathname = pathname.replace(/\/+$/, '') || '/';
    const hash = dropFragment ? '' : u.hash;
    return `${u.protocol}//${u.hostname}${pathname}${u.search}${hash}`;
  } catch {
    return url;
  }
}

/** Count `items` entries (a resource card row) across a data module. */
function countItems(value) {
  let total = 0;
  if (Array.isArray(value)) {
    for (const entry of value) total += countItems(entry);
    return total;
  }
  if (!value || typeof value !== 'object') return 0;
  if (Array.isArray(value.items)) total += value.items.length;
  for (const entry of Object.values(value)) total += countItems(entry);
  return total;
}

const files = (await readdir(DATA_DIR))
  .filter((name) => name.endsWith('.js') && !SKIP_FILES.has(name))
  .sort();

const all = [];
const perFile = new Map();
const itemCounts = new Map();

for (const name of files) {
  const mod = await import(pathToFileURL(path.join(DATA_DIR, name)).href);
  const found = [];
  walk(mod, found, name);
  all.push(...found);
  perFile.set(name, found);
  itemCounts.set(name, countItems(mod));
}

const uniqueRaw = new Set(all.map((entry) => entry.url));
const uniqueCanonical = new Set(all.map((entry) => canonicalize(entry.url)));
const uniquePages = new Set(all.map((entry) => canonicalize(entry.url, { dropFragment: true })));
const domains = new Map();
for (const url of uniqueRaw) {
  const host = domainOf(url);
  domains.set(host, (domains.get(host) ?? 0) + 1);
}
const awsOfficialUnique = [...uniqueRaw].filter((url) => isAwsOfficial(domainOf(url)));

const report = {
  generatedAt: new Date().toISOString().slice(0, 10),
  filesScanned: files,
  totalReferences: all.length,
  totalResourceItems: [...itemCounts.values()].reduce((a, b) => a + b, 0),
  uniqueUrls: uniqueRaw.size,
  uniqueDocuments: uniqueCanonical.size,
  uniquePages: uniquePages.size,
  uniqueAwsOfficialUrls: awsOfficialUnique.length,
  perFile: Object.fromEntries(
    [...perFile].map(([name, entries]) => [
      name,
      {
        items: itemCounts.get(name) ?? 0,
        references: entries.length,
        uniqueUrls: new Set(entries.map((e) => e.url)).size,
        uniqueDocuments: new Set(entries.map((e) => canonicalize(e.url))).size,
      },
    ]),
  ),
  domains: Object.fromEntries([...domains].sort((a, b) => b[1] - a[1])),
};

const jsonFlagIndex = process.argv.indexOf('--json');
if (jsonFlagIndex !== -1) {
  const out = process.argv[jsonFlagIndex + 1] ?? 'resource-urls.json';
  await writeFile(out, `${JSON.stringify({ ...report, urls: [...uniqueRaw].sort() }, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${out}`);
}

if (process.argv.includes('--list')) {
  for (const url of [...uniqueRaw].sort()) console.log(url);
  process.exit(0);
}

console.log(`Scanned files              : ${files.length}`);
console.log(`Resource items (cards)    : ${report.totalResourceItems}`);
console.log(`Total url/urlEn refs      : ${report.totalReferences}`);
console.log(`Unique URL strings        : ${report.uniqueUrls}`);
console.log(`Unique docs (ja/en merged): ${report.uniqueDocuments}`);
console.log(`Unique pages (no fragment): ${report.uniquePages}`);
console.log(`Unique AWS official URLs  : ${report.uniqueAwsOfficialUrls}`);
console.log('\nPer file (items / refs / unique URLs / unique docs):');
for (const [name, stats] of Object.entries(report.perFile)) {
  console.log(
    `  ${name.padEnd(20)} ${String(stats.items).padStart(4)} / ${String(stats.references).padStart(4)} / ` +
      `${String(stats.uniqueUrls).padStart(4)} / ${String(stats.uniqueDocuments).padStart(4)}`,
  );
}
console.log('\nTop domains (unique URLs):');
for (const [host, count] of Object.entries(report.domains).slice(0, 20)) {
  console.log(`  ${host.padEnd(34)} ${String(count).padStart(4)}${isAwsOfficial(host) ? '  [AWS]' : ''}`);
}
