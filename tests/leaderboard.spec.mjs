import { test, expect } from '@playwright/test';

/**
 * Global XP leaderboard client (issue #32): opt-in participation, XP sending
 * hooked to addXp, and the leaderboard modal against a mocked backend.
 * The backend URL is overridden through window.__ASN_FEEDBACK_API_URL__ so the
 * tests never reach the real Lambda.
 */

const API = 'https://leaderboard-api.example.test';
const LB_KEY = 'asn_leaderboard_v1';
const CORS = { 'access-control-allow-origin': '*' };

async function seed(page, { apiUrl = '', leaderboard = null, name = 'testuser' } = {}) {
  await page.addInitScript(({ url, lb, userName }) => {
    // Only seed once per test so reloads keep what the app stored.
    if (!sessionStorage.getItem('__seeded')) {
      sessionStorage.setItem('__seeded', '1');
      localStorage.setItem('asn_study_state_v1', JSON.stringify({
        schemaVersion: 2,
        profile: { name: userName },
        xp: { total: 0, history: [], weekRing: [] },
        quizHistory: [],
      }));
      localStorage.setItem('asn_locale', 'ja');
      if (lb) localStorage.setItem('asn_leaderboard_v1', JSON.stringify(lb));
    }
    window.__ASN_FEEDBACK_API_URL__ = url;
    window.__ASN_LEADERBOARD_FLUSH_DELAY_MS__ = 0;
  }, { url: apiUrl, lb: leaderboard, userName: name });
}

async function boot(page) {
  await page.goto('/');
  await page.waitForSelector('#siteTitle');
  await page.waitForFunction(() => document.getElementById('leaderboardOptInStatus')?.textContent !== '-');
}

// Award XP through the same module instance the app uses.
async function awardXp(page, amounts) {
  await page.evaluate(async (list) => {
    const { addXp } = await import('/js/storage.js');
    for (const amount of list) addXp({ amount, reason: 'mission' });
  }, amounts);
}

async function openSettingsToggle(page) {
  await page.click('#settingsBtn');
  await expect(page.locator('#settingsModal')).toBeVisible();
  return page.locator('#leaderboardOptInToggle');
}

async function openLeaderboard(page) {
  // The button sits in an auto-rotating carousel slide; dispatch the click.
  await page.locator('#openLeaderboardBtn').dispatchEvent('click');
  await expect(page.locator('#leaderboardModal')).toBeVisible();
}

const lbState = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), LB_KEY);

test.describe('leaderboard without backend (URL empty)', () => {
  test('toggles are disabled and the modal explains the leaderboard is unavailable', async ({ page }) => {
    const requests = [];
    page.on('request', (r) => { if (/\/leaderboard(\?|\/|$)/.test(r.url())) requests.push(r.url()); });
    await seed(page);
    await boot(page);

    const toggle = await openSettingsToggle(page);
    await expect(toggle).toBeDisabled();
    await expect(toggle).not.toBeChecked();
    await expect(page.locator('#leaderboardOptInStatus')).toContainText('未設定');
    await page.click('[data-close-modal="settingsModal"]');

    await awardXp(page, [10]);
    await openLeaderboard(page);
    await expect(page.locator('#leaderboardList')).toContainText('利用できません');
    await expect(page.locator('#leaderboardModalOptInToggle')).toBeDisabled();
    await page.waitForTimeout(300);
    expect(requests).toEqual([]);
  });
});

