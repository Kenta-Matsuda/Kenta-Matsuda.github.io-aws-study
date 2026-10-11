import { test, expect } from '@playwright/test';
import {
  SET_STATUS,
  createExamSet,
  appendExamSetQuestion,
  finalizeExamSet,
  finishedStatusFor,
  summarizeExamSet,
  listExamSets,
  markInterruptedExamSets,
  createAttempt,
  recordAttemptAnswer,
  finishAttempt,
  listAttempts,
  getExamSetStorageKind,
} from '../js/examSets.js';

/**
 * Exam sets / attempts (issue #225, design §7): questions are persisted the
 * moment they are generated, and a run through a set is a separate Attempt.
 * In Node there is no IndexedDB, so the pure-logic tests exercise the
 * in-memory fallback; the browser tests use real IndexedDB.
 */

const q = (i) => ({ question: `Q${i}?`, choices: ['A. a', 'B. b', 'C. c', 'D. d'], correctIndex: 0, explanation: 'e' });

test.describe('exam sets – store logic (#225)', () => {
  test('falls back to the in-memory store without IndexedDB', async () => {
    expect(await getExamSetStorageKind()).toBe('memory');
  });

  test('finishedStatusFor / summarizeExamSet', () => {
    expect(finishedStatusFor({ questions: [], requested: 10 })).toBe(SET_STATUS.FAILED);
    expect(finishedStatusFor({ questions: [q(1)], requested: 10 })).toBe(SET_STATUS.PARTIAL);
    expect(finishedStatusFor({ questions: [q(1), q(2)], requested: 2 })).toBe(SET_STATUS.READY);
    const s = summarizeExamSet({ status: SET_STATUS.GENERATING, questions: [q(1)], requested: 4 });
    expect(s).toEqual({ done: 1, requested: 4, progress: 0.25, inProgress: true, startable: false });
    expect(summarizeExamSet({ status: SET_STATUS.PARTIAL, questions: [q(1)], requested: 4 }).startable).toBe(true);
  });

  test('a set grows question by question and is finalized by count', async () => {
    const set = await createExamSet({ examId: 'saa-c03', mode: 'speed', title: 'T', requested: 3 });
    expect(set.status).toBe(SET_STATUS.GENERATING);
    const stored = await appendExamSetQuestion(set.id, q(1));
    expect(stored.id).toMatch(/^q_/);
    await appendExamSetQuestion(set.id, q(2));
    const partial = await finalizeExamSet(set.id);
    expect(partial.status).toBe(SET_STATUS.PARTIAL);
    expect(partial.questions).toHaveLength(2);
    expect((await listExamSets({ examId: 'saa-c03' })).some((s) => s.id === set.id)).toBe(true);
  });

  test('interrupted sets are marked by their question count on boot', async () => {
    const withQ = await createExamSet({ examId: 'clf-c02', mode: 'speed', requested: 10 });
    await appendExamSetQuestion(withQ.id, q(1));
    const empty = await createExamSet({ examId: 'clf-c02', mode: 'mock', requested: 65 });
    const running = await createExamSet({ examId: 'clf-c02', mode: 'mock', requested: 65, pipeline: { jobName: 'batches/x' } });
    const changed = await markInterruptedExamSets();
    const byId = Object.fromEntries(changed.map((s) => [s.id, s.status]));
    expect(byId[withQ.id]).toBe(SET_STATUS.PARTIAL);
    expect(byId[empty.id]).toBe(SET_STATUS.FAILED);
    expect(byId[running.id]).toBeUndefined(); // has a provider-side job: left for resume
  });

  test('attempts record answers and a score', async () => {
    const set = await createExamSet({ examId: 'aib-c01', mode: 'quick5', questions: [q(1), q(2)] });
    expect(set.status).toBe(SET_STATUS.READY);
    const a = await createAttempt({ setId: set.id, examId: set.examId, mode: set.mode });
    await recordAttemptAnswer(a.id, { questionId: set.questions[0].id, userAnswer: 0, isCorrect: true, elapsedMs: 1200, xpEarned: 10 });
    await recordAttemptAnswer(a.id, { questionId: set.questions[1].id, userAnswer: 2, isCorrect: false, elapsedMs: 800 });
    const done = await finishAttempt(a.id, { maxCombo: 1 });
    expect(done.score).toBe(0.5);
    expect(done.xpEarned).toBe(10);
    expect(done.finishedAt).toBeTruthy();
    expect(await listAttempts({ setId: set.id })).toHaveLength(1);
  });
});

// ─── Browser: real IndexedDB through the app ────────────────

const STATE = {
  schemaVersion: 2,
  profile: { name: 'testuser' },
  xp: { total: 0, history: [], weekRing: [] },
  quizHistory: [],
};

