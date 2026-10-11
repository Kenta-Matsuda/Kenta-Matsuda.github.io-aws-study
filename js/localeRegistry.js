/**
 * Single source of truth for the locales the site ships (issue #197).
 *
 * The i18n core (js/i18n.js) derives its supported set from the dictionaries
 * passed to initI18n. This registry decides WHICH dictionaries are loaded
 * (js/app.js), and drives the header language toggle and the settings modal
 * language switcher (js/ui.js), so adding a language is:
 *   1. add js/locales/<code>.json (a full key mirror of en.json, human-verified),
 *   2. add an entry here,
 *   3. add './js/locales/<code>.json' to the precache list in sw.js.
 *
 * Do not register a locale whose UI strings and exam content are not both
 * translated and reviewed (see docs/action-required/issue-197-multilanguage-support.md).
 *
 * Pure module: no DOM / network / storage access.
 */

/** @type {ReadonlyArray<{ code: string, label: string }>} */
export const LOCALE_REGISTRY = Object.freeze([
  Object.freeze({ code: 'ja', label: '日本語' }),
  Object.freeze({ code: 'en', label: 'English' }),
]);

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
  const entry = LOCALE_REGISTRY.find((l) => l.code === code);
  return entry ? entry.label : String(code || '').toUpperCase();
}

/**
 * The locale the header toggle switches to: the next one in `codes`, wrapping
 * around. With the current ja/en pair this is the historical ja <-> en flip.
 * An unknown `current` resolves to the first code.
 * @param {string} current
 * @param {string[]} [codes]
 * @returns {string}
 */
export function nextLocale(current, codes = getRegisteredLocaleCodes()) {
  if (!codes.length) return current;
  const i = codes.indexOf(current);
  return codes[(i + 1) % codes.length];
}
