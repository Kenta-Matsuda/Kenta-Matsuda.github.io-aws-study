import { test, expect } from '@playwright/test';
import {
  LOCALE_REGISTRY,
  getRegisteredLocaleCodes,
  getLocaleLabel,
  nextLocale,
} from '../js/localeRegistry.js';
import { readFileSync } from 'node:fs';

/**
 * Locale registry (issue #197): js/localeRegistry.js is the single list of
 * shipped locales that drives the dictionary loader (js/app.js), the header
 * toggle and the settings-modal switcher (js/ui.js).
 */
test.describe('locale registry – pure logic (#197)', () => {
  test('ships ja and en, each with a dictionary that mirrors en.json keys', () => {
    expect(getRegisteredLocaleCodes()).toEqual(['ja', 'en']);
    const flatKeys = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) =>
      v && typeof v === 'object' ? flatKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`]);
    const enKeys = flatKeys(JSON.parse(readFileSync('js/locales/en.json', 'utf8'))).sort();
    for (const { code } of LOCALE_REGISTRY) {
      const keys = flatKeys(JSON.parse(readFileSync(`js/locales/${code}.json`, 'utf8'))).sort();
      expect(keys, `${code}.json key mirror`).toEqual(enKeys);
    }
  });

  test('every registered dictionary is precached by the service worker', () => {
    const sw = readFileSync('sw.js', 'utf8');
    expect(sw).toContain("'./js/localeRegistry.js'");
    for (const code of getRegisteredLocaleCodes()) {
      expect(sw).toContain(`'./js/locales/${code}.json'`);
    }
  });

  test('labels are native names with an upper-case fallback', () => {
    expect(getLocaleLabel('ja')).toBe('日本語');
    expect(getLocaleLabel('en')).toBe('English');
    expect(getLocaleLabel('fr')).toBe('FR');
  });

  test('nextLocale cycles through the list (ja <-> en for two locales)', () => {
    expect(nextLocale('ja')).toBe('en');
    expect(nextLocale('en')).toBe('ja');
    expect(nextLocale('ja', ['ja', 'en', 'fr'])).toBe('en');
    expect(nextLocale('fr', ['ja', 'en', 'fr'])).toBe('ja');
    expect(nextLocale('xx', ['ja', 'en', 'fr'])).toBe('ja');
    expect(nextLocale('ja', [])).toBe('ja');
  });
});

test.describe('locale registry – UI wiring (#197)', () => {
  test('settings language switcher renders one button per registered locale', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('asn_study_state_v1', JSON.stringify({
        schemaVersion: 2,
        profile: { name: 'testuser' },
        xp: { total: 0, history: [], weekRing: [] },
        quizHistory: [],
      }));
    });
    await page.goto('/#beginner');
    await page.waitForSelector('#siteTitle');
    await page.click('#settingsBtn');
    const langs = await page.$$eval('#langSwitch button[data-lang]', (bs) =>
      bs.map((b) => [b.dataset.lang, b.textContent.trim()]));
    expect(langs).toEqual(LOCALE_REGISTRY.map((l) => [l.code, l.label]));
    expect(errors).toHaveLength(0);
  });
});