function stubGemini(page, { delayMs = 0 } = {}) {
  let n = 0;
  return page.route('**generativelanguage.googleapis.com/**', async (route) => {
    n += 1;
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    const quiz = JSON.stringify({ question: `Generated question ${n}?`, choices: ['A. a', 'B. b', 'C. c', 'D. d'], correct: 'A', explanation: `Explanation ${n}` });
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
      body: `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: quiz }] } }] })}\n\n`,
    });
  });
}

async function readSets(page) {
  return page.evaluate(async () => {
    const m = await import('/js/examSets.js');
    const sets = await m.listExamSets();
    const attempts = await m.listAttempts();
    return { sets: sets.map((s) => ({ status: s.status, n: s.questions.length, requested: s.requested, source: s.source })), attempts: attempts.map((a) => a.answers.length) };
  });
}

test.describe('exam sets – browser (#225)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((state) => {
      localStorage.setItem('gemini_api_key', 'test-key-not-used');
      localStorage.setItem('ai_provider', 'gemini');
      localStorage.setItem('asn_locale', 'ja');
      localStorage.setItem('asn_study_state_v1', JSON.stringify(state));
      // Start each test from an empty store, but keep it across reloads
      // within the test (the init script runs again on reload).
      if (!sessionStorage.getItem('asn_test_idb_cleared')) {
        indexedDB.deleteDatabase('asn-exam-sets');
        sessionStorage.setItem('asn_test_idb_cleared', '1');
      }
    }, STATE);
  });

  test('a speed run interrupted by a reload keeps its questions and can be started', async ({ page }) => {
    await stubGemini(page, { delayMs: 250 });
    await page.goto('/#saa');
    await page.waitForSelector('#siteTitle');
    await page.click('#mainStudyCtaBtn');
    await page.click('.quiz-mode-card[data-quiz-mode="speed"]');
    await page.click('#quizModeStartBtn');
    // Let a few questions land, then interrupt.
    await expect.poll(async () => (await readSets(page)).sets[0]?.n ?? 0, { timeout: 10000 }).toBeGreaterThanOrEqual(2);
    await page.reload();
    await page.waitForSelector('#siteTitle');

    const { sets } = await readSets(page);
    expect(sets).toHaveLength(1);
    expect(sets[0].status).toBe('partial');
    expect(sets[0].n).toBeGreaterThanOrEqual(2);
    expect(sets[0].n).toBeLessThan(10);

    // The set library lists it and can start it.
    await page.click('#mainStudyCtaBtn');
    await page.click('#quizModeSetsBtn');
    const row = page.locator('#examSetsList [data-set-id]');
    await expect(row).toHaveCount(1);
    await expect(row.locator('[data-set-status-label]')).toHaveText('一部のみ');
    await expect(row.locator('[data-set-progress]')).toContainText(`${sets[0].n} / 10`);
    await row.locator('button[data-set-action="start"]').click();
    await expect(page.locator('#quizQuestion')).toBeVisible();
    await expect(page.locator('#quizQuestion')).toContainText('Generated question');

    // Answering records an attempt against the saved set.
    await page.locator('#quizChoices button').first().click();
    await expect.poll(async () => (await readSets(page)).attempts, { timeout: 5000 }).toEqual([1]);
  });

  test('a task-card quiz is saved before it is answered', async ({ page }) => {
    await stubGemini(page);
    await page.goto('/#clf');
    await page.waitForSelector('#siteTitle');
    await page.locator('#domainTabs button', { hasText: 'Domain 1' }).first().click();
    const quizBtn = page.locator('button[data-action="quiz"]').first();
    await quizBtn.scrollIntoViewIfNeeded();
    await quizBtn.click();
    await page.waitForSelector('#quizQuestion:not(.hidden)', { timeout: 10000 });

    await expect.poll(async () => (await readSets(page)).sets, { timeout: 5000 }).toEqual([
      { status: 'ready', n: 1, requested: 1, source: 'ai' },
    ]);
    expect((await readSets(page)).attempts).toEqual([]);

    await page.locator('#quizChoices button').first().click();
    await expect.poll(async () => (await readSets(page)).attempts, { timeout: 5000 }).toEqual([1]);
  });

  test('the daily challenge is stored as an imported, ready set', async ({ page }) => {
    await page.goto('/#clf');
    await page.waitForSelector('#siteTitle');
    await page.evaluate(() => document.getElementById('dailyChallengeBtn')?.click());
    await page.waitForSelector('#quizQuestion:not(.hidden)', { timeout: 10000 });
    await expect.poll(async () => (await readSets(page)).sets[0], { timeout: 5000 }).toMatchObject({ status: 'ready', source: 'daily' });
  });
});
