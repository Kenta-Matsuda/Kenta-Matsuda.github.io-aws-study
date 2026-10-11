import { test, expect } from '@playwright/test';
import {
  EVENT_TYPES,
  normalizeLearningEvent,
  recordLearningEvent,
  listPendingLearningEvents,
  clearLearningEvents,
  setLearningEventSink,
  flushLearningEvents,
} from '../js/learningEvents.js';

/**
 * Learning events (issue #225, design §9): ids-only events stored locally and
 * sent in batches to the feedback backend's /events when configured.
 */

test.describe('learning events – client logic', () => {
  test.beforeEach(async () => {
    await clearLearningEvents();
    setLearningEventSink(null);
    // Node has no `location`, so the production FEEDBACK_API_URL would count as
    // configured: disable the backend explicitly for these pure tests.
    globalThis.__ASN_FEEDBACK_API_URL__ = '';
  });

  test('normalizes to the wire schema and drops unknown types/fields', () => {
    const e = normalizeLearningEvent({ type: 'question_answered', examId: 'aib-c01', questionId: 'q_1', isCorrect: true, userAnswer: 2, elapsedMs: '1200', junk: 'x', value: 'meh' });
    expect(e).toMatchObject({ type: 'question_answered', schema: 1, examId: 'aib-c01', questionId: 'q_1', isCorrect: true, userAnswer: 2, elapsedMs: 1200 });
    expect(e.junk).toBeUndefined();
    expect(e.value).toBeUndefined();
    expect(e.at).toMatch(/^\d{4}-/);
    expect(normalizeLearningEvent({ type: 'nope' })).toBeNull();
    expect(EVENT_TYPES).toContain('set_completed');
  });

  test('records locally, flushes in batches through the sink, keeps events when the sink fails', async () => {
    const batches = [];
    let accept = false;
    setLearningEventSink(async (events) => { batches.push(events.length); return accept; });
    for (let i = 0; i < 60; i++) await recordLearningEvent({ type: 'question_generated', examId: 'saa-c03', questionId: `q${i}` });
    expect(await listPendingLearningEvents()).toHaveLength(60);

    // Sink refuses: nothing is deleted.
    let r = await flushLearningEvents();
    expect(r).toEqual({ sent: 0, pending: 60 });
    expect(batches).toEqual([50]);

    // Sink accepts: two batches (50 + 10), store emptied.
    accept = true;
    r = await flushLearningEvents();
    expect(r).toEqual({ sent: 60, pending: 0 });
    expect(batches).toEqual([50, 50, 10]);
    expect(await listPendingLearningEvents()).toHaveLength(0);
  });

  test('events without an examId are never recorded (they could block the queue)', async () => {
    expect(await recordLearningEvent({ type: 'question_answered', questionId: 'q_1', isCorrect: true })).toBeNull();
    expect(await listPendingLearningEvents()).toHaveLength(0);
  });

  test('the default sink does nothing when the backend is not configured', async () => {
    await recordLearningEvent({ type: 'set_completed', examId: 'clf-c02', score: 0.8, total: 5 });
    const r = await flushLearningEvents();
    expect(r).toEqual({ sent: 0, pending: 1 });
  });
});

// ─── Browser: the quiz flow emits events; a configured backend receives them ─────

const STATE = { schemaVersion: 2, profile: { name: 'testuser' }, xp: { total: 0, history: [], weekRing: [] }, quizHistory: [] };

test.describe('learning events – browser', () => {
  test('answering a generated question records generated + answered events and posts them to /events', async ({ page }) => {
    const posted = [];
    await page.addInitScript((state) => {
      localStorage.setItem('gemini_api_key', 'test-key-not-used');
      localStorage.setItem('ai_provider', 'gemini');
      localStorage.setItem('asn_locale', 'ja');
      localStorage.setItem('asn_study_state_v1', JSON.stringify(state));
      indexedDB.deleteDatabase('asn-learning-events');
      indexedDB.deleteDatabase('asn-exam-sets');
      // Opt the local dev server into a (stubbed) backend.
      window.__ASN_FEEDBACK_API_URL__ = 'https://feedback.example.test';
    }, STATE);
    await page.route('https://feedback.example.test/**', async (route) => {
      posted.push({ path: new URL(route.request().url()).pathname, body: JSON.parse(route.request().postData() || '{}') });
      const status = await page.evaluate(() => window.__eventsStatus || 202);
      await route.fulfill({ status, json: { ok: status < 300, accepted: status < 300 ? 1 : 0 } });
    });
    await page.route('**generativelanguage.googleapis.com/**', async (route) => {
      const quiz = JSON.stringify({ question: 'S3 の静的ホスティングに必要な設定は？', choices: ['A. 静的ウェブサイトホスティングを有効にする', 'B. EC2 を起動する', 'C. RDS を作成する', 'D. VPC を作る'], correct: 'A', explanation: '解説' });
      await route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream; charset=utf-8' }, body: `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: quiz }] } }] })}\n\n` });
    });

    await page.goto('/#clf');
    await page.waitForSelector('#siteTitle');
    await page.locator('#domainTabs button', { hasText: 'Domain 1' }).first().click();
    const quizBtn = page.locator('button[data-action="quiz"]').first();
    await quizBtn.scrollIntoViewIfNeeded();
    await quizBtn.click();
    await page.waitForSelector('#quizQuestion:not(.hidden)', { timeout: 10000 });
    await page.locator('#quizChoices button').first().click();

    const pending = async () => page.evaluate(async () => {
      const m = await import('/js/learningEvents.js');
      return (await m.listPendingLearningEvents()).map((e) => e.type);
    });
    await expect.poll(pending, { timeout: 5000 }).toEqual(['question_generated', 'question_answered']);

    // Flush now (the timer would do it after a few seconds) and check the wire format.
    const result = await page.evaluate(async () => {
      const m = await import('/js/learningEvents.js');
      return m.flushLearningEvents();
    });
    expect(result).toEqual({ sent: 2, pending: 0 });

    expect(posted).toHaveLength(1);
    expect(posted[0].path).toBe('/events');
    const events = posted[0].body.events;
    expect(events.map((e) => e.type)).toEqual(['question_generated', 'question_answered']);
    expect(events[1]).toMatchObject({ examId: 'clf-c02', mode: 'single', isCorrect: true, userAnswer: 0, schema: 1 });
    expect(events[1].questionId).toBe(events[0].questionId);
    for (const e of events) {
      expect(e.id).toBeUndefined();
      expect(JSON.stringify(e)).not.toContain('静的ホスティング'); // no question text leaves the device
    }

    // A permanent rejection (4xx other than 429) drops the batch instead of
    // retrying it forever; a transient failure (5xx) keeps it.
    const drop = await page.evaluate(async () => {
      const m = await import('/js/learningEvents.js');
      await m.recordLearningEvent({ type: 'set_completed', examId: 'clf-c02', score: 1, total: 1 });
      window.__eventsStatus = 400;
      const a = await m.flushLearningEvents();
      await m.recordLearningEvent({ type: 'set_completed', examId: 'clf-c02', score: 1, total: 1 });
      window.__eventsStatus = 503;
      const b = await m.flushLearningEvents();
      window.__eventsStatus = 429;
      const c = await m.flushLearningEvents();
      return { a, b, c };
    });
    expect(drop.a).toEqual({ sent: 1, pending: 0 });
    expect(drop.b).toEqual({ sent: 0, pending: 1 });
    expect(drop.c).toEqual({ sent: 0, pending: 1 });
  });
});
