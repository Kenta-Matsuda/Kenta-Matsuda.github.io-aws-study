import { test, expect } from '@playwright/test';

// Regression coverage for issue #161: the "Google AI Studio" link in the API
// settings dialog disappeared because translateStaticElements() replaced the
// whole textContent of the help paragraph, wiping the nested <a> element.
// The fix introduces data-i18n-tmpl / data-i18n-slot so the link node survives
// translation in both locales.

test.describe('API settings help links survive i18n (#161)', () => {
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

  async function openSettings(page) {
    await page.goto('/');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1000);
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);
  }

  async function switchLocale(page, lang) {
    await page.click(`#langSwitch button[data-lang="${lang}"]`);
    await page.waitForTimeout(500);
  }

  test('Google AI Studio link is present and clickable (ja)', async ({ page }) => {
    await openSettings(page);
    await switchLocale(page, 'ja');

    const link = page.locator('#geminiKeySection a[href="https://aistudio.google.com/app/apikey"]');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveText('Google AI Studio');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');

    // The surrounding help text must still be translated.
    const help = await page.textContent('[data-i18n-tmpl="settings.geminiKeyHelp"]');
    expect(help).toContain('無料で取得');
    expect(help).not.toContain('{{link}}');
  });

  test('Google AI Studio link survives switching to English', async ({ page }) => {
    await openSettings(page);
    await switchLocale(page, 'ja');
    await switchLocale(page, 'en');

    const link = page.locator('#geminiKeySection a[href="https://aistudio.google.com/app/apikey"]');
    await expect(link).toHaveCount(1);
    await expect(link).toHaveText('Google AI Studio');

    const help = await page.textContent('[data-i18n-tmpl="settings.geminiKeyHelp"]');
    expect(help).toContain('get one free from');
    expect(help).not.toContain('{{link}}');
  });

  test('OpenAI Platform link is preserved in both locales', async ({ page }) => {
    await openSettings(page);

    for (const lang of ['ja', 'en']) {
      await switchLocale(page, lang);
      const link = page.locator('#openaiKeySection a[href="https://platform.openai.com/api-keys"]');
      await expect(link).toHaveCount(1);
      await expect(link).toHaveText('OpenAI Platform');
      const help = await page.textContent('[data-i18n-tmpl="settings.openaiKeyHelp"]');
      expect(help).not.toContain('{{link}}');
    }
  });
});
