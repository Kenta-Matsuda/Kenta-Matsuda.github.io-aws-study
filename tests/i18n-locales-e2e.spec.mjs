import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Browser smoke test for the LLM-translated locales (issue #197 phase 1):
 * switching to Korean renders the Korean dictionary, the machine-translation
 * notice and the content overlay (soa-c03 / common), with no Japanese leaking
 * into the main screens; browser-language detection maps regional variants.
 */

const ko = JSON.parse(readFileSync('js/locales/ko.json', 'utf8'));
const zhTW = JSON.parse(readFileSync('js/locales/zh-TW.json', 'utf8'));
const koSoa = JSON.parse(readFileSync('js/data/i18n/ko/soa-c03.json', 'utf8')).strings;
const koCommon = JSON.parse(readFileSync('js/data/i18n/ko/common.json', 'utf8')).strings;

const KANA = /[぀-ゟ゠-ヿ]/;

function seedState(page, locale) {
  return page.addInitScript((loc) => {
    localStorage.setItem('asn_study_state_v1', JSON.stringify({
      schemaVersion: 2,
      profile: { name: 'testuser' },
      xp: { total: 0, history: [], weekRing: [] },
      quizHistory: [],
    }));
    if (loc) localStorage.setItem('asn_locale', loc);
  }, locale);
}

/** Visible text of the main screens, without the Japanese-book promo slide. */
async function mainScreenText(page) {
  return page.evaluate(() => {
    const parts = [];
    for (const sel of ['header', '#mtNotice', '#contentArea', '#xpDashboard', '#learningStatusPanel', '#domainTabs', '#examSidebarContent']) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const clone = el.cloneNode(true);
      clone.querySelectorAll('.book-promo-card, script, style, [hidden]').forEach((n) => n.remove());
      parts.push(clone.innerText || clone.textContent || '');
    }
    return parts.join('\n');
  });
}

test.describe('LLM-translated locales (#197)', () => {
  test('Korean: dictionary, notice, content overlay, no Japanese on the main screens', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await seedState(page, 'ko');
    await page.goto('/#soa');
    await page.waitForSelector('#siteTitle');
    await page.waitForFunction(() => window.__APP_READY__ === true);

    expect(await page.evaluate(() => document.documentElement.lang)).toBe('ko');
    await expect(page.locator('[data-i18n="dashboard.title"]')).toHaveText(ko.dashboard.title);
    await expect(page.locator('#mtNotice')).toBeVisible();
    await expect(page.locator('#mtNotice')).toContainText(ko.i18nNotice.machineTranslated);

    // Content overlay: the soa-c03 roadmap shows the Korean step title (exam-specific step).
    const stepTitle = koSoa['Practice with sample questions'];
    expect(stepTitle && stepTitle !== 'Practice with sample questions').toBeTruthy();
    await expect(page.locator('#contentArea')).toContainText(stepTitle);

    const text = await mainScreenText(page);
    expect(text.match(KANA), 'no kana on the main screens').toBeNull();
    expect(errors).toHaveLength(0);
  });

  test('Korean beginner guide uses the common overlay', async ({ page }) => {
    await seedState(page, 'ko');
    await page.goto('/#beginner');
    await page.waitForFunction(() => window.__APP_READY__ === true);
    await expect(page.locator('#siteTitle')).toHaveText(ko.beginner.title);
    const common = koCommon['Register for the exam'];
    await expect(page.locator('#contentArea')).toContainText(common);
    const text = await mainScreenText(page);
    expect(text.match(KANA)).toBeNull();
  });

  test('switching languages from the settings menu updates lang, text and the notice', async ({ page }) => {
    await seedState(page, 'en');
    await page.goto('/#soa');
    await page.waitForFunction(() => window.__APP_READY__ === true);
    await expect(page.locator('#mtNotice')).toBeHidden();

    await page.click('#settingsBtn');
    await page.selectOption('#langSelect', 'zh-TW');
    await expect(page.locator('#langMachineNote')).toBeVisible();
    await page.click('[data-close-modal="settingsModal"]');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('zh-TW');
    await expect(page.locator('[data-i18n="dashboard.title"]')).toHaveText(zhTW.dashboard.title);
    await expect(page.locator('#mtNotice')).toBeVisible();

    // Dismissal is remembered per locale.
    await page.click('#mtNoticeCloseBtn');
    await expect(page.locator('#mtNotice')).toBeHidden();
    await page.reload();
    await page.waitForFunction(() => window.__APP_READY__ === true);
    await expect(page.locator('#mtNotice')).toBeHidden();

    await page.click('#settingsBtn');
    await page.selectOption('#langSelect', 'ja');
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('ja');
    await expect(page.locator('#langMachineNote')).toBeHidden();
  });

  test('the notice opens the feedback form pre-filled for a translation report', async ({ page }) => {
    await seedState(page, 'ko');
    await page.goto('/#soa');
    await page.waitForFunction(() => window.__APP_READY__ === true);
    await page.click('#mtNoticeFeedbackBtn');
    await expect(page.locator('#feedbackModal')).toBeVisible();
    await expect(page.locator('#feedbackTextarea')).toHaveValue(new RegExp(`\\(ko\\)`));
  });
});

test.describe('?lang= query parameter (#197)', () => {
  test('?lang=fr selects French and is remembered; ?lang=zh-HK maps to zh-TW', async ({ page }) => {
    await seedState(page, null);
    await page.goto('/?lang=fr#soa');
    await page.waitForFunction(() => window.__APP_READY__ === true);
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('fr');
    expect(await page.evaluate(() => localStorage.getItem('asn_locale'))).toBe('fr');
    await page.goto('/?lang=zh-HK#soa');
    await page.waitForFunction(() => window.__APP_READY__ === true);
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('zh-TW');
    await page.goto('/?lang=xx#soa');
    await page.waitForFunction(() => window.__APP_READY__ === true);
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('zh-TW');
  });
});

test.describe('browser language detection (#197)', () => {
  test.use({ locale: 'zh-HK' });
  test('zh-HK browser opens in Traditional Chinese', async ({ page }) => {
    await seedState(page, null);
    await page.goto('/#soa');
    await page.waitForFunction(() => window.__APP_READY__ === true);
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('zh-TW');
    await expect(page.locator('[data-i18n="dashboard.title"]')).toHaveText(zhTW.dashboard.title);
  });
});

test.describe('browser language detection – Portuguese (#197)', () => {
  test.use({ locale: 'pt-PT' });
  test('any Portuguese browser opens in pt-BR', async ({ page }) => {
    await seedState(page, null);
    await page.goto('/#soa');
    await page.waitForFunction(() => window.__APP_READY__ === true);
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('pt-BR');
  });
});
