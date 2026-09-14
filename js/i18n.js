/**
 * Internationalization (i18n) module for AWS Study Navigator.
 *
 * N-locale-capable core. The engine itself is locale-agnostic: the set of
 * supported locales is derived at runtime from the locale dictionaries passed
 * to `initI18n`, so adding a language only requires a locale dictionary (plus,
 * for content, human-verified translations) rather than changes to this file.
 *
 * The site currently ships Japanese (`ja`) and English (`en`). All observable
 * ja/en behavior (default `en`, `navigator.language === 'ja'` detection,
 * ja↔en URL localization and English fallback) is preserved byte-for-byte.
 *
 * See issue #197 and docs/action-required/issue-197-multilanguage-support.md
 * ("i18n コアが 2 言語をハードコードしている" — layer 1) for the scope of this
 * generalization. Adding real languages further requires locale dictionaries
 * and human-verified content translation, which remain out of scope here.
 */

const LOCALE_STORAGE_KEY = 'asn_locale';
// Locales assumed when no locale data is supplied (legacy default shape).
const DEFAULT_SUPPORTED_LOCALES = ['ja', 'en'];
const DEFAULT_LOCALE = 'en';
// Locale used by t() when a key is missing in the current locale. English is
// the guaranteed-complete dictionary, matching the historical ja/en fallback.
const FALLBACK_LOCALE = 'en';

let currentLocale = DEFAULT_LOCALE;
// Supported locales are derived from the locale data passed to initI18n and
// default to ['ja', 'en'] when none is supplied (legacy shape).
let supportedLocales = DEFAULT_SUPPORTED_LOCALES.slice();
let locales = {}; // { <lang>: {...}, ... } (currently { ja, en })
let urlMap = {}; // Japanese (base) URL → alternate-locale URL mapping (currently ja → en)
let listeners = [];

/**
 * Initialize i18n with locale data.
 *
 * Accepts either the legacy 2-language shape `{ ja: {...}, en: {...} }` or a
 * general map of `{ <lang>: {...}, ... }`. Supported locales are derived from
 * the keys of `localeData`, falling back to ['ja', 'en'] when it is empty.
 *
 * @param {{ [lang: string]: object }} localeData
 * @param {object} [urlMapping] - Base (Japanese) URL to alternate-locale URL mapping
 */
export function initI18n(localeData, urlMapping) {
  locales = localeData || {};
  urlMap = urlMapping || {};
  const derived = Object.keys(locales);
  supportedLocales = derived.length ? derived : DEFAULT_SUPPORTED_LOCALES.slice();
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved && supportedLocales.includes(saved)) {
    currentLocale = saved;
  } else {
    // Detect browser language: use the 2-letter navigator.language when it is
    // a supported locale, otherwise the default locale. For the current ja/en
    // set this keeps 'ja' -> 'ja' and everything-else -> 'en' unchanged.
    const browserLang = (navigator.language || '').slice(0, 2);
    currentLocale = supportedLocales.includes(browserLang) ? browserLang : DEFAULT_LOCALE;
  }
  applyLocaleToDocument();
}

/**
 * Get the current locale.
 * @returns {string} e.g. 'ja' | 'en'
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Set the locale and persist to localStorage.
 * @param {string} locale - must be one of the supported locales
 */
export function setLocale(locale) {
  if (!supportedLocales.includes(locale)) return;
  currentLocale = locale;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  applyLocaleToDocument();
  translateStaticElements();
  notifyListeners();
}

/**
 * Translate a key. Supports nested keys with dot notation (e.g., 'quiz.start').
 * Falls back to key itself if translation not found.
 * Supports interpolation with {{variable}} syntax.
 * @param {string} key
 * @param {object} [params] - Interpolation parameters
 * @returns {string}
 */
export function t(key, params) {
  const dict = locales[currentLocale] || locales[FALLBACK_LOCALE] || {};
  let value = resolveKey(dict, key);
  if (value === undefined) {
    // Fallback to the fallback locale (English).
    const fallback = locales[FALLBACK_LOCALE] || {};
    value = resolveKey(fallback, key);
  }
  if (value === undefined) return key;

  // Interpolation
  if (params && typeof value === 'string') {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }
  return value;
}

// The base locale whose URL is the default (unmapped) argument to
// getLocalizedUrl. Japanese is the base: getLocalizedUrl(jaUrl, enUrl) returns
// jaUrl unless a non-base locale has an explicit or mapped alternate.
const BASE_URL_LOCALE = 'ja';

