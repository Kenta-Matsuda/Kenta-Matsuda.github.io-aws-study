/**
 * Single source of truth for the locales the site ships (issue #197).
 *
 * The i18n core (js/i18n.js) derives its supported set from the dictionaries
 * passed to initI18n. This registry decides WHICH dictionaries are loaded
 * (js/app.js), and drives the header language menu and the settings modal
 * language selector (js/ui.js), so adding a language is:
 *   1. add js/locales/<code>.json (a full key mirror of en.json),
 *   2. add an entry here,
 *   3. add './js/locales/<code>.json' to the precache list in sw.js.
 *
 * The set mirrors the languages AWS documentation is published in. Locales
 * other than ja/en are LLM-translated (user decision 2026-10-13, see
 * docs/action-required/issue-197-multilanguage-support.md) and are flagged with
 * `machineTranslated` so the UI can show a notice inviting corrections.
 *
 * Per-locale metadata:
 *   - label:        native display name (language menu)
 *   - englishName:  English name, used to tell AI models which language to write
 *   - intl:         BCP 47 tag for Intl date / number formatting
 *   - awsDocs:      docs.aws.amazon.com path segment ('' = English, no segment)
 *
 * Pure module: no DOM / network / storage access.
 */

/**
 * Every language AWS documentation is published in, with its metadata. Known
 * here independently of whether the site ships it, so prompt language names,
 * docs URL paths and browser detection work for any of them.
 * @typedef {{ code: string, label: string, englishName: string, intl: string, awsDocs: string, machineTranslated?: boolean }} LocaleEntry
 * @type {Readonly<Record<string, LocaleEntry>>}
 */
export const LOCALE_METADATA = Object.freeze({
  ja: Object.freeze({ code: 'ja', label: '日本語', englishName: 'Japanese', intl: 'ja-JP', awsDocs: 'ja_jp' }),
  en: Object.freeze({ code: 'en', label: 'English', englishName: 'English', intl: 'en-US', awsDocs: '' }),
  ko: Object.freeze({ code: 'ko', label: '한국어', englishName: 'Korean', intl: 'ko-KR', awsDocs: 'ko_kr', machineTranslated: true }),
  'zh-CN': Object.freeze({ code: 'zh-CN', label: '中文(简体)', englishName: 'Simplified Chinese', intl: 'zh-CN', awsDocs: 'zh_cn', machineTranslated: true }),
  'zh-TW': Object.freeze({ code: 'zh-TW', label: '中文(繁體)', englishName: 'Traditional Chinese', intl: 'zh-TW', awsDocs: 'zh_tw', machineTranslated: true }),
  fr: Object.freeze({ code: 'fr', label: 'Français', englishName: 'French', intl: 'fr-FR', awsDocs: 'fr_fr', machineTranslated: true }),
  de: Object.freeze({ code: 'de', label: 'Deutsch', englishName: 'German', intl: 'de-DE', awsDocs: 'de_de', machineTranslated: true }),
  es: Object.freeze({ code: 'es', label: 'Español', englishName: 'Spanish', intl: 'es-ES', awsDocs: 'es_es', machineTranslated: true }),
  it: Object.freeze({ code: 'it', label: 'Italiano', englishName: 'Italian', intl: 'it-IT', awsDocs: 'it_it', machineTranslated: true }),
  'pt-BR': Object.freeze({ code: 'pt-BR', label: 'Português', englishName: 'Brazilian Portuguese', intl: 'pt-BR', awsDocs: 'pt_br', machineTranslated: true }),
  id: Object.freeze({ code: 'id', label: 'Bahasa Indonesia', englishName: 'Indonesian', intl: 'id-ID', awsDocs: 'id_id', machineTranslated: true }),
});

/**
 * The locales the site ships, in display order (each has js/locales/<code>.json).
 * @type {ReadonlyArray<LocaleEntry>}
 */
export const LOCALE_REGISTRY = Object.freeze(
  ['ja', 'en', 'ko', 'zh-CN', 'zh-TW', 'fr', 'de', 'es', 'it', 'pt-BR', 'id'].map((code) => LOCALE_METADATA[code]),
);

function entryFor(code) {
  return Object.prototype.hasOwnProperty.call(LOCALE_METADATA, code) ? LOCALE_METADATA[code] : null;
}

/** @returns {string[]} registered locale codes in display order */
export function getRegisteredLocaleCodes() {
  return LOCALE_REGISTRY.map((l) => l.code);
}

/**
 * Native display name for a locale code (falls back to the upper-cased code).
 * @param {string} code
 * @returns {string}
 */
export function getLocaleLabel(code) {
  const entry = entryFor(code);
  return entry ? entry.label : String(code || '').toUpperCase();
}

/**
 * Whether a locale's UI / content strings are machine (LLM) translated.
 * @param {string} code
 * @returns {boolean}
 */
