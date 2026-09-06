import { test, expect } from '@playwright/test';
import { classifyAiFailure, aiFailureMessageKey } from '../js/aiErrors.js';

// Coverage for issue #169: "問題生成に失敗する。ネットワークをwifiに途中で切り替えたから？"
// A connection drop mid-stream rejects fetch() with a bare "TypeError: Failed to
// fetch", which used to be shown verbatim. It is now classified so the user gets
// an actionable message.

test.describe('classifyAiFailure (#169)', () => {
  test('bare fetch TypeError is a network failure', () => {
    const err = new TypeError('Failed to fetch');
    expect(classifyAiFailure(err, { online: true })).toBe('network');
  });

  test('same failure while the browser reports offline', () => {
    const err = new TypeError('Failed to fetch');
    expect(classifyAiFailure(err, { online: false })).toBe('offline');
  });

  test('recognizes other network wordings', () => {
    const messages = [
      'NetworkError when attempting to fetch resource.',
      'Load failed',
      'net::ERR_INTERNET_DISCONNECTED',
      'network request failed',
      'The connection was closed',
      'fetch failed',
    ];
    for (const message of messages) {
      expect(classifyAiFailure(new Error(message), { online: true })).toBe('network');
    }
  });

  test('AbortError is reported as aborted', () => {
    const err = new Error('The user aborted a request.');
    err.name = 'AbortError';
    expect(classifyAiFailure(err, { online: true })).toBe('aborted');
  });

  test('API errors are left alone so their detail is preserved', () => {
    const cases = [
      new Error('Server Error: 500'),
      new Error('API key not valid. Please pass a valid API key.'),
      new Error('You exceeded your current quota'),
    ];
    for (const err of cases) {
      expect(classifyAiFailure(err, { online: true })).toBe('unknown');
    }
  });

  test('non-error values do not throw', () => {
    expect(classifyAiFailure(undefined, { online: true })).toBe('unknown');
    expect(classifyAiFailure(null, { online: true })).toBe('unknown');
    expect(classifyAiFailure('Failed to fetch', { online: true })).toBe('network');
  });

  test('defaults to treating the browser as online', () => {
    expect(classifyAiFailure(new TypeError('Failed to fetch'))).toBe('network');
  });

  test('message keys map to the locale entries', () => {
    expect(aiFailureMessageKey('network')).toBe('errors.networkInterrupted');
    expect(aiFailureMessageKey('offline')).toBe('errors.offline');
    expect(aiFailureMessageKey('aborted')).toBe('errors.aborted');
    expect(aiFailureMessageKey('unknown')).toBeNull();
  });
});

// End-to-end: abort the Gemini request the way a dropped connection does and
// check the modal explains it instead of showing "Failed to fetch".
test.describe('network drop during generation shows an actionable message (#169)', () => {
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
    await page.route('**generativelanguage.googleapis.com/**', (route) => route.abort('connectionfailed'));
  });

  test('explains the interrupted connection', async ({ page }) => {
    // Providers walk the model candidate list and retry 3x with 1s/2s/4s backoff
    // before giving up, so this needs more than the default 30s budget on slow
    // machines.
    test.setTimeout(90000);
    await page.goto('/#clf');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1200);

    await page.locator('#domainTabs button', { hasText: 'Domain 1' }).first().click();
    await page.waitForTimeout(500);

    const quizBtn = page.locator('button[data-action="quiz"]').first();
    await quizBtn.scrollIntoViewIfNeeded();
    await quizBtn.click();

    // Providers retry 3 times per model with 1s/2s/4s backoff, so allow time.
    await page.waitForFunction(
      () => (document.getElementById('modalContent')?.textContent || '').includes('通信が中断されました'),
      { timeout: 60000 },
    );

    const content = await page.textContent('#modalContent');
    expect(content).not.toContain('Failed to fetch');
  });
});