/**
 * Get a locale-aware URL.
 *
 * The first argument is the base (Japanese) URL and the second is the explicit
 * alternate-locale (English) URL. When the current locale is the base locale
 * (`ja`) the base URL is returned unchanged. For any non-base locale the
 * explicit alternate is preferred, then the `urlMap` lookup, then the base URL
 * as a final fallback.
 *
 * For the current ja/en locale set this is identical to the previous
 * ja↔en behavior (base `ja` -> jaUrl; `en` -> enUrl, else urlMap[jaUrl], else
 * jaUrl). Per-locale URL maps (keyed by locale) are a future extension point;
 * the current `urlMap` remains the ja→en map.
 *
 * @param {string} jaUrl - base (Japanese) URL (default)
 * @param {string} [enUrl] - alternate-locale (English) URL (optional, explicit override)
 * @returns {string}
 */
export function getLocalizedUrl(jaUrl, enUrl) {
  if (currentLocale !== BASE_URL_LOCALE) {
    if (enUrl) return enUrl;
    // Check URL mapping (currently the ja → en map)
    const mapped = urlMap[jaUrl];
    if (mapped) return mapped;
  }
  return jaUrl;
}

/**
 * Register a listener called whenever locale changes.
 * @param {function} fn
 * @returns {function} unsubscribe function
 */
export function onLocaleChange(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

// ─── Internal Helpers ────────────────────────────────────────

function resolveKey(dict, key) {
  const parts = key.split('.');
  let obj = dict;
  for (const part of parts) {
    if (obj == null || typeof obj !== 'object') return undefined;
    obj = obj[part];
  }
  return typeof obj === 'string' ? obj : undefined;
}

function applyLocaleToDocument() {
  // Set documentElement.lang to the current locale when it is a supported
  // 2-letter code, otherwise the default locale. For the ja/en set this keeps
  // 'ja' -> 'ja' and 'en' -> 'en' unchanged.
  const isTwoLetter = /^[a-z]{2}$/.test(currentLocale);
  document.documentElement.lang =
    isTwoLetter && supportedLocales.includes(currentLocale) ? currentLocale : DEFAULT_LOCALE;
}

/**
 * Translate all static elements with data-i18n attributes.
 */
export function translateStaticElements() {
  const elements = document.querySelectorAll('[data-i18n]');
  for (const el of elements) {
    const key = el.getAttribute('data-i18n');
    if (!key) continue;
    const translated = t(key);
    if (translated !== key) {
      el.textContent = translated;
    }
  }

  // Handle templates that must keep an existing child element (typically an
  // external link) instead of having it wiped by the textContent assignment
  // above. The locale string carries a `{{link}}` placeholder and the element
  // holds the node to preserve, marked with `data-i18n-slot`.
  // This keeps the href/rel attributes in the HTML (single source of truth)
  // and avoids injecting markup from the locale files via innerHTML.
  const tmplEls = document.querySelectorAll('[data-i18n-tmpl]');
  for (const el of tmplEls) {
    const key = el.getAttribute('data-i18n-tmpl');
    if (!key) continue;
    const translated = t(key);
    if (translated === key) continue;
    const slot = el.querySelector('[data-i18n-slot]');
    if (!slot) continue;
    const marker = '{{link}}';
    const at = translated.indexOf(marker);
    // No placeholder in the translation: keep the link rather than dropping it.
    const before = at === -1 ? `${translated} ` : translated.slice(0, at);
    const after = at === -1 ? '' : translated.slice(at + marker.length);
    el.replaceChildren(
      document.createTextNode(before),
      slot,
      document.createTextNode(after),
    );
  }

  // Handle placeholder translations
  const placeholderEls = document.querySelectorAll('[data-i18n-placeholder]');
  for (const el of placeholderEls) {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!key) continue;
    const translated = t(key);
    if (translated !== key) {
      el.placeholder = translated;
    }
  }

  // Handle title attribute translations
  const titleEls = document.querySelectorAll('[data-i18n-title]');
  for (const el of titleEls) {
    const key = el.getAttribute('data-i18n-title');
    if (!key) continue;
    const translated = t(key);
    if (translated !== key) {
      el.title = translated;
    }
  }

  // Handle aria-label translations
  const ariaEls = document.querySelectorAll('[data-i18n-aria]');
  for (const el of ariaEls) {
    const key = el.getAttribute('data-i18n-aria');
    if (!key) continue;
    const translated = t(key);
    if (translated !== key) {
      el.setAttribute('aria-label', translated);
    }
  }
}

function notifyListeners() {
  for (const fn of listeners) {
    try { fn(currentLocale); } catch (e) { console.error('[i18n] listener error:', e); }
  }
}
