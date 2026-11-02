import { test, expect } from '@playwright/test';

/**
 * Gemini Batch job persistence and resume (issue #225, design §6.1).
 *
 * The batch job runs on Google's side, so closing the tab should not lose the
 * generation. The job name is saved on the ExamSet as soon as the job exists;
 * on the next boot the app polls that job again and offers the finished set.
 * The batch endpoints are stubbed; the "job" completes when the test says so.
 */

const STATE = {
  schemaVersion: 2,
  profile: { name: 'testuser' },
  xp: { total: 0, history: [], weekRing: [] },
  quizHistory: [],
};
const JOB = 'batches/test-job-1';
const TOTAL = 65; // SAA-C03 mock exam
const BATCH_TYPE = 'type.googleapis.com/google.ai.generativelanguage.v1beta.GenerateContentBatch';

const quizJson = (i) => JSON.stringify({
  question: `Batch question ${i + 1}?`,
  choices: ['A. a', 'B. b', 'C. c', 'D. d'],
  correct: 'A',
  explanation: `Explanation ${i + 1}`,
});

function stubBatch(page, flags) {
  // Stage 1 planner: a normal generateContent call before the batch is submitted.
  const planner = page.route('**/v1beta/models/*:generateContent*', (route) => route.fulfill({
    json: { candidates: [{ content: { parts: [{ text: '[]' }] } }] },
  }));
  const create = page.route('**/v1beta/models/*:batchGenerateContent*', async (route) => {
    flags.created += 1;
    await route.fulfill({ json: { name: JOB, metadata: { '@type': BATCH_TYPE, name: JOB, state: 'BATCH_STATE_PENDING' } } });
  });
  const poll = page.route(`**/v1beta/${JOB}*`, async (route) => {
    flags.polls += 1;
    if (!flags.complete) {
      await route.fulfill({ json: { name: JOB, metadata: { '@type': BATCH_TYPE, name: JOB, state: 'BATCH_STATE_RUNNING', batchStats: { requestCount: TOTAL, pendingRequestCount: TOTAL } } } });
      return;
    }
    const inlinedResponses = Array.from({ length: TOTAL }, (_, i) => ({
      metadata: { key: `request-${i}` },
      response: { candidates: [{ content: { parts: [{ text: quizJson(i) }] } }] },
    }));
    await route.fulfill({
      json: {
        name: JOB,
        done: true,
        metadata: { '@type': BATCH_TYPE, name: JOB, state: 'BATCH_STATE_SUCCEEDED', batchStats: { requestCount: TOTAL, successfulRequestCount: TOTAL } },
        response: { output: { inlinedResponses: { inlinedResponses } } },
      },
    });
  });
  return Promise.all([planner, create, poll]);
}

async function readSets(page) {
  return page.evaluate(async () => {
    const m = await import('/js/examSets.js');
    return (await m.listExamSets()).map((s) => ({ status: s.status, n: s.questions.length, requested: s.requested, jobName: s.pipeline?.jobName ?? null, stage: s.pipeline?.stage }));
  });
}