test.describe('leaderboard participation (#32)', () => {
  test('sends XP only while opted in, and leaving asks the server to remove the entry', async ({ page }) => {
    const xpPosts = [];
    const leaves = [];
    await page.route(`${API}/leaderboard/xp`, async (route) => {
      const req = route.request();
      xpPosts.push({ body: JSON.parse(req.postData()), contentType: req.headers()['content-type'] });
      const { xp } = JSON.parse(req.postData());
      await route.fulfill({ status: 202, headers: CORS, contentType: 'application/json', body: JSON.stringify({ ok: true, accepted: xp, capped: false, id: 'f'.repeat(20) }) });
    });
    await page.route(`${API}/leaderboard/leave`, async (route) => {
      leaves.push(JSON.parse(route.request().postData()));
      await route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ ok: true, removed: 8 }) });
    });
    await seed(page, { apiUrl: API });
    await boot(page);

    // Not participating by default: XP stays local.
    await awardXp(page, [10]);
    await page.waitForTimeout(500);
    expect(xpPosts).toHaveLength(0);

    const toggle = await openSettingsToggle(page);
    await expect(toggle).toBeEnabled();
    await expect(toggle).not.toBeChecked();
    await toggle.check();
    await expect(page.locator('#leaderboardOptInStatus')).toContainText('参加中');
    const joined = await lbState(page);
    expect(joined.optIn).toBe(true);
    expect(joined.token).toMatch(/^[a-f0-9]{32}$/);
    expect(joined.publicId).toMatch(/^[a-f0-9]{20}$/);
    await page.click('[data-close-modal="settingsModal"]');

    // Awards are batched into one request carrying the user name and a batch id.
    await awardXp(page, [10, 5]);
    await expect.poll(() => xpPosts.length).toBe(1);
    expect(xpPosts[0].contentType).toMatch(/^text\/plain/);
    expect(xpPosts[0].body).toMatchObject({ token: joined.token, name: 'testuser', xp: 15 });
    expect(xpPosts[0].body.batchId).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    await expect.poll(async () => (await lbState(page)).inflight).toBeNull();
    expect((await lbState(page)).pending).toBe(0);

    // Leaving: removal request with the same token, local identity forgotten.
    await openSettingsToggle(page);
    await page.locator('#leaderboardOptInToggle').uncheck();
    await expect.poll(() => leaves.length).toBe(1);
    expect(leaves[0]).toEqual({ token: joined.token });
    await expect(page.locator('#leaderboardOptInStatus')).toContainText('不参加');
    const left = await lbState(page);
    expect(left).toMatchObject({ optIn: false, token: '', pending: 0, inflight: null, leaveToken: '' });

    await awardXp(page, [20]);
    await page.waitForTimeout(500);
    expect(xpPosts).toHaveLength(1);
  });

  test('a failed send is retried with the same batch id (idempotent)', async ({ page }) => {
    const posts = [];
    let fail = true;
    await page.route(`${API}/leaderboard/xp`, async (route) => {
      const body = JSON.parse(route.request().postData());
      posts.push(body);
      if (fail) return route.fulfill({ status: 503, headers: CORS, contentType: 'application/json', body: '{"ok":false}' });
      return route.fulfill({ status: 202, headers: CORS, contentType: 'application/json', body: JSON.stringify({ ok: true, accepted: body.xp }) });
    });
    await seed(page, { apiUrl: API, leaderboard: { optIn: true, token: '1'.repeat(32), publicId: '', pending: 0, inflight: null } });
    await boot(page);

    await awardXp(page, [7]);
    await expect.poll(() => posts.length).toBe(1);
    await expect.poll(async () => (await lbState(page)).inflight?.xp).toBe(7);

    // More XP while the batch is pending goes to the next batch, not this one.
    fail = false;
    await page.evaluate(() => { window.__ASN_LEADERBOARD_FLUSH_DELAY_MS__ = 60000; });
    await awardXp(page, [3]);
    await page.evaluate(async () => (await import('/js/leaderboard.js')).flushLeaderboard());
    await expect.poll(() => posts.length).toBe(3);
    expect(posts[1]).toMatchObject({ xp: 7, batchId: posts[0].batchId });
    expect(posts[2].xp).toBe(3);
    expect(posts[2].batchId).not.toBe(posts[0].batchId);
    const s = await lbState(page);
    expect(s.inflight).toBeNull();
    expect(s.pending).toBe(0);
  });
});

