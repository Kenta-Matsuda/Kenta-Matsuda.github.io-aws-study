#!/usr/bin/env node
/**
 * content-overlay.mjs — 学習コンテンツ（js/data/*.js）の翻訳オーバーレイを
 * 抽出・検証・索引化する（issue #197）。
 *
 * オーバーレイは js/data/i18n/<locale>/<sourceId>.json に置く:
 *   {
 *     "locale": "ko",
 *     "source": "clf-c02",
 *     "machineTranslated": true,
 *     "strings": { "<原文（英語。英語が無い項目は日本語）>": "<訳文>", ... }
 *   }
 * 実行時は js/localeContent.js の localizedField() が、表示中ロケールの訳文を
 * 原文キーで引く（無ければ英語 → 日本語へフォールバック）。キーは原文そのもの
 * なので、データ側で原文が変わると旧キーは「stale」になり、新しい原文は英語の
 * まま表示される（validate が検出する）。
 *
 * ソース ID:
 *   <examId>            js/data/<examId>.js（例: clf-c02）
 *   common              js/data/common-steps.js + common-defaults.js + 試験カテゴリ
 *   daily-challenge     js/data/daily-challenge.js
 *   offline-exam-bank   js/data/offline-exam-bank.js
 *
 * 使い方:
 *   node scripts/content-overlay.mjs sources
 *       ソース ID と原文の件数・文字数を一覧（翻訳作業量の見積もり）。
 *   node scripts/content-overlay.mjs extract --locale ko --source clf-c02 [--prune]
 *       原文を抽出してテンプレート（訳文 ""）を作成／既存ファイルへ不足キーを追記。
 *       --prune で原文に無くなった（stale）キーを削除。
 *   node scripts/content-overlay.mjs validate [--locale ko] [--source clf-c02] [--strict]
 *       形式・stale キー・未翻訳・プレースホルダ（URL / {{x}} / 先頭の箇条書き記号 /
 *       1.2.3 形式の番号）の保持を検査。エラーがあれば exit 1。--strict で未翻訳も
 *       エラー扱い。
 *   node scripts/content-overlay.mjs index
 *       訳文が 1 件以上あるファイルから js/data/i18n/index.json（ローダの目録）を再生成。
 *
 * 翻訳の約束（LLM に渡すときも同じ）:
 *   - AWS のサービス名・機能名・認定資格名は公式の英語表記のまま。
 *   - URL、{{placeholder}}、先頭の "- " などの記号、1.2.3 形式の番号はそのまま残す。
 *   - 値だけを訳し、キー（原文）は絶対に変更しない。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'js', 'data');
export const OVERLAY_DIR = path.join(dataDir, 'i18n');

/** Field bases that hold learner-facing text (see js/localeContent.js). */
export const CONTENT_FIELD_BASES = Object.freeze([
  'title', 'subtitle', 'description', 'knowledge', 'label', 'note', 'level',
  'question', 'choices', 'explanation',
]);

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function present(v) {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (Array.isArray(v)) return v.length > 0;
  return false;
}

/** Same resolution as localizedPair() in js/localeContent.js (kept dependency-free). */
function pairOf(obj, base) {
  const cap = capitalize(base);
  const jpKey = `jp${cap}` in obj ? `jp${cap}` : (`${base}Ja` in obj ? `${base}Ja` : null);
  if (jpKey) return { ja: obj[jpKey], en: present(obj[`${base}En`]) ? obj[`${base}En`] : obj[base] };
  return { ja: obj[base], en: obj[`${base}En`] };
}

/**
 * Collect the source strings (the overlay keys) of a data value: for every
 * object, every content field's English value (Japanese where an item has no
 * English), arrays flattened. First-seen order, de-duplicated.
 * @param {unknown} value
 * @returns {string[]}
 */
