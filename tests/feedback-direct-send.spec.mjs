import { test, expect } from '@playwright/test';

// Feedback backend wiring (issues #162 / #167 / #247). One "Send" always posts
// to the backend (which stores the feedback and files the GitHub issue itself);
// there is no separate GitHub path and nothing opens a new window. With
// FEEDBACK_API_URL empty the modal shows an error and offers "Copy text".
// The URL is overridden through window.__ASN_FEEDBACK_API_URL__ so tests never
// hit the real backend. Good/Bad votes are mirrored to /votes.

const API = 'https://feedback-api.example.test';

async function seedState(page, { apiUrl = '' } = {}) {
  await page.addInitScript((url) => {
    const state = {
      schemaVersion: 2,
      profile: { name: 'testuser' },
      xp: { total: 0, history: [], weekRing: [] },
      quizHistory: [],
    };
    localStorage.setItem('asn_study_state_v1', JSON.stringify(state));
    localStorage.setItem('asn_locale', 'ja');
    window.__ASN_FEEDBACK_API_URL__ = url;
  }, apiUrl);
}

async function openFeedback(page) {
  await page.goto('/');
  await page.waitForSelector('#siteTitle');
  await page.waitForTimeout(800);
  await page.click('#feedbackBtn');
  await expect(page.locator('#feedbackModal')).toBeVisible();
}

test.describe('feedback modal without backend (URL empty)', () => {
  test('shows an error, keeps the draft and offers copy without leaving the page', async ({ page, context }) => {
    await seedState(page);
    await openFeedback(page);
    await expect(page.locator('#feedbackGithubBtn')).toHaveCount(0);
    await expect(page.locator('#feedbackCopyBtn')).toBeHidden();
    await expect(page.locator('#feedbackModal .fa-github')).toHaveCount(0);

    let popups = 0;
    context.on('page', () => { popups += 1; });
    await page.fill('#feedbackTextarea', 'バックエンド無し');
    await page.click('#feedbackSubmitBtn');

    await expect(page.locator('#feedbackMessage')).toHaveClass(/text-red-600/);
    await expect(page.locator('#feedbackMessage')).toContainText('現在フィードバックを送信できません');
    await expect(page.locator('#feedbackCopyBtn')).toBeVisible();
    await expect(page.locator('#feedbackTextarea')).toHaveValue('バックエンド無し');
    expect(popups).toBe(0);
  });
});

test.describe('feedback modal with backend (#162)', () => {
  test('one Send posts to the backend in the background (no GitHub path)', async ({ page, context }) => {
    let posted = null;
    await page.route(`${API}/feedback`, async (route) => {
      posted = { body: JSON.parse(route.request().postData()), contentType: route.request().headers()['content-type'] };
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ ok: true, issueUrl: 'https://github.com/o/r/issues/7' }),
      });
    });
    await seedState(page, { apiUrl: API });
    await openFeedback(page);

    await expect(page.locator('#feedbackGithubBtn')).toHaveCount(0);
    await expect(page.locator('#feedbackCopyBtn')).toBeHidden();
    await expect(page.locator('#feedbackModal')).not.toContainText('GitHub');
    await expect(page.locator('#feedbackSubmitBtn .fa-paper-plane')).toHaveCount(1);
    await expect(page.locator('#feedbackSubmitBtn')).toContainText('送信');

    await page.selectOption('#feedbackCategorySelect', 'bug_report');
    await page.fill('#feedbackTextarea', 'テスト送信です');
    let popups = 0;
    context.on('page', () => { popups += 1; });
    await page.click('#feedbackSubmitBtn');

    await expect(page.locator('#feedbackMessage')).toHaveClass(/text-teal-600/);
    await expect(page.locator('#feedbackMessage')).toContainText('送信しました');
    // No link out to GitHub and no new window: filing happens server-side.
    await expect(page.locator('#feedbackMessage a')).toHaveCount(0);
    expect(popups).toBe(0);
    expect(posted.contentType).toMatch(/^text\/plain/);
    expect(posted.body).toMatchObject({ category: 'bug_report', text: 'テスト送信です', lang: 'ja', website: '' });
    expect(posted.body.elapsedMs).toBeGreaterThan(0);
  });

  test('re-encodes attached images and sends them with the feedback', async ({ page }) => {
    let posted = null;
    await page.route(`${API}/feedback`, async (route) => {
      posted = JSON.parse(route.request().postData());
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ ok: true, issueUrl: null }),
      });
    });
    await seedState(page, { apiUrl: API });
    await openFeedback(page);

    // 1x1 PNG
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await page.setInputFiles('#feedbackImageInput', { name: 'shot.png', mimeType: 'image/png', buffer: png });
    await page.fill('#feedbackTextarea', '画像付き');
    await page.click('#feedbackSubmitBtn');

    await expect(page.locator('#feedbackMessage')).toHaveClass(/text-teal-600/);
    expect(posted.images).toHaveLength(1);
    const bytes = Buffer.from(posted.images[0].data, 'base64');
    const isWebp = bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP';
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    expect(isWebp || isJpeg).toBe(true);
  });

  test('shows an error and offers copy when sending fails', async ({ page }) => {
    await page.route(`${API}/feedback`, (route) => route.fulfill({
      status: 500,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ ok: false, error: 'internal' }),
    }));
    await seedState(page, { apiUrl: API });
    await openFeedback(page);
    await page.fill('#feedbackTextarea', '失敗ケース');
    await page.click('#feedbackSubmitBtn');

    await expect(page.locator('#feedbackMessage')).toHaveClass(/text-red-600/);
    await expect(page.locator('#feedbackCopyBtn')).toBeVisible();
    // The draft is kept so the user can retry or copy it.
    await expect(page.locator('#feedbackTextarea')).toHaveValue('失敗ケース');
  });

  test('mirrors Good/Bad votes to /votes in a batch', async ({ page }) => {
    const batches = [];
    await page.route(`${API}/votes`, async (route) => {
      batches.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 202, headers: { 'access-control-allow-origin': '*' }, body: '{"ok":true}' });
    });
    await seedState(page, { apiUrl: API });
    await page.goto('/');
    await page.waitForSelector('#siteTitle');

    await page.evaluate(async () => {
      const votes = await import('/js/votes.js');
      votes.submitVote({ targetType: 'resource', targetId: 'r-1', value: 'good', meta: { exam_id: 'clf-c02' } });
      votes.submitVote({ targetType: 'resource', targetId: 'r-1', value: 'good' }); // unchanged -> not sent
      votes.clearVote({ targetType: 'resource', targetId: 'r-1' });
    });

    await expect.poll(() => batches.length, { timeout: 8000 }).toBe(1);
    expect(batches[0].events.map((e) => [e.action, e.value])).toEqual([['set', 'good'], ['clear', 'good']]);
    expect(batches[0].events[0].meta).toEqual({ exam_id: 'clf-c02' });
  });
});