export function isMachineTranslatedLocale(code) {
  return Boolean(entryFor(code)?.machineTranslated);
}

/**
 * BCP 47 tag for Intl formatting (falls back to the code itself, then en-US).
 * @param {string} code
 * @returns {string}
 */
export function getIntlLocale(code) {
  return entryFor(code)?.intl || code || 'en-US';
}

/**
 * The language name used in AI prompts, e.g. 'Korean (한국어)'. English and
 * unknown codes give 'English'.
 * @param {string} code
 * @returns {string}
 */
export function getPromptLanguageName(code) {
  const entry = entryFor(code);
  if (!entry || entry.code === 'en') return 'English';
  return `${entry.englishName} (${entry.label})`;
}

/**
 * The locale the header toggle switches to: the next one in `codes`, wrapping
 * around. An unknown `current` resolves to the first code.
 * @param {string} current
 * @param {string[]} [codes]
 * @returns {string}
 */
export function nextLocale(current, codes = getRegisteredLocaleCodes()) {
  if (!codes.length) return current;
  const i = codes.indexOf(current);
  return codes[(i + 1) % codes.length];
}

/**
 * Map browser language tags (navigator.languages order) to a supported locale.
 * Per tag: an exact (case-insensitive) match wins, then Chinese script / region
 * rules (zh-Hant, zh-TW, zh-HK, zh-MO -> zh-TW; any other zh -> zh-CN),
 * Portuguese (any pt -> pt-BR), the legacy Indonesian tag 'in' -> id, and
 * finally the primary subtag ('fr-CA' -> fr). Returns null when nothing matches.
 * @param {string[]} tags
 * @param {string[]} supported
 * @returns {string|null}
 */
export function matchBrowserLocale(tags, supported) {
  const byLower = new Map((supported || []).map((c) => [String(c).toLowerCase(), c]));
  for (const raw of tags || []) {
    const tag = String(raw || '').trim().replace(/_/g, '-').toLowerCase();
    if (!tag) continue;
    if (byLower.has(tag)) return byLower.get(tag);
    const [primary, ...rest] = tag.split('-');
    let candidate = primary;
    if (primary === 'zh') {
      const traditional = rest.some((s) => s === 'hant' || s === 'tw' || s === 'hk' || s === 'mo');
      candidate = traditional ? 'zh-tw' : 'zh-cn';
    } else if (primary === 'pt') {
      candidate = 'pt-br';
    } else if (primary === 'in') {
      candidate = 'id';
    }
    if (byLower.has(candidate)) return byLower.get(candidate);
  }
  return null;
}

const DOCS_HOST = 'docs.aws.amazon.com';
const DOCS_LOCALE_SEGMENT = /^[a-z]{2}_[a-z]{2}$/i;

/**
 * Point a docs.aws.amazon.com URL at the given locale's documentation
 * (e.g. /ja_jp/glue/... -> /ko_kr/glue/...; English has no segment). Other
 * hosts are returned unchanged: their localized pages do not follow one
 * pattern, so we never invent URLs for them.
 * @param {string} url
 * @param {string} code
 * @returns {string}
 */
export function localizeAwsDocsUrl(url, code) {
  if (typeof url !== 'string' || !url) return url;
  const entry = entryFor(code);
  if (!entry) return url;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== DOCS_HOST) return url;
  const segments = parsed.pathname.split('/');
  // segments[0] is '' (leading slash).
  if (segments[1] && DOCS_LOCALE_SEGMENT.test(segments[1])) segments.splice(1, 1);
  if (entry.awsDocs) segments.splice(1, 0, entry.awsDocs);
  const pathname = segments.join('/');
  // Unchanged path: return the input verbatim (URL serialization could
  // otherwise re-encode fragments such as #:~:text=).
  if (pathname === parsed.pathname) return url;
  parsed.pathname = pathname;
  return parsed.toString();
}

/**
 * Locale-aware URL choice for a data item that has a base (Japanese) URL and
 * an optional English URL (`url` / `urlEn` in js/data/*.js).
 *   - ja: the base URL, unchanged;
 *   - en and every other locale: the explicit English URL, else urlMap[base],
 *     else the base URL — and an AWS docs URL is then pointed at that locale's
 *     documentation (localizeAwsDocsUrl). Other hosts are kept as is.
 * @param {string} code
 * @param {string} jaUrl
 * @param {string} [enUrl]
 * @param {Record<string, string>} [urlMap]
 * @returns {string}
 */
export function resolveLocalizedUrl(code, jaUrl, enUrl, urlMap = {}) {
  if (code === 'ja') return jaUrl;
  const chosen = enUrl || (urlMap && urlMap[jaUrl]) || jaUrl;
  return localizeAwsDocsUrl(chosen, code);
}
