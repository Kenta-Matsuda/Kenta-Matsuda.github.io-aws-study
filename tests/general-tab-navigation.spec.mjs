import { test, expect } from '@playwright/test';

// Coverage for issue #163:
// - the exam-wide tab must be labelled 全般 / General (not "★すべて")
// - the "Deep dive into each domain" step must link to the domain tabs
// - the "Practice with sample questions" step must also offer this site's own
//   AI question generator

test.describe('exam-wide ("全般") tab navigation (#163)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('asn_locale', 'ja');
      localStorage.setItem(
        'asn_study_state_v1',
        JSON.stringify({
          schemaVersion: 2,
          profile: { name: 'testuser' },
          xp: { total: 0, history: [], weekRing: [] },
          quizHistory: [],
        }),
      );
    });
    await page.goto('/#clf');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1200);
  });

  test('the exam-wide tab is labelled 全般 and has no star', async ({ page }) => {
    const allTab = page.locator('#domainTabs button[data-domain-tab="all"]');
    await expect(allTab).toHaveCount(1);
    await expect(allTab).toHaveText('全般');
    await expect(allTab.locator('i.fa-star, svg.fa-star')).toHaveCount(0);

    // English label too.
    await page.click('#settingsBtn');
    await page.waitForTimeout(300);
    await page.click('#langSwitch button[data-lang="en"]');
    await page.waitForTimeout(600);
    await page.click('[data-close-modal="settingsModal"]');
    await expect(page.locator('#domainTabs button[data-domain-tab="all"]')).toHaveText('General');
  });

  test('domain shortcuts switch to the matching domain tab', async ({ page }) => {
    await page.locator('#domainTabs button[data-domain-tab="all"]').click();
    await page.waitForTimeout(400);

    const shortcuts = page.locator('[data-step-shortcuts="domains"]');
    await expect(shortcuts).toHaveCount(1);

    const buttons = shortcuts.locator('button[data-action="domain-jump"]');
    const domainTabCount = await page.locator('#domainTabs button[data-domain-tab]:not([data-domain-tab="all"])').count();
    expect(await buttons.count()).toBe(domainTabCount);

    // Jumping to Domain 2 must render that domain's content.
    await shortcuts.locator('button[data-action="domain-jump"][data-domain-id="2"]').click();
    await page.waitForTimeout(500);

    const content = (await page.textContent('#contentArea')) || '';
    expect(content).toContain('Domain 2');
    // The exam-wide step cards are gone, i.e. we really switched tabs.
    await expect(page.locator('[data-step-shortcuts="domains"]')).toHaveCount(0);
    await expect(page.locator('#contentArea button[data-action="quiz"]').first()).toBeVisible();
  });

  test('the practice step offers the AI question generator', async ({ page }) => {
    await page.locator('#domainTabs button[data-domain-tab="all"]').click();
    await page.waitForTimeout(400);

    const shortcut = page.locator('[data-step-shortcuts="ai-quiz"]');
    await expect(shortcut).toHaveCount(1);

    const btn = shortcut.locator('button[data-action="dashboard-quiz"]');
    await expect(btn).toBeVisible();
    await btn.scrollIntoViewIfNeeded();
    await btn.click();

    // Opens the same quiz mode chooser as the dashboard entry point.
    await page.waitForSelector('#quizModeModal.active, #quizModeModal:not(.hidden)', { timeout: 10000 });
    await expect(page.locator('#quizModeTaskLabel')).toContainText('全ドメイン横断');
  });

  test('the beginner guide does not get exam shortcuts', async ({ page }) => {
    await page.goto('/#beginner');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1200);

    await expect(page.locator('[data-step-shortcuts]')).toHaveCount(0);
  });
});
