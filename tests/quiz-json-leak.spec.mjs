import { test, expect } from '@playwright/test';
import { looksLikeQuizJson, parseQuizResponse } from '../js/quiz.js';

// Coverage for issue #166: "模擬問題を作成" showed raw JSON.
// Two causes: (1) the JSON contract was streamed straight into the modal while
// generating, (2) an unparsable payload was rendered verbatim as a fallback.

test.describe('looksLikeQuizJson (#166)', () => {
  test('detects a bare quiz JSON object', () => {
    expect(looksLikeQuizJson('{"question":"Q?","choices":["A. x"],"correct":"A"}')).toBe(true);
  });

  test('detects a fenced quiz JSON block', () => {
    expect(looksLikeQuizJson('```json\n{"question":"Q?","choices":["A. x"]}\n```')).toBe(true);
  });

  test('detects a payload with leading prose', () => {
    expect(looksLikeQuizJson('Sure! {"explanation":"e","question":"Q?"}')).toBe(true);
  });

  test('does not flag ordinary prose or markdown explanations', () => {
    const cases = [
      '',
      '   ',
      'S3 はオブジェクトストレージです。',
      '## 解説\n\n- Lambda はサーバーレスです。',
      '【問題文】\nQ?\n【選択肢】\nA. x\nB. y\n正解: A\n解説: e',
      '{ "unrelated": true }',
    ];
    for (const input of cases) {
      expect(looksLikeQuizJson(input)).toBe(false);
    }
  });

  test('flags payloads that are quiz-shaped but unusable', () => {
    // Only one choice and an out-of-range answer: parseQuizResponse gives up,
    // so the UI must show a generation error instead of this text.
    const payload = '{"question":"Q?","choices":["A. only"],"correct":"Z"}';
    expect(parseQuizResponse(payload)).toBeNull();
    expect(looksLikeQuizJson(payload)).toBe(true);
  });
});

// End-to-end: stub the Gemini streaming endpoint so no real API key/network is
// needed, then confirm the modal never shows the JSON payload — neither while
// streaming nor after a parse failure.
test.describe('quiz generation never shows raw JSON (#166)', () => {
  const QUIZ_JSON = '{"question":"Q?","choices":["A. only"],"correct":"Z","explanation":"e"}';

  function sseBody(text) {
    // Two chunks so the streaming path (onTextDelta) is exercised.
    const half = Math.ceil(text.length / 2);
    const chunks = [text.slice(0, half), text.slice(half)];
    return chunks
      .map((chunk) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: chunk }] } }] })}\n\n`)
      .join('');
  }

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

    await page.route('**generativelanguage.googleapis.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream; charset=utf-8' },
        body: sseBody(QUIZ_JSON),
      });
    });
  });

  test('unparsable quiz payload shows a friendly error, not the JSON', async ({ page }) => {
    await page.goto('/#clf');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1200);

    // Task cards (with the "generate quiz" button) live under a domain tab.
    await page.locator('#domainTabs button', { hasText: 'Domain 1' }).first().click();
    await page.waitForTimeout(500);

    const quizBtn = page.locator('button[data-action="quiz"]').first();
    await quizBtn.scrollIntoViewIfNeeded();
    await quizBtn.click();

    // Wait for the modal to settle after the stubbed stream completes.
    await page.waitForSelector('#aiModal.active, #aiModal:not(.hidden)', { timeout: 10000 });
    await page.waitForFunction(
      () => (document.getElementById('modalContent')?.textContent || '').includes('組み立てられませんでした'),
      { timeout: 10000 },
    );

    const content = await page.textContent('#modalContent');
    expect(content).not.toContain('"question"');
    expect(content).not.toContain('"choices"');
    expect(content).not.toContain('{');
  });
});

// The happy path must keep working: a valid payload becomes an interactive quiz
// and the JSON itself is never visible.
test.describe('valid quiz payload still renders the interactive quiz (#166)', () => {
  const VALID_QUIZ = JSON.stringify({
    question: 'S3 で静的ウェブサイトをホストするときに必要な設定はどれですか？',
    choices: ['A. バケットの静的ウェブサイトホスティングを有効にする', 'B. EC2 を起動する', 'C. RDS を作成する'],
    correct: 'A',
    explanation: 'S3 の静的ウェブサイトホスティングを有効にします。',
  });

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

    await page.route('**generativelanguage.googleapis.com/**', async (route) => {
      const payload = { candidates: [{ content: { parts: [{ text: VALID_QUIZ }] } }] };
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream; charset=utf-8' },
        body: `data: ${JSON.stringify(payload)}\n\n`,
      });
    });
  });

  test('question and choices are rendered, JSON is not', async ({ page }) => {
    await page.goto('/#clf');
    await page.waitForSelector('#siteTitle');
    await page.waitForTimeout(1200);

    await page.locator('#domainTabs button', { hasText: 'Domain 1' }).first().click();
    await page.waitForTimeout(500);

    const quizBtn = page.locator('button[data-action="quiz"]').first();
    await quizBtn.scrollIntoViewIfNeeded();
    await quizBtn.click();

    await page.waitForSelector('#quizQuestion:not(.hidden)', { timeout: 10000 });
    const question = await page.textContent('#quizQuestion');
    expect(question).toContain('静的ウェブサイト');

    const modalText = (await page.textContent('#modalContent')) || '';
    expect(modalText).not.toContain('"question"');
    expect(modalText).not.toContain('"choices"');
  });
});
