/**
 * Internationalization (i18n) module for AWS Study Navigator.
 * Supports Japanese (ja) and English (en).
 */

const LOCALE_STORAGE_KEY = 'asn_locale';
const SUPPORTED_LOCALES = ['ja', 'en'];
const DEFAULT_LOCALE = 'en';

let currentLocale = DEFAULT_LOCALE;
let locales = {}; // { ja: {...}, en: {...} }
let urlMap = {}; // Japanese URL → English URL mapping
let listeners = [];

/**
 * Initialize i18n with locale data.
 * @param {{ ja: object, en: object }} localeData
 * @param {object} [urlMapping] - Japanese URL to English URL mapping
 */
export function initI18n(localeData, urlMapping) {
  locales = localeData || {};
  urlMap = urlMapping || {};
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved && SUPPORTED_LOCALES.includes(saved)) {
    currentLocale = saved;
  } else {
    // Detect browser language
    const browserLang = (navigator.language || '').slice(0, 2);
    currentLocale = browserLang === 'ja' ? 'ja' : DEFAULT_LOCALE;
  }
  applyLocaleToDocument();
}

/**
 * Get the current locale.
 * @returns {'ja' | 'en'}
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Set the locale and persist to localStorage.
 * @param {'ja' | 'en'} locale
 */
export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
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
  const dict = locales[currentLocale] || locales['en'] || {};
  let value = resolveKey(dict, key);
  if (value === undefined) {
    // Fallback to English
    const fallback = locales['en'] || {};
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

/**
 * Get a locale-aware URL. If the current locale is 'en' and an English URL exists, use it.
 * Checks: 1) explicit enUrl parameter, 2) URL mapping table.
 * @param {string} jaUrl - Japanese URL (default)
 * @param {string} [enUrl] - English URL (optional, explicit override)
 * @returns {string}
 */
export function getLocalizedUrl(jaUrl, enUrl) {
  if (currentLocale === 'en') {
    if (enUrl) return enUrl;
    // Check URL mapping
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
  document.documentElement.lang = currentLocale === 'ja' ? 'ja' : 'en';
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