test.describe('batch job resume (#225)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((state) => {
      localStorage.setItem('gemini_api_key', 'test-key-not-used');
      localStorage.setItem('ai_provider', 'gemini');
      localStorage.setItem('asn_locale', 'ja');
      localStorage.setItem('asn_study_state_v1', JSON.stringify(state));
      localStorage.removeItem('gemini_batch_unavailable');
      window.__ASN_BATCH_POLL_MS__ = 150;
      if (!sessionStorage.getItem('asn_test_idb_cleared')) {
        indexedDB.deleteDatabase('asn-exam-sets');
        sessionStorage.setItem('asn_test_idb_cleared', '1');
      }
    }, STATE);
  });

  test('a mock batch survives a reload: the job name is saved, polling resumes, the set becomes ready', async ({ page }) => {
    const flags = { created: 0, polls: 0, complete: false };
    await stubBatch(page, flags);
    page.on('dialog', (d) => d.accept());

    await page.goto('/#saa');
    await page.waitForSelector('#siteTitle');
    await page.click('#mainStudyCtaBtn');
    await page.click('.quiz-mode-card[data-quiz-mode="mock"]');
    await page.click('#quizModeStartBtn');

    // The job was created and its name persisted on the set while still generating.
    await expect(page.locator('#batchProgressToast')).toBeVisible();
    await expect.poll(async () => (await readSets(page))[0]?.jobName, { timeout: 10000 }).toBe(JOB);
    expect(flags.created).toBe(1);
    const before = (await readSets(page))[0];
    expect(before.status).toBe('generating');
    expect(before.requested).toBe(TOTAL);

    // Close/reopen the app while the job is still running.
    const pollsBeforeReload = flags.polls;
    await page.reload();
    await page.waitForSelector('#siteTitle');

    // Boot resumed polling the same job (not creating a new one).
    await expect(page.locator('#batchProgressToast')).toBeVisible();
    await expect.poll(() => flags.polls, { timeout: 10000 }).toBeGreaterThan(pollsBeforeReload);
    expect(flags.created).toBe(1);
    // The interrupted-set sweep must not have downgraded a set with a live job.
    expect((await readSets(page))[0]).toMatchObject({ status: 'generating', jobName: JOB });

    // Let the provider-side job finish.
    flags.complete = true;
    await expect(page.locator('#batchProgressStartBtn')).toBeVisible({ timeout: 15000 });
    await expect.poll(async () => (await readSets(page))[0], { timeout: 10000 }).toMatchObject({ status: 'ready', n: TOTAL, jobName: null });

    await page.click('#batchProgressStartBtn');
    await expect(page.locator('#quizQuestion')).toBeVisible();
    await expect(page.locator('#quizQuestion')).toContainText('Batch question');
  });

  test('a batch that fails on resume marks the set failed and shows the error toast', async ({ page }) => {
    const flags = { created: 0, polls: 0, complete: false };
    await stubBatch(page, flags);
    page.on('dialog', (d) => d.accept());

    await page.goto('/#saa');
    await page.waitForSelector('#siteTitle');
    await page.click('#mainStudyCtaBtn');
    await page.click('.quiz-mode-card[data-quiz-mode="mock"]');
    await page.click('#quizModeStartBtn');
    await expect.poll(async () => (await readSets(page))[0]?.jobName, { timeout: 10000 }).toBe(JOB);

    // After the reload the job reports a terminal failure.
    await page.unroute(`**/v1beta/${JOB}*`);
    await page.route(`**/v1beta/${JOB}*`, (route) => route.fulfill({
      json: { name: JOB, done: true, metadata: { '@type': BATCH_TYPE, name: JOB, state: 'BATCH_STATE_FAILED' }, error: { message: 'quota exceeded' } },
    }));
    await page.reload();
    await page.waitForSelector('#siteTitle');

    await expect(page.locator('#batchProgressTitle')).toHaveText('生成に失敗しました', { timeout: 10000 });
    await expect(page.locator('#batchProgressStatus')).toContainText('quota exceeded');
    await expect.poll(async () => (await readSets(page))[0], { timeout: 10000 }).toMatchObject({ status: 'failed', jobName: null });
  });
});

