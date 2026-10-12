import { test, expect } from '@playwright/test';
import {
  LOCALE_REGISTRY,
  LOCALE_METADATA,
  getRegisteredLocaleCodes,
  getLocaleLabel,
  getPromptLanguageName,
  getIntlLocale,
  isMachineTranslatedLocale,
  nextLocale,
  matchBrowserLocale,
  localizeAwsDocsUrl,
  resolveLocalizedUrl,
} from '../js/localeRegistry.js';
import { readFileSync } from 'node:fs';

/**
 * Locale registry (issue #197): js/localeRegistry.js is the single list of
 * shipped locales that drives the dictionary loader (js/app.js) and the
 * settings-modal language menu (js/ui.js), plus the per-language metadata
 * (prompt language name, Intl tag, AWS docs path) for every AWS docs language.
 */
const flatKeys = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) =>
  v && typeof v === 'object' && !Array.isArray(v) ? flatKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`]);

const flatEntries = (obj, prefix = '') => Object.entries(obj).flatMap(([k, v]) =>
  v && typeof v === 'object' && !Array.isArray(v) ? flatEntries(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]]);

test.describe('locale registry – pure logic (#197)', () => {
  test('ships all 11 AWS docs languages (ja, en first), each with a dictionary that mirrors en.json keys', () => {
    expect(getRegisteredLocaleCodes()).toEqual(['ja', 'en', 'ko', 'zh-CN', 'zh-TW', 'fr', 'de', 'es', 'it', 'pt-BR', 'id']);
    const enKeys = flatKeys(JSON.parse(readFileSync('js/locales/en.json', 'utf8'))).sort();
    for (const { code } of LOCALE_REGISTRY) {
      const keys = flatKeys(JSON.parse(readFileSync(`js/locales/${code}.json`, 'utf8'))).sort();
      expect(keys, `${code}.json key mirror`).toEqual(enKeys);
    }
  });

  test('every dictionary keeps the {{placeholders}} and array lengths of en.json', () => {
    const en = Object.fromEntries(flatEntries(JSON.parse(readFileSync('js/locales/en.json', 'utf8'))));
    const placeholders = (s) => [...String(s).matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort();
    for (const { code } of LOCALE_REGISTRY) {
      const dict = Object.fromEntries(flatEntries(JSON.parse(readFileSync(`js/locales/${code}.json`, 'utf8'))));
      for (const [key, enValue] of Object.entries(en)) {
        const value = dict[key];
        if (Array.isArray(enValue)) {
          expect(Array.isArray(value), `${code}:${key} is an array`).toBe(true);
          expect(value.length, `${code}:${key} length`).toBe(enValue.length);
          continue;
        }
        expect(typeof value, `${code}:${key} type`).toBe('string');
        expect(value.trim().length, `${code}:${key} non-empty`).toBeGreaterThan(0);
        expect(placeholders(value), `${code}:${key} placeholders`).toEqual(placeholders(enValue));
      }
    }
  });

  test('every registered dictionary is precached by the service worker', () => {
    const sw = readFileSync('sw.js', 'utf8');
    expect(sw).toContain("'./js/localeRegistry.js'");
    expect(sw).toContain("'./js/localeContent.js'");
    for (const code of getRegisteredLocaleCodes()) {
      expect(sw).toContain(`'./js/locales/${code}.json'`);
    }
  });

  test('labels are native names with an upper-case fallback', () => {
    expect(getLocaleLabel('ja')).toBe('日本語');
    expect(getLocaleLabel('en')).toBe('English');
    expect(getLocaleLabel('ko')).toBe('한국어');
    expect(getLocaleLabel('xx')).toBe('XX');
  });

  test('metadata covers the AWS docs languages; only ja/en are human-written', () => {
    expect(Object.keys(LOCALE_METADATA).sort()).toEqual(['de', 'en', 'es', 'fr', 'id', 'it', 'ja', 'ko', 'pt-BR', 'zh-CN', 'zh-TW'].sort());
    expect(isMachineTranslatedLocale('ja')).toBe(false);
    expect(isMachineTranslatedLocale('en')).toBe(false);
    for (const code of ['ko', 'zh-CN', 'zh-TW', 'fr', 'de', 'es', 'it', 'pt-BR', 'id']) {
      expect(isMachineTranslatedLocale(code), code).toBe(true);
    }
    expect(getIntlLocale('ja')).toBe('ja-JP');
    expect(getIntlLocale('pt-BR')).toBe('pt-BR');
    expect(getIntlLocale('id')).toBe('id-ID');
  });

  test('prompt language names are explicit (English name + native name)', () => {
    expect(getPromptLanguageName('en')).toBe('English');
    expect(getPromptLanguageName('ko')).toBe('Korean (한국어)');
    expect(getPromptLanguageName('zh-TW')).toBe('Traditional Chinese (中文(繁體))');
    expect(getPromptLanguageName('pt-BR')).toBe('Brazilian Portuguese (Português)');
    expect(getPromptLanguageName('xx')).toBe('English');
  });

  test('nextLocale cycles through the list', () => {
    expect(nextLocale('ja', ['ja', 'en'])).toBe('en');
    expect(nextLocale('en', ['ja', 'en'])).toBe('ja');
    expect(nextLocale('ja', ['ja', 'en', 'fr'])).toBe('en');
    expect(nextLocale('fr', ['ja', 'en', 'fr'])).toBe('ja');
    expect(nextLocale('xx', ['ja', 'en', 'fr'])).toBe('ja');
    expect(nextLocale('ja', [])).toBe('ja');
  });
});

test.describe('browser language detection (#197)', () => {
  const all = Object.keys(LOCALE_METADATA);

  test('exact and primary-subtag matches', () => {
    expect(matchBrowserLocale(['ja-JP'], all)).toBe('ja');
    expect(matchBrowserLocale(['ko-KR'], all)).toBe('ko');
    expect(matchBrowserLocale(['fr-CA'], all)).toBe('fr');
    expect(matchBrowserLocale(['de'], all)).toBe('de');
    expect(matchBrowserLocale(['es-419'], all)).toBe('es');
    expect(matchBrowserLocale(['it-IT'], all)).toBe('it');
    expect(matchBrowserLocale(['id-ID'], all)).toBe('id');
    expect(matchBrowserLocale(['en-GB'], all)).toBe('en');
  });

  test('Chinese script / region variants', () => {
    expect(matchBrowserLocale(['zh-CN'], all)).toBe('zh-CN');
    expect(matchBrowserLocale(['zh'], all)).toBe('zh-CN');
    expect(matchBrowserLocale(['zh-SG'], all)).toBe('zh-CN');
    expect(matchBrowserLocale(['zh-Hans-CN'], all)).toBe('zh-CN');
    expect(matchBrowserLocale(['zh-TW'], all)).toBe('zh-TW');
    expect(matchBrowserLocale(['zh-HK'], all)).toBe('zh-TW');
    expect(matchBrowserLocale(['zh-MO'], all)).toBe('zh-TW');
    expect(matchBrowserLocale(['zh-Hant'], all)).toBe('zh-TW');
    expect(matchBrowserLocale(['zh_tw'], all)).toBe('zh-TW');
  });

  test('Portuguese, legacy Indonesian tag, order and no match', () => {
    expect(matchBrowserLocale(['pt'], all)).toBe('pt-BR');
    expect(matchBrowserLocale(['pt-PT'], all)).toBe('pt-BR');
    expect(matchBrowserLocale(['in'], all)).toBe('id');
    expect(matchBrowserLocale(['nl-NL', 'de-DE', 'ja'], all)).toBe('de');
    expect(matchBrowserLocale(['nl-NL', 'sv'], all)).toBeNull();
    expect(matchBrowserLocale([], all)).toBeNull();
    // Only supported codes are returned.
    expect(matchBrowserLocale(['ko-KR'], ['ja', 'en'])).toBeNull();
  });
});

test.describe('AWS docs URL localization (#197)', () => {
  const JA = 'https://docs.aws.amazon.com/ja_jp/glue/latest/dg/what-is-glue.html';
  const EN = 'https://docs.aws.amazon.com/glue/latest/dg/what-is-glue.html';

  test('docs.aws.amazon.com paths follow the locale', () => {
    expect(localizeAwsDocsUrl(JA, 'ko')).toBe('https://docs.aws.amazon.com/ko_kr/glue/latest/dg/what-is-glue.html');
    expect(localizeAwsDocsUrl(EN, 'zh-TW')).toBe('https://docs.aws.amazon.com/zh_tw/glue/latest/dg/what-is-glue.html');
    expect(localizeAwsDocsUrl(EN, 'pt-BR')).toBe('https://docs.aws.amazon.com/pt_br/glue/latest/dg/what-is-glue.html');
    expect(localizeAwsDocsUrl(JA, 'en')).toBe(EN);
    expect(localizeAwsDocsUrl(EN, 'en')).toBe(EN);
    expect(localizeAwsDocsUrl(`${EN}#:~:text=Glue`, 'en')).toBe(`${EN}#:~:text=Glue`);
  });

  test('other hosts and unknown locales are never rewritten', () => {
    const blog = 'https://aws.amazon.com/jp/blogs/news/aws-blackbelt-overview/';
    expect(localizeAwsDocsUrl(blog, 'ko')).toBe(blog);
    expect(localizeAwsDocsUrl('https://d1.awsstatic.com/ja_JP/training-and-certification/x.pdf', 'fr')).toBe('https://d1.awsstatic.com/ja_JP/training-and-certification/x.pdf');
    expect(localizeAwsDocsUrl(JA, 'xx')).toBe(JA);
    expect(localizeAwsDocsUrl('not a url', 'ko')).toBe('not a url');
  });

  test('resolveLocalizedUrl: ja keeps the base; others use English then the docs path', () => {
    const map = { 'https://aws.amazon.com/jp/certification/x/': 'https://aws.amazon.com/certification/x/' };
    expect(resolveLocalizedUrl('ja', JA, EN, map)).toBe(JA);
    expect(resolveLocalizedUrl('en', JA, EN, map)).toBe(EN);
    expect(resolveLocalizedUrl('ko', JA, EN, map)).toBe('https://docs.aws.amazon.com/ko_kr/glue/latest/dg/what-is-glue.html');
    expect(resolveLocalizedUrl('ko', JA, undefined, map)).toBe('https://docs.aws.amazon.com/ko_kr/glue/latest/dg/what-is-glue.html');
    expect(resolveLocalizedUrl('fr', 'https://aws.amazon.com/jp/certification/x/', undefined, map)).toBe('https://aws.amazon.com/certification/x/');
    // Non-docs URL without an English alternative: the base URL (never invented).
    expect(resolveLocalizedUrl('de', 'https://aws.amazon.com/jp/blogs/news/a/', undefined, map)).toBe('https://aws.amazon.com/jp/blogs/news/a/');
  });
});

test.describe('locale registry – UI wiring (#197)', () => {
  test('settings language menu lists every registered locale with native labels', async ({ page }) => {
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
    const langs = await page.$$eval('#langSelect option', (os) => os.map((o) => [o.value, o.textContent.trim(), o.lang]));
    expect(langs).toEqual(LOCALE_REGISTRY.map((l) => [l.code, l.label, l.code]));
    expect(errors).toHaveLength(0);
  });
});
