import { test, expect } from '@playwright/test';

/**
 * Regression coverage for the N-locale i18n core (issue #197).
 *
 * These tests assert that generalizing js/i18n.js from a hardcoded ja/en pair
 * to a locale-agnostic engine did NOT change any observable ja/en behavior:
 *   - the site defaults to English strings,
 *   - switching to Japanese via #langSwitch renders Japanese strings,
 *   - the chosen locale persists across a reload.
 *
 * They mirror tests/routing-lang.spec.mjs and run in CI against a real browser.
 * The locale-derivation logic itself (SUPPORTED_LOCALES from the locale data,
 * English fallback, ja↔en URL localization) is additionally covered by the
 * node smoke test recorded in the PR for issue #197, since js/i18n.js touches
 * document/localStorage/navigator only inside its functions.
 */
test.describe('i18n core (N-locale generalization, ja/en regression)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const state = {
        schemaVersion: 2,
        profile: { name: 'testuser' },
        xp: { total: 0, history: [], weekRing: [] },
        quizHistory: [],
      };
      localStorage.setItem('asn_study_state_v1', JSON.stringify(state));
    });
  });

  test('default locale renders English subtitle', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
    const subtitle = await page.textContent('#siteSubtitle');
    expect(subtitle).toContain('Study Resource Navigator');
  });

  test('switch to Japanese renders Japanese and persists on reload', async ({ page }) => {
    await page.goto('/#beginner');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1000);

    // Switch to Japanese via the language switcher.
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);
    await page.click('#langSwitch button[data-lang="ja"]');
    await page.waitForTimeout(500);
    await page.click('[data-close-modal="settingsModal"]');
    await page.waitForTimeout(300);

    let title = await page.textContent('#siteTitle');
    expect(title).toContain('初めて');

    // documentElement.lang should reflect the current locale.
    let htmlLang = await page.evaluate(() => document.documentElement.lang);
    expect(htmlLang).toBe('ja');

    // Reload: the Japanese locale must persist.
    await page.reload();
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1500);

    title = await page.textContent('#siteTitle');
    expect(title).toContain('初めて');
    htmlLang = await page.evaluate(() => document.documentElement.lang);
    expect(htmlLang).toBe('ja');
  });

  test('switch back to English updates documentElement.lang to en', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('asn_locale', 'ja');
    });
    await page.goto('/');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1000);

    await page.click('#settingsBtn');
    await page.waitForTimeout(300);
    await page.click('#langSwitch button[data-lang="en"]');
    await page.waitForTimeout(500);
    await page.click('[data-close-modal="settingsModal"]');
    await page.waitForTimeout(300);

    const subtitle = await page.textContent('#siteSubtitle');
    expect(subtitle).toContain('Study Resource Navigator');
    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    expect(htmlLang).toBe('en');
  });
});