test.describe('leaderboard modal (#32)', () => {
  const ME = 'abcdefabcdefabcdef12';
  function boardFor(period) {
    return {
      ok: true,
      period,
      periodKey: { daily: '2026-10-13', weekly: '2026-W42', monthly: '2026-10', all: 'all' }[period],
      periodStart: period === 'all' ? null : '2026-10-12T00:00:00.000Z',
      periodEnd: period === 'all' ? null : '2026-10-19T00:00:00.000Z',
      timezone: 'UTC',
      participants: 12,
      truncated: false,
      entries: [
        { rank: 1, id: 'x1'.padEnd(20, '0'), name: `top-${period}`, xp: 1200 },
        { rank: 2, id: ME, name: 'testuser', xp: 800 },
        { rank: 2, id: 'x3'.padEnd(20, '0'), name: '<img src=x onerror="window.__pwned=1">', xp: 800 },
        { rank: 4, id: 'x4'.padEnd(20, '0'), name: '', xp: 10 },
      ],
      me: { rank: 2, id: ME, name: 'testuser', xp: 800 },
      generatedAt: '2026-10-13T03:00:00.000Z',
    };
  }

  test('renders each period with the caller highlighted', async ({ page }) => {
    const requested = [];
    await page.route(`${API}/leaderboard?*`, async (route) => {
      const url = new URL(route.request().url());
      requested.push(Object.fromEntries(url.searchParams));
      await route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify(boardFor(url.searchParams.get('period'))) });
    });
    await seed(page, { apiUrl: API, leaderboard: { optIn: true, token: '2'.repeat(32), publicId: ME, pending: 0, inflight: null } });
    await boot(page);
    await openLeaderboard(page);

    const rows = page.locator('#leaderboardList .leaderboard-row');
    await expect(rows).toHaveCount(4);
    expect(requested[0]).toMatchObject({ period: 'weekly', me: ME });
    await expect(page.locator('#leaderboardTabs [data-lb-period="weekly"]')).toHaveAttribute('aria-selected', 'true');
    await expect(rows.nth(0)).toContainText('top-weekly');
    await expect(rows.nth(0)).toContainText('1,200 XP');
    await expect(page.locator('#leaderboardList [data-me="true"]')).toContainText('あなた');
    await expect(rows.nth(2)).toContainText('<img src=x');
    await expect(rows.nth(3)).toContainText('匿名ユーザー');
    await expect(page.locator('#leaderboardMe')).toContainText('12 人中 2 位');
    await expect(page.locator('#leaderboardMeta')).toContainText('2026-W42');
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();

    await page.click('#leaderboardTabs [data-lb-period="all"]');
    await expect(rows.nth(0)).toContainText('top-all');
    expect(requested.at(-1).period).toBe('all');
    await page.click('#leaderboardTabs [data-lb-period="daily"]');
    await expect(rows.nth(0)).toContainText('top-daily');
  });

  test('viewing works without participating, and errors offer a retry', async ({ page }) => {
    let fail = true;
    const requested = [];
    await page.route(`${API}/leaderboard?*`, async (route) => {
      const url = new URL(route.request().url());
      requested.push(Object.fromEntries(url.searchParams));
      if (fail) return route.fulfill({ status: 500, headers: CORS, contentType: 'application/json', body: '{"ok":false}' });
      return route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ ...boardFor('weekly'), me: null }) });
    });
    await seed(page, { apiUrl: API });
    await boot(page);
    await openLeaderboard(page);

    await expect(page.locator('#leaderboardList')).toContainText('読み込めませんでした');
    fail = false;
    await page.click('#leaderboardRetryBtn');
    await expect(page.locator('#leaderboardList .leaderboard-row')).toHaveCount(4);
    expect(requested.at(-1).me).toBeUndefined();
    await expect(page.locator('#leaderboardList [data-me="true"]')).toHaveCount(0);
    await expect(page.locator('#leaderboardMe')).toContainText('ランキングに参加する');
    await expect(page.locator('#leaderboardModalOptInToggle')).not.toBeChecked();
  });
});