test.describe('background job chain with quality evaluation (#241, PR 6b)', () => {
  test('writer → solver/judge jobs: a reload during judging resumes the SAME judging job and the set ends judged', async ({ page }) => {
    await page.addInitScript((state) => {
      localStorage.setItem('gemini_api_key', 'test-key-not-used');
      localStorage.setItem('ai_provider', 'gemini');
      localStorage.setItem('asn_locale', 'ja');
      localStorage.setItem('asn_study_state_v1', JSON.stringify(state));
      localStorage.removeItem('gemini_batch_unavailable');
      localStorage.removeItem('asn_pipeline_judge'); // default: judging on for a Gemini mock exam
      window.__ASN_BATCH_POLL_MS__ = 150;
      if (!sessionStorage.getItem('asn_test_idb_cleared')) {
        indexedDB.deleteDatabase('asn-exam-sets');
        sessionStorage.setItem('asn_test_idb_cleared', '1');
      }
    }, STATE);

    const jobs = []; // { name, prompts }
    const flags = { judgeDone: false, judgePolls: 0 };
    await page.route('**/v1beta/models/*:generateContent*', (route) => route.fulfill({ json: { candidates: [{ content: { parts: [{ text: '[]' }] } }] } }));
    await page.route('**/v1beta/models/*:batchGenerateContent*', async (route) => {
      const body = route.request().postDataJSON();
      const prompts = body.batch.inputConfig.requests.requests.map((r) => r.request.contents.map((c) => c.parts.map((p) => p.text).join('\n')).join('\n'));
      const name = `batches/chain-${jobs.length + 1}`;
      jobs.push({ name, prompts });
      await route.fulfill({ json: { name, metadata: { '@type': BATCH_TYPE, name, state: 'BATCH_STATE_PENDING' } } });
    });
    await page.route('**/v1beta/batches/chain-*', async (route) => {
      const name = route.request().url().match(/(batches\/chain-\d+)/)[1];
      const job = jobs.find((j) => j.name === name);
      const isJudging = job.prompts[0].includes('[Solver]');
      if (isJudging) flags.judgePolls += 1;
      if (isJudging && !flags.judgeDone) {
        await route.fulfill({ json: { name, metadata: { '@type': BATCH_TYPE, name, state: 'BATCH_STATE_RUNNING', batchStats: { requestCount: job.prompts.length } } } });
        return;
      }
      const inlinedResponses = job.prompts.map((p, i) => {
        let text = quizJson(i);
        if (p.includes('[Solver]')) text = JSON.stringify({ answer: 'A', confidence: 5 });
        else if (p.includes('[Judge]')) text = JSON.stringify({ accuracy: 5, uniqueness: 4, distractors: 4, fit: 4, cues: 4, verdict: 'pass', issues: [], fix: '' });
        return { metadata: { key: `request-${i}` }, response: { candidates: [{ content: { parts: [{ text }] } }] } };
      });
      await route.fulfill({ json: { name, done: true, metadata: { '@type': BATCH_TYPE, name, state: 'BATCH_STATE_SUCCEEDED', batchStats: { requestCount: job.prompts.length, successfulRequestCount: job.prompts.length } }, response: { output: { inlinedResponses: { inlinedResponses } } } } });
    });
    page.on('dialog', (d) => d.accept());

    await page.goto('/#saa');
    await page.waitForSelector('#siteTitle');
    await page.click('#mainStudyCtaBtn');
    await page.click('.quiz-mode-card[data-quiz-mode="mock"]');
    await page.click('#quizModeStartBtn');

    // The writer job finished; the chain submitted the solver + judge job and saved its name.
    await expect.poll(async () => (await readSets(page))[0], { timeout: 15000 }).toMatchObject({ status: 'judging', stage: 'judging', jobName: 'batches/chain-2', n: TOTAL });
    expect(jobs.map((j) => j.prompts.length)).toEqual([TOTAL, TOTAL * 2]);
    await expect(page.locator('#batchProgressStatus')).toContainText('品質評価中');

    // Close/reopen the app while the judging job is still running on the provider side.
    const pollsBefore = flags.judgePolls;
    await page.reload();
    await page.waitForSelector('#siteTitle');
    await expect.poll(() => flags.judgePolls, { timeout: 10000 }).toBeGreaterThan(pollsBefore);
    expect(jobs).toHaveLength(2); // resumed, not resubmitted
    expect((await readSets(page))[0]).toMatchObject({ status: 'judging', jobName: 'batches/chain-2' });

    flags.judgeDone = true;
    await expect(page.locator('#batchProgressStartBtn')).toBeVisible({ timeout: 15000 });
    await expect.poll(async () => (await readSets(page))[0], { timeout: 10000 }).toMatchObject({ status: 'ready', stage: 'ready', n: TOTAL, jobName: null });
    expect(jobs).toHaveLength(2); // every item passed: no editor job
    const judged = await page.evaluate(async () => {
      const m = await import('/js/examSets.js');
      const set = (await m.listExamSets())[0];
      return { outcomes: [...new Set(set.questions.map((q) => q.judge?.outcome))], score: set.questions[0].judge?.score, metrics: set.metrics };
    });
    expect(judged.outcomes).toEqual(['pass']);
    expect(judged.score).toBe(21);
    expect(judged.metrics).toMatchObject({ requested: TOTAL, generated: TOTAL, judged: TOTAL, passed: TOTAL, background: true, judgeDegraded: false });
  });
});
