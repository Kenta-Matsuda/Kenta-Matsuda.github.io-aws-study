import { test, expect } from '@playwright/test';

test.describe('Routing and Language switching', () => {

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

  test('default page loads without JS errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1500);
    expect(errors).toHaveLength(0);
  });

  test('hash #clf loads CLF exam', async ({ page }) => {
    await page.goto('/#clf');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1000);
    const title = await page.textContent('#siteTitle');
    expect(title).toContain('Cloud Practitioner');
  });

  test('hash #saa loads SAA exam', async ({ page }) => {
    await page.goto('/#saa');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1000);
    const title = await page.textContent('#siteTitle');
    expect(title).toContain('Solutions Architect');
  });

  test('hash #beginner loads beginner guide', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/#beginner');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1500);
    expect(errors).toHaveLength(0);
    const ready = await page.evaluate(() => window.__APP_READY__);
    expect(ready).toBe(true);
    const title = await page.textContent('#siteTitle');
    expect(title.includes('初めて') || title.includes('First-time')).toBe(true);
  });

  test('#beginner -> switch to English -> reload -> navigate to exam', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto('/#beginner');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1000);

    // Switch to English
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);
    await page.click('#langSwitch button[data-lang="en"]');
    await page.waitForTimeout(500);
    await page.click('[data-close-modal="settingsModal"]');
    await page.waitForTimeout(300);

    let title = await page.textContent('#siteTitle');
    expect(title).toContain('First-time');

    // Reload
    await page.reload();
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1500);
    expect(errors).toHaveLength(0);

    title = await page.textContent('#siteTitle');
    expect(title).toContain('First-time');

    // Navigate to CLF via sidebar
    await page.click('#sidebarToggleBtn');
    await page.waitForTimeout(300);
    await page.click('[data-exam-id="clf-c02"]');
    await page.waitForTimeout(1000);

    title = await page.textContent('#siteTitle');
    expect(title).toContain('Cloud Practitioner');
  });

  test('#beginner -> switch to Japanese from English', async ({ page }) => {
    // Start in English
    await page.addInitScript(() => {
      localStorage.setItem('asn_locale', 'en');
    });
    await page.goto('/#beginner');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1000);

    let title = await page.textContent('#siteTitle');
    expect(title).toContain('First-time');

    // Switch to Japanese
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);
    await page.click('#langSwitch button[data-lang="ja"]');
    await page.waitForTimeout(500);
    await page.click('[data-close-modal="settingsModal"]');
    await page.waitForTimeout(300);

    title = await page.textContent('#siteTitle');
    expect(title).toContain('初めて');
  });

  test('sidebar navigation: CLF -> SAA -> beginner -> DVA', async ({ page }) => {
    await page.goto('/#clf');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1000);

    // CLF -> SAA
    await page.click('#sidebarToggleBtn');
    await page.waitForTimeout(300);
    await page.click('[data-exam-id="saa-c03"]');
    await page.waitForTimeout(1000);
    let title = await page.textContent('#siteTitle');
    expect(title).toContain('Solutions Architect');
    expect(page.url()).toContain('#saa');

    // SAA -> beginner
    await page.click('#sidebarToggleBtn');
    await page.waitForTimeout(300);
    await page.click('[data-exam-id="__beginner__"]');
    await page.waitForTimeout(1000);
    title = await page.textContent('#siteTitle');
    expect(title.includes('初めて') || title.includes('First-time')).toBe(true);
    expect(page.url()).toContain('#beginner');

    // beginner -> DVA
    await page.click('#sidebarToggleBtn');
    await page.waitForTimeout(300);
    await page.click('[data-exam-id="dva-c02"]');
    await page.waitForTimeout(1000);
    title = await page.textContent('#siteTitle');
    expect(title).toContain('Developer');
    expect(page.url()).toContain('#dva');
  });

  test('beginner -> exam restores chart visibility', async ({ page }) => {
    await page.goto('/#clf');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1000);

    let chartVisible = await page.isVisible('#examWeightChart');
    expect(chartVisible).toBe(true);

    // Go to beginner
    await page.click('#sidebarToggleBtn');
    await page.waitForTimeout(300);
    await page.click('[data-exam-id="__beginner__"]');
    await page.waitForTimeout(1000);

    // Chart aside should be hidden
    const asideHidden = await page.evaluate(() => {
      const canvas = document.getElementById('examWeightChart');
      const aside = canvas?.closest('aside');
      return aside?.classList.contains('hidden');
    });
    expect(asideHidden).toBe(true);

    // Go back to CLF
    await page.click('#sidebarToggleBtn');
    await page.waitForTimeout(300);
    await page.click('[data-exam-id="clf-c02"]');
    await page.waitForTimeout(1000);

    chartVisible = await page.isVisible('#examWeightChart');
    expect(chartVisible).toBe(true);
  });

  test('language switch persists on reload', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1000);

    await page.click('#settingsBtn');
    await page.waitForTimeout(300);
    await page.click('#langSwitch button[data-lang="en"]');
    await page.waitForTimeout(500);
    await page.click('[data-close-modal="settingsModal"]');
    await page.waitForTimeout(300);

    await page.reload();
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1000);

    const subtitle = await page.textContent('#siteSubtitle');
    expect(subtitle).toContain('Study Resource Navigator');
  });

  test('reload with various hashes does not crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    const hashes = ['#clf', '#saa', '#sap', '#beginner', '#dva', '#invalid-hash', ''];
    for (const hash of hashes) {
      await page.goto('/' + hash);
      await page.waitForSelector('#siteTitle');
      await page.waitForTimeout(500);
    }
    expect(errors).toHaveLength(0);
  });

  test('invalid hash falls back to default exam', async ({ page }) => {
    await page.goto('/#invalid-xyz');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1000);
    const title = await page.textContent('#siteTitle');
    // Should load default exam (CLF)
    expect(title).toContain('Cloud Practitioner');
  });

  test('theme switch works from settings', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1000);

    await page.click('#settingsBtn');
    await page.waitForTimeout(300);

    // Switch to dark
    await page.click('#themeSwitch button[data-theme="dark"]');
    await page.waitForTimeout(300);

    const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(hasDark).toBe(true);

    // Switch to light
    await page.click('#themeSwitch button[data-theme="light"]');
    await page.waitForTimeout(300);

    const hasDark2 = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(hasDark2).toBe(false);
  });
});