export function collectSourceStrings(value) {
  const out = new Set();
  const seen = new Set();
  const visit = (v) => {
    if (!v || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    for (const base of CONTENT_FIELD_BASES) {
      const pair = pairOf(v, base);
      const src = present(pair.en) ? pair.en : pair.ja;
      const list = Array.isArray(src) ? src : [src];
      for (const s of list) if (typeof s === 'string' && s.trim() !== '') out.add(s);
    }
    for (const [k, child] of Object.entries(v)) {
      if (child && typeof child === 'object') visit(child);
      void k;
    }
  };
  visit(value);
  return [...out];
}

async function importData(file) {
  return import(pathToFileURL(path.join(dataDir, file)).href);
}

/** @returns {Promise<string[]>} every known source id */
export async function listSourceIds() {
  const exams = readdirSync(dataDir).filter((f) => /^[a-z]{3}-c0\d\.js$/.test(f)).map((f) => f.replace(/\.js$/, '')).sort();
  return [...exams, 'common', 'daily-challenge', 'offline-exam-bank'];
}

/**
 * The data value behind a source id.
 * @param {string} id
 * @returns {Promise<unknown>}
 */
export async function loadSource(id) {
  if (id === 'common') {
    const [steps, defaults, exams] = await Promise.all([
      importData('common-steps.js'),
      importData('common-defaults.js'),
      import(pathToFileURL(path.join(root, 'js', 'exams.js')).href),
    ]);
    return [steps.COMMON_STEPS, Object.values(defaults.RESOURCE_GROUP_DEFAULTS), exams.EXAM_CATEGORIES];
  }
  if (id === 'daily-challenge') return (await importData('daily-challenge.js')).DAILY_CHALLENGE_QUESTIONS;
  if (id === 'offline-exam-bank') {
    const mod = await importData('offline-exam-bank.js');
    return Object.entries(mod).filter(([k, v]) => /_QUESTIONS$/.test(k) && Array.isArray(v)).map(([, v]) => v);
  }
  const file = `${id}.js`;
  if (!/^[a-z]{3}-c0\d$/.test(id) || !existsSync(path.join(dataDir, file))) throw new Error(`unknown source id: ${id}`);
  const mod = await importData(file);
  const exam = Object.values(mod).find((v) => v && typeof v === 'object' && v.id === id);
  if (!exam) throw new Error(`no exam object with id ${id} in ${file}`);
  return exam;
}

const URL_RE = /https?:\/\/[^\s)」』>\]]+/g;
const MUSTACHE_RE = /\{\{\s*[\w.]+\s*\}\}/g;
const DOTTED_NUMBER_RE = /\b\d+\.\d+(?:\.\d+)*\b/g;
const LEADING_MARK_RE = /^\s*([-•・*]|\d+\.)\s/;

function tokens(re, s) {
  return [...String(s).matchAll(re)].map((m) => m[0]).sort();
}

/**
 * Problems in one translation (empty array = fine).
 * @param {string} source
 * @param {string} translation
 * @returns {string[]}
 */
export function checkTranslation(source, translation) {
  const problems = [];
  if (typeof translation !== 'string') return ['translation is not a string'];
  if (translation.trim() === '') return [];
  for (const [name, re] of [['URL', URL_RE], ['placeholder', MUSTACHE_RE], ['section number', DOTTED_NUMBER_RE]]) {
    const want = tokens(re, source);
    const got = tokens(re, translation);
    const missing = want.filter((x) => { const i = got.indexOf(x); if (i === -1) return true; got.splice(i, 1); return false; });
    if (missing.length) problems.push(`${name} missing: ${missing.join(', ')}`);
  }
  const lead = String(source).match(LEADING_MARK_RE);
  if (lead && !String(translation).match(LEADING_MARK_RE)) problems.push(`leading "${lead[1]}" marker missing`);
  return problems;
}

/**
 * Validate one overlay object against the current source strings.
 * @param {object} overlay
 * @param {string[]} sourceStrings
 * @param {{ locale?: string, source?: string }} [expect]
 * @returns {{ errors: string[], stale: string[], untranslated: string[], translated: number }}
 */
export function validateOverlay(overlay, sourceStrings, expect = {}) {
  const errors = [];
  if (!overlay || typeof overlay !== 'object' || Array.isArray(overlay)) {
    return { errors: ['overlay is not an object'], stale: [], untranslated: [], translated: 0 };
  }
  if (expect.locale && overlay.locale !== expect.locale) errors.push(`locale "${overlay.locale}" does not match "${expect.locale}"`);
  if (expect.source && overlay.source !== expect.source) errors.push(`source "${overlay.source}" does not match "${expect.source}"`);
  const strings = overlay.strings;
  if (!strings || typeof strings !== 'object' || Array.isArray(strings)) {
    errors.push('"strings" must be an object');
    return { errors, stale: [], untranslated: [], translated: 0 };
  }
  const known = new Set(sourceStrings);
  const stale = Object.keys(strings).filter((k) => !known.has(k));
  const untranslated = sourceStrings.filter((s) => typeof strings[s] !== 'string' || strings[s].trim() === '');
  let translated = 0;
  for (const [src, dst] of Object.entries(strings)) {
    if (!known.has(src)) continue;
    for (const p of checkTranslation(src, dst)) errors.push(`${JSON.stringify(src.slice(0, 60))}: ${p}`);
    if (typeof dst === 'string' && dst.trim() !== '') translated++;
  }
  return { errors, stale, untranslated, translated };
}

/**
 * Template for a locale/source, keeping translations of an existing overlay.
 * @param {string} locale
 * @param {string} source
 * @param {string[]} sourceStrings
 * @param {object|null} existing
 * @param {{ prune?: boolean }} [opts]
 */
export function buildOverlayTemplate(locale, source, sourceStrings, existing = null, { prune = false } = {}) {
  const prev = existing?.strings || {};
  const strings = {};
  for (const s of sourceStrings) strings[s] = typeof prev[s] === 'string' ? prev[s] : '';
  if (!prune) for (const [k, v] of Object.entries(prev)) if (!(k in strings)) strings[k] = v;
  return { locale, source, machineTranslated: existing?.machineTranslated ?? true, strings };
}

