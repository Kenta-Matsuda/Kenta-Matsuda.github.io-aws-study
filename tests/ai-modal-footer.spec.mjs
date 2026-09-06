import { test, expect } from '@playwright/test';

// Coverage for issue #165: on a phone the AI answer footer (Copy / Good / Bad /
// Close ...) overflowed and the Copy button was cut off. Good/Bad are now
// icon-only below the `sm` breakpoint and the footer wraps instead of clipping.

const VALID_QUIZ = JSON.stringify({
  question: 'S3 で静的ウェブサイトをホストするときに必要な設定はどれですか？',
  choices: ['A. 静的ウェブサイトホスティングを有効にする', 'B. EC2 を起動する', 'C. RDS を作成する'],
  correct: 'A',
  explanation: 'S3 の静的ウェブサイトホスティングを有効にします。',
});

async function openAiModalWithQuiz(page) {
  await page.route('**generativelanguage.googleapis.com/**', async (route) => {
    const payload = { candidates: [{ content: { parts: [{ text: VALID_QUIZ }] } }] };
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
      body: `data: ${JSON.stringify(payload)}\n\n`,
    });
  });

  await page.goto('/#clf');
  await page.waitForSelector('#siteTitle');
  await page.waitForTimeout(1200);
  await page.locator('#domainTabs button', { hasText: 'Domain 1' }).first().click();
  await page.waitForTimeout(500);
  const quizBtn = page.locator('button[data-action="quiz"]').first();
  await quizBtn.scrollIntoViewIfNeeded();
  await quizBtn.click();
  await page.waitForSelector('#quizQuestion:not(.hidden)', { timeout: 10000 });
}

test.describe('AI answer footer on small screens (#165)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gemini_api_key', 'test-key-not-used');
      localStorage.setItem('ai_provider', 'gemini');
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
  });

  test('Copy button stays fully visible on a phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAiModalWithQuiz(page);

    const copyBtn = page.locator('#aiCopyBtn');
    await expect(copyBtn).toBeVisible();

    const box = await copyBtn.boundingBox();
    expect(box).not.toBeNull();
    // Fully inside the viewport horizontally (this is what was clipped before).
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);

    // The Copy label itself must not be clipped by its own button either.
    const label = page.locator('#aiCopyBtn [data-ai-copy-label]');
    await expect(label).toBeVisible();
    const labelBox = await label.boundingBox();
    expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(box.x + box.width + 1);
  });

  test('Good/Bad are icon-only on a phone but keep accessible labels', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAiModalWithQuiz(page);

    await expect(page.locator('#aiVoteGoodBtn')).toBeVisible();
    await expect(page.locator('#aiVoteBadBtn')).toBeVisible();

    // Text labels hidden below the sm breakpoint...
    await expect(page.locator('#aiVoteGoodBtn span[data-i18n="common.good"]')).toBeHidden();
    await expect(page.locator('#aiVoteBadBtn span[data-i18n="common.bad"]')).toBeHidden();

    // ...but the icon and an accessible name remain. Font Awesome's JS build
    // replaces the <i> element with an <svg>, so match either form.
    await expect(page.locator('#aiVoteGoodBtn i.fa-thumbs-up, #aiVoteGoodBtn svg.fa-thumbs-up')).toHaveCount(1);
    await expect(page.locator('#aiVoteGoodBtn')).toHaveAttribute('aria-label', '役に立った');
    await expect(page.locator('#aiVoteBadBtn')).toHaveAttribute('aria-label', '微妙 / 改善してほしい');
  });

  test('labels are shown again on a wide viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openAiModalWithQuiz(page);

    await expect(page.locator('#aiVoteGoodBtn span[data-i18n="common.good"]')).toBeVisible();
    await expect(page.locator('#aiVoteBadBtn span[data-i18n="common.bad"]')).toBeVisible();
  });
});
