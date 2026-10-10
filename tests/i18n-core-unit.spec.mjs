import { test, expect } from '@playwright/test';

/**
 * Pure-logic spec (no browser / no `page` fixture) for the N-locale i18n core
 * (issue #197). Where tests/i18n-core.spec.mjs re-verifies the behavior-
 * equivalent 2-locale path in a real browser, this spec exercises the logic
 * that the generalization actually introduced and that the ja/en path does not
 * reach:
 *   - supported-locale set derived from Object.keys of the initI18n data,
 *   - an unsupported saved locale and an unsupported navigator.language both
 *     resolving to the default locale ('en'),
 *   - t() falling back to English when a key is missing in the current locale,
 *   - getLocalizedUrl returning the base (ja) URL for the base locale and the
 *     explicit / mapped alternate for a non-base locale,
 *   - setLocale rejecting a locale outside the derived supported set.
 *
 * js/i18n.js reads global document/localStorage/navigator only inside its
 * functions, so we install minimal stubs on globalThis BEFORE dynamic-importing
 * the module and reset them per test. This mirrors the pure-logic, page-less
 * style of tests/quiz-parse.spec.mjs and tests/markdown-normalize.spec.mjs.
 */

// A mutable in-memory localStorage stub.
function makeStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
  };
}

// Install global stubs and (re-)import a fresh copy of js/i18n.js. A cache
// buster on the import specifier gives each test an isolated module instance so
// the module-level `currentLocale` / `supportedLocales` state does not leak.
// `navigator` is a read-only getter on some Node versions, so install stubs
// with defineProperty (configurable) rather than plain assignment.
function stubGlobal(name, value) {
  Object.defineProperty(globalThis, name, {
    value,
    configurable: true,
    writable: true,
  });
}

async function loadI18n({ saved, navigatorLanguage } = {}) {
  const docLang = { lang: '' };
  stubGlobal('document', { documentElement: docLang, querySelectorAll: () => [] });
  stubGlobal('localStorage', makeStorage(saved ? { asn_locale: saved } : {}));
  stubGlobal('navigator', { language: navigatorLanguage || '' });
  const mod = await import(`../js/i18n.js?u=${Math.random()}`);
  return { mod, docLang };
}

test.describe('i18n core – N-locale derivation (pure logic, #197)', () => {
  test('supported set is derived from Object.keys; a 3rd locale is switchable', async () => {
    const { mod } = await loadI18n({ navigatorLanguage: 'en-US' });
    mod.initI18n({ ja: {}, en: {}, fr: {} }, {});
    // Unsupported/default browser language resolves to the default locale.
    expect(mod.getLocale()).toBe('en');
    // The derived set includes fr, so switching to it succeeds.
    mod.setLocale('fr');
    expect(mod.getLocale()).toBe('fr');
  });

  test('t() falls back to English when the key is missing in the current locale', async () => {
    const { mod } = await loadI18n({ navigatorLanguage: 'en-US' });
    mod.initI18n(
      {
        ja: { greeting: 'こんにちは' },
        en: { greeting: 'Hello', onlyEn: 'English only' },
        fr: { greeting: 'Bonjour' },
      },
      {},
    );
    mod.setLocale('fr');
    // Present in fr → fr value.
    expect(mod.t('greeting')).toBe('Bonjour');
    // Missing in fr → English fallback.
    expect(mod.t('onlyEn')).toBe('English only');
    // Missing everywhere → the key itself.
    expect(mod.t('nope.nested')).toBe('nope.nested');
  });

  test('an unsupported saved locale is ignored and falls through to detection', async () => {
    // Saved 'de' is not supported, so it is ignored; detection then honors a
    // supported navigator.language ('ja').
    const { mod } = await loadI18n({ saved: 'de', navigatorLanguage: 'ja-JP' });
    mod.initI18n({ ja: {}, en: {}, fr: {} }, {});
    expect(mod.getLocale()).toBe('ja');
  });

  test('an unsupported saved locale with an unsupported browser lang resolves to default', async () => {
    // Neither the saved value nor the browser language is supported, so the
    // locale resolves to the default ('en').
    const { mod } = await loadI18n({ saved: 'de', navigatorLanguage: 'es-ES' });
    mod.initI18n({ ja: {}, en: {}, fr: {} }, {});
    expect(mod.getLocale()).toBe('en');
  });

  test('an unsupported navigator.language resolves to the default locale', async () => {
    const { mod } = await loadI18n({ navigatorLanguage: 'de-DE' });
    mod.initI18n({ ja: {}, en: {}, fr: {} }, {});
    expect(mod.getLocale()).toBe('en');
  });

  test('a supported navigator.language is honored', async () => {
    const { mod } = await loadI18n({ navigatorLanguage: 'fr-FR' });
    mod.initI18n({ ja: {}, en: {}, fr: {} }, {});
    expect(mod.getLocale()).toBe('fr');
  });

  test('getLocalizedUrl returns the base (ja) URL for the base locale', async () => {
    const { mod } = await loadI18n({ navigatorLanguage: 'ja-JP' });
    mod.initI18n({ ja: {}, en: {}, fr: {} }, { '/ja/page': '/en/page' });
    expect(mod.getLocale()).toBe('ja');
    // Base locale ignores both the explicit alternate and the map.
    expect(mod.getLocalizedUrl('/ja/page', '/en/page')).toBe('/ja/page');
  });

  test('getLocalizedUrl prefers explicit then mapped alternate for a non-base locale', async () => {
    const { mod } = await loadI18n({ navigatorLanguage: 'en-US' });
    mod.initI18n({ ja: {}, en: {}, fr: {} }, { '/ja/page': '/en/page' });
    mod.setLocale('en');
    // Explicit alternate wins.
    expect(mod.getLocalizedUrl('/ja/page', '/en/explicit')).toBe('/en/explicit');
    // No explicit alternate → urlMap lookup.
    expect(mod.getLocalizedUrl('/ja/page')).toBe('/en/page');
    // No explicit alternate and no mapping → base URL fallback.
    expect(mod.getLocalizedUrl('/ja/unmapped')).toBe('/ja/unmapped');
  });

  test('setLocale rejects a locale outside the derived supported set', async () => {
    const { mod } = await loadI18n({ navigatorLanguage: 'ja-JP' });
    mod.initI18n({ ja: {}, en: {}, fr: {} }, {});
    expect(mod.getLocale()).toBe('ja');
    mod.setLocale('de'); // not in {ja,en,fr}
    expect(mod.getLocale()).toBe('ja'); // unchanged
  });

  test('documentElement.lang reflects a supported non-ja/en locale', async () => {
    const { mod, docLang } = await loadI18n({ navigatorLanguage: 'fr-FR' });
    mod.initI18n({ ja: {}, en: {}, fr: {} }, {});
    expect(docLang.lang).toBe('fr');
  });
});