/** Rebuild the loader manifest from overlay files with at least one translation. */
export function buildIndex(dir = OVERLAY_DIR) {
  const locales = {};
  if (!existsSync(dir)) return { locales };
  for (const locale of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
    const ids = readdirSync(path.join(dir, locale))
      .filter((f) => f.endsWith('.json'))
      .filter((f) => {
        const data = JSON.parse(readFileSync(path.join(dir, locale, f), 'utf8'));
        return Object.values(data.strings || {}).some((v) => typeof v === 'string' && v.trim() !== '');
      })
      .map((f) => f.replace(/\.json$/, ''))
      .sort();
    if (ids.length) locales[locale] = ids;
  }
  return { locales };
}

function overlayPath(locale, source) {
  return path.join(OVERLAY_DIR, locale, `${source}.json`);
}

function writeJson(file, data) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function argValue(args, name) {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
}

async function main(argv) {
  const [cmd, ...args] = argv;
  const locale = argValue(args, '--locale');
  const source = argValue(args, '--source');
  if (cmd === 'sources') {
    let total = 0; let totalChars = 0;
    for (const id of await listSourceIds()) {
      const strings = collectSourceStrings(await loadSource(id));
      const chars = strings.reduce((n, s) => n + s.length, 0);
      total += strings.length; totalChars += chars;
      console.log(`${id.padEnd(18)} ${String(strings.length).padStart(5)} strings ${String(chars).padStart(8)} chars`);
    }
    console.log(`${'total'.padEnd(18)} ${String(total).padStart(5)} strings ${String(totalChars).padStart(8)} chars`);
    return 0;
  }
  if (cmd === 'extract') {
    if (!locale || !source) throw new Error('extract needs --locale and --source');
    const strings = collectSourceStrings(await loadSource(source));
    const file = overlayPath(locale, source);
    const existing = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
    const tpl = buildOverlayTemplate(locale, source, strings, existing, { prune: args.includes('--prune') });
    writeJson(file, tpl);
    const todo = Object.values(tpl.strings).filter((v) => !v).length;
    console.log(`${path.relative(root, file)}: ${strings.length} source strings, ${todo} untranslated`);
    return 0;
  }
  if (cmd === 'validate') {
    const strict = args.includes('--strict');
    let failed = 0;
    if (!existsSync(OVERLAY_DIR)) { console.log('no overlays'); return 0; }
    const locales = locale ? [locale] : readdirSync(OVERLAY_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    const known = new Set(await listSourceIds());
    const cache = new Map();
    for (const loc of locales) {
      const dir = path.join(OVERLAY_DIR, loc);
      if (!existsSync(dir)) continue;
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
        const id = f.replace(/\.json$/, '');
        if (source && id !== source) continue;
        const rel = path.relative(root, path.join(dir, f));
        if (!known.has(id)) { console.log(`✗ ${rel}: unknown source id`); failed++; continue; }
        if (!cache.has(id)) cache.set(id, collectSourceStrings(await loadSource(id)));
        let overlay;
        try { overlay = JSON.parse(readFileSync(path.join(dir, f), 'utf8')); } catch (e) { console.log(`✗ ${rel}: invalid JSON (${e.message})`); failed++; continue; }
        const r = validateOverlay(overlay, cache.get(id), { locale: loc, source: id });
        const errs = [...r.errors];
        if (strict && r.untranslated.length) errs.push(`${r.untranslated.length} untranslated`);
        const status = errs.length ? '✗' : '✓';
        console.log(`${status} ${rel}: ${r.translated}/${cache.get(id).length} translated, ${r.untranslated.length} untranslated, ${r.stale.length} stale`);
        errs.slice(0, 20).forEach((e) => console.log(`    ${e}`));
        if (errs.length > 20) console.log(`    … ${errs.length - 20} more`);
        if (errs.length) failed++;
      }
    }
    // The manifest must match the files (the loader trusts it).
    const indexFile = path.join(OVERLAY_DIR, 'index.json');
    const want = JSON.stringify(buildIndex());
    const have = existsSync(indexFile) ? JSON.stringify(JSON.parse(readFileSync(indexFile, 'utf8'))) : null;
    if (have !== want) { console.log('✗ js/data/i18n/index.json is out of date (run: node scripts/content-overlay.mjs index)'); failed++; }
    return failed ? 1 : 0;
  }
  if (cmd === 'index') {
    const index = buildIndex();
    writeJson(path.join(OVERLAY_DIR, 'index.json'), index);
    console.log(JSON.stringify(index));
    return 0;
  }
  console.log('usage: node scripts/content-overlay.mjs <sources|extract|validate|index> [--locale <code>] [--source <id>] [--prune] [--strict]');
  return cmd ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(e.message || e); process.exit(1); });
}
