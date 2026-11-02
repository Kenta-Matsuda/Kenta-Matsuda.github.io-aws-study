/**
 * Internationalization (i18n) module for AWS Study Navigator.
 *
 * N-locale-capable core. The engine itself is locale-agnostic: the set of
 * supported locales is derived at runtime from the locale dictionaries passed
 * to `initI18n` (js/app.js loads every locale in js/localeRegistry.js).
 *
 * - `t()` falls back to English for keys missing in the current locale.
 * - Browser detection maps regional / script variants onto the supported set
 *   (matchBrowserLocale in js/localeRegistry.js).
 * - `getLocalizedUrl` keeps Japanese URLs for `ja`, uses the English URL for
 *   every other locale and points AWS docs URLs at the locale's docs path.
 * - Data-file (js/data/*.js) fields are localized by js/localeContent.js.
 *
 * See issue #197 and docs/action-required/issue-197-multilanguage-support.md.
 */

import { matchBrowserLocale, resolveLocalizedUrl, getIntlLocale } from './localeRegistry.js';

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
let locales = {}; // { <lang>: {...}, ... }
let urlMap = {}; // Japanese (base) URL → English URL mapping (js/locales/urls.json)
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
    // Detect the browser language from navigator.languages (then
    // navigator.language), mapping regional / script variants onto the
    // supported set (zh-Hant / zh-HK -> zh-TW, pt -> pt-BR, fr-CA -> fr ...),
    // otherwise the default locale.
    const nav = typeof navigator !== 'undefined' ? navigator : {};
    const tags = [...(Array.isArray(nav.languages) ? nav.languages : []), nav.language].filter(Boolean);
    currentLocale = matchBrowserLocale(tags, supportedLocales) || DEFAULT_LOCALE;
  }
  applyLocaleToDocument();
}

/**
 * Get the current locale.
 * @returns {string} e.g. 'ja', 'en', 'ko', 'zh-TW'
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

/**
 * Get a locale-aware URL for a data item with a base (Japanese) URL and an
 * optional explicit English URL.
 *
 * - `ja`: the base URL unchanged.
 * - any other locale: the explicit English URL, else the `urls.json` mapping
 *   (ja -> en), else the base URL; an AWS docs URL (docs.aws.amazon.com) is
 *   then pointed at the current locale's documentation path (/ko_kr/ ...).
 *   Other hosts are never rewritten.
 *
 * @param {string} jaUrl - base (Japanese) URL (default)
 * @param {string} [enUrl] - English URL (optional, explicit override)
 * @returns {string}
 */
export function getLocalizedUrl(jaUrl, enUrl) {
  return resolveLocalizedUrl(currentLocale, jaUrl, enUrl, urlMap);
}

/**
 * Format a date with Intl for the current locale.
 * @param {Date|number|string} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string} '' for an invalid date
 */
export function formatDate(date, options) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(getIntlLocale(currentLocale), options);
}

/**
 * Format a number with Intl for the current locale.
 * @param {number} value
 * @param {Intl.NumberFormatOptions} [options]
 * @returns {string}
 */
export function formatNumber(value, options) {
  return new Intl.NumberFormat(getIntlLocale(currentLocale), options).format(value);
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
  // documentElement.lang is the current locale's BCP 47 code (e.g. 'ja',
  // 'zh-TW', 'pt-BR'), or the default locale if it is somehow unsupported.
  document.documentElement.lang = supportedLocales.includes(currentLocale) ? currentLocale : DEFAULT_LOCALE;
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
