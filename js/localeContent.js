/**
 * Localized access to static content (js/data/*.js) and AI prompt language
 * (issue #197).
 *
 * ── Data fields ────────────────────────────────────────────────────────────
 * The exam data files carry Japanese and English side by side with a few
 * naming conventions:
 *   - `title` (English) + `jpTitle` (Japanese)          steps, domains, tasks
 *   - `<field>` (Japanese) + `<field>En` (English)      description, knowledge,
 *                                                        label, title, note, level,
 *                                                        question, choices, ...
 *   - `<field>Ja` + `<field>En`                          category labels
 * `localizedField(obj, 'title')` hides those conventions and returns the value
 * for the current locale:
 *   - ja: Japanese, else English;
 *   - en: English, else Japanese;
 *   - any other locale: the translation from the locale's content overlay,
 *     else English, else Japanese (never Japanese while English exists).
 *
 * ── Content overlays ───────────────────────────────────────────────────────
 * Translations for other locales live outside the data files, in
 * `js/data/i18n/<locale>/<sourceId>.json`:
 *   { "locale": "ko", "source": "clf-c02", "machineTranslated": true,
 *     "strings": { "<source string>": "<translation>", ... } }
 * keyed by the SOURCE string (English, or Japanese where an item has no
 * English). Keying by content rather than by path keeps the data files
 * untouched, de-duplicates repeated strings, and makes a changed source string
 * fall back to English automatically until it is re-translated (the validator
 * reports the stale key). `js/data/i18n/index.json` lists which overlay files
 * exist so the loader never requests missing ones. See
 * scripts/content-overlay.mjs for extraction / validation.
 *
 * ── AI prompts ─────────────────────────────────────────────────────────────
 * Prompts keep their existing Japanese (ja) or English (everything else)
 * scaffolding; for locales other than ja/en, `outputLanguageDirective()` adds an
 * explicit instruction to write the output in that language.
 */

import { getLocale } from './i18n.js';
import { getPromptLanguageName } from './localeRegistry.js';

// ─── Field conventions ──────────────────────────────────────

function present(v) {
  if (v == null) return false;
  if (typeof v === 'string') return v !== '';
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * The Japanese / English values of `base` on `obj`, resolving the naming
 * conventions documented above.
 * @param {object} obj
 * @param {string} base e.g. 'title', 'description', 'label'
 * @returns {{ ja: any, en: any }}
 */
export function localizedPair(obj, base) {
  if (!obj || typeof obj !== 'object') return { ja: undefined, en: undefined };
  const cap = capitalize(base);
  const jpKey = `jp${cap}` in obj ? `jp${cap}` : (`${base}Ja` in obj ? `${base}Ja` : null);
  if (jpKey) {
    // `base` itself is the English value when a Japanese variant exists.
    return { ja: obj[jpKey], en: present(obj[`${base}En`]) ? obj[`${base}En`] : obj[base] };
  }
  return { ja: obj[base], en: obj[`${base}En`] };
}

/**
 * The source string a translation overlay is keyed by: English, else Japanese.
 * @param {{ ja: any, en: any }} pair
 * @returns {any}
 */
export function sourceOf(pair) {
  return present(pair.en) ? pair.en : pair.ja;
}

/**
 * Pick the value for `locale` from a Japanese / English pair (see header).
 * Arrays are translated element by element.
 * @param {{ ja?: any, en?: any }} pair
 * @param {string} [locale]
 * @returns {any}
 */
export function pickLocalized(pair, locale = getLocale()) {
  const { ja, en } = pair || {};
  if (locale === 'ja') return present(ja) ? ja : en;
  if (locale === 'en') return present(en) ? en : ja;
  return translateValue(sourceOf({ ja, en }), locale);
}

/**
 * Localized value of field `base` on a data object (see header).
 * @param {object} obj
 * @param {string} base
 * @param {string} [locale]
 * @returns {any} undefined when the object has neither variant
 */
export function localizedField(obj, base, locale = getLocale()) {
  return pickLocalized(localizedPair(obj, base), locale);
}

/**
 * Localized value from a per-locale map such as `{ ja: '…', en: '…' }`
 * (optionally with more locale keys). An explicit entry for the locale wins;
 * otherwise the ja / en fallback rules of pickLocalized apply.
 * @param {Record<string, any>} map
 * @param {string} [locale]
 * @returns {any}
 */
export function localizedValue(map, locale = getLocale()) {
  if (!map || typeof map !== 'object') return map;
  if (present(map[locale])) return map[locale];
  return pickLocalized({ ja: map.ja, en: map.en }, locale);
}

// ─── Content overlays ───────────────────────────────────────

/** locale -> Map(source string -> translation) */
const overlays = new Map();

/**
 * Merge translated strings for a locale into the in-memory overlay.
 * Empty translations are ignored (an untranslated template entry).
 * @param {string} locale
 * @param {Record<string, string>} strings
 */
export function registerContentOverlay(locale, strings) {
  if (!locale || !strings || typeof strings !== 'object') return;
  if (!overlays.has(locale)) overlays.set(locale, new Map());
  const map = overlays.get(locale);
  for (const [src, dst] of Object.entries(strings)) {
    if (typeof dst === 'string' && dst.trim() !== '') map.set(src, dst);
  }
}

/** Drop every registered overlay (tests). */
export function clearContentOverlays() {
  overlays.clear();
  loadedOverlayFiles.clear();
  manifestPromise = null;
}

/**
 * Translation of one source string for a locale, or undefined.
 * @param {string} source
 * @param {string} [locale]
 * @returns {string|undefined}
 */
export function translateContent(source, locale = getLocale()) {
  return overlays.get(locale)?.get(source);
}

function translateValue(value, locale) {
  if (Array.isArray(value)) return value.map((v) => translateValue(v, locale));
  if (typeof value !== 'string') return value;
  const hit = translateContent(value, locale);
  return hit !== undefined ? hit : value;
}

const loadedOverlayFiles = new Set();
let manifestPromise = null;

// Relative to the page (index.html sits at the site root, also under the
// GitHub Pages sub-path). import.meta is avoided so Node test runners that load
// this module as CommonJS-compatible source keep working.
const DEFAULT_OVERLAY_BASE = './js/data/i18n/';

/**
 * Load the overlay files for `locale` and the given source ids (exam ids,
 * 'common', ...) that exist according to js/data/i18n/index.json. ja / en
 * never need overlays. Network errors are swallowed (content stays English).
 * @param {string} locale
 * @param {string[]} ids
 * @param {{ base?: string, fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<boolean>} true when at least one new file was registered
 */
export async function loadContentOverlays(locale, ids, { base = DEFAULT_OVERLAY_BASE, fetchImpl = globalThis.fetch } = {}) {
  if (!locale || locale === 'ja' || locale === 'en' || typeof fetchImpl !== 'function') return false;
  if (!manifestPromise) {
    manifestPromise = fetchImpl(`${base}index.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  const manifest = await manifestPromise;
  const available = new Set(manifest?.locales?.[locale] || []);
  const wanted = [...new Set(ids || [])].filter((id) => id && available.has(id) && !loadedOverlayFiles.has(`${locale}/${id}`));
  if (!wanted.length) return false;
  const results = await Promise.all(wanted.map(async (id) => {
    try {
      const res = await fetchImpl(`${base}${locale}/${id}.json`);
      if (!res.ok) return false;
      const data = await res.json();
      registerContentOverlay(locale, data?.strings);
      loadedOverlayFiles.add(`${locale}/${id}`);
      return true;
    } catch {
      return false;
    }
  }));
  return results.some(Boolean);
}

// ─── AI prompt language ─────────────────────────────────────

/**
 * Whether prompts for this locale use the Japanese scaffolding. Every other
 * locale uses the English scaffolding (plus outputLanguageDirective).
 * @param {string} [locale]
 * @returns {boolean}
 */
export function usesJapanesePrompt(locale = getLocale()) {
  return locale === 'ja';
}

/**
 * Language name to put in prompts, e.g. 'Korean (한국어)'.
 * @param {string} [locale]
 * @returns {string}
 */
export function promptLanguageName(locale = getLocale()) {
  if (locale === 'ja') return 'Japanese (日本語)';
  return getPromptLanguageName(locale);
}

/**
 * Prompt suffix telling the model which language to write in. Empty for ja /
 * en, whose scaffolding is already in the output language, so their prompts
 * are unchanged.
 * @param {string} [locale]
 * @returns {string}
 */
export function outputLanguageDirective(locale = getLocale()) {
  if (locale === 'ja' || locale === 'en') return '';
  const name = promptLanguageName(locale);
  return `\n\n[Output Language] Write all natural-language text of your answer in ${name}. ` +
    'Keep AWS service and feature names in their official English form, and keep JSON keys, choice letters (A-D) and URLs unchanged.';
}
