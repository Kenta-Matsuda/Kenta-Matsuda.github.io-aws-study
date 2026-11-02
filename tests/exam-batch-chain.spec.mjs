import { test, expect } from '@playwright/test';
import {
  runBatchChain,
  isResumableChain,
  parseWriterResults,
  buildJudgingRequests,
  CHAIN_STAGE,
} from '../js/examBatchChain.js';
import { JUDGE_MARKER, SOLVER_MARKER, EDITOR_MARKER } from '../js/examJudge.js';

/**
 * Background job chain (issue #241 / #225 design §6.1, PR 6b): the writer job is
 * followed by a solver + judge job and an editor job, each persisted before the
 * next is submitted, so evaluation continues across browser restarts.
 *
 * The chain runs against the REAL js/geminiBatch.js client with `fetch` mocked by
 * a tiny fake Gemini Batch server (create → poll → inlined responses).
 */

const MODEL = 'gemini-3-flash-preview';
const BATCH_TYPE = 'type.googleapis.com/google.ai.generativelanguage.v1beta.GenerateContentBatch';

const quiz = (tag, over = {}) => JSON.stringify({
  question: `Which service fits requirement ${tag}?`,
  choices: ['A. Amazon S3', 'B. Amazon EBS', 'C. Amazon EFS', 'D. Instance store'],
  correct: 'A',
  explanation: `S3 fits ${tag}.`,
  ...over,
});
const judgeJson = (verdict, scores = 4) => JSON.stringify({
  accuracy: verdict === 'reject' ? 1 : scores, uniqueness: scores, distractors: scores, fit: scores, cues: scores,
  verdict, issues: verdict === 'pass' ? [] : [`issue (${verdict})`], fix: verdict === 'fix' ? 'make B clearly wrong' : '',
});

/** Fake Gemini Batch API. `respond(prompt, index)` produces each inlined response text. */
function fakeBatchServer({ respond, pollsUntilDone = 1, failJobs = new Set() }) {
  const jobs = new Map();
  const log = { created: [], polls: 0, cancels: 0 };
  const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
  const fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes(':batchGenerateContent')) {
      const body = JSON.parse(init.body);
      const prompts = body.batch.inputConfig.requests.requests.map((r) => r.request.contents.map((c) => c.parts.map((p) => p.text).join('\n')).join('\n'));
      const name = `batches/job-${jobs.size + 1}`;
      jobs.set(name, { prompts, polls: 0 });
      log.created.push({ name, n: prompts.length, prompts });
      return json({ name, metadata: { '@type': BATCH_TYPE, name, state: 'BATCH_STATE_PENDING' } });
    }
    if (u.includes(':cancel')) { log.cancels++; return json({}); }
    const m = u.match(/v1beta\/(batches\/[^?]+)/);
    if (m && jobs.has(m[1])) {
      log.polls++;
      const name = m[1];
      const job = jobs.get(name);
      job.polls++;
      if (failJobs.has(name)) return json({ name, done: true, metadata: { '@type': BATCH_TYPE, name, state: 'BATCH_STATE_FAILED' }, error: { message: 'quota exceeded' } });
      if (job.polls < pollsUntilDone) return json({ name, metadata: { '@type': BATCH_TYPE, name, state: 'BATCH_STATE_RUNNING', batchStats: { requestCount: job.prompts.length } } });
      const inlinedResponses = job.prompts.map((p, i) => {
        const text = respond(p, i);
        return text == null
          ? { metadata: { key: `request-${i}` }, error: { code: 500, message: 'internal' } }
          : { metadata: { key: `request-${i}` }, response: { candidates: [{ content: { parts: [{ text }] } }] } };
      });
      return json({ name, done: true, metadata: { '@type': BATCH_TYPE, name, state: 'BATCH_STATE_SUCCEEDED', batchStats: { requestCount: job.prompts.length, successfulRequestCount: job.prompts.length } }, response: { output: { inlinedResponses: { inlinedResponses } } } });
    }
    return json({ error: { message: `unexpected ${u}` } }, 404);
  };
  return { fetch, log };
}

// Writer outputs keyed by slot: W0 clean, W1 judged "fix", W2 judged "reject", W3 unparseable.
const WRITER = { W0: quiz('W0'), W1: quiz('W1'), W2: quiz('W2'), W3: 'sorry, no JSON here' };
function respondDefault(prompt) {
  const tag = (prompt.match(/W\d/) || [])[0];
  if (prompt.includes(SOLVER_MARKER)) return JSON.stringify({ answer: 'A', confidence: 4 });
  if (prompt.includes(JUDGE_MARKER)) return judgeJson(tag === 'W1' ? 'fix' : tag === 'W2' ? 'reject' : 'pass');
  if (prompt.includes(EDITOR_MARKER)) return quiz('W1', { question: 'Which service fits requirement W1 (edited)?' });
  return WRITER[tag] ?? null;
}

const SLOTS = ['W0', 'W1', 'W2', 'W3'].map((tag) => ({
  domainId: 'd1', taskId: '1.1', unitId: `unit-${tag}`, answerLetter: 'A', level: 'Associate',
  design: `design ${tag}`, material: `material ${tag}`, resources: [], allowedUrls: [],
}));

let gb;
test.beforeAll(async () => {
  const store = new Map([['gemini_api_key', 'test-key'], ['ai_provider', 'gemini']]);
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  globalThis.__ASN_BATCH_POLL_MS__ = 1;
  gb = await import('../js/geminiBatch.js');
});

/** deps wired to the real Batch client; `saved` records every persisted stage boundary. */
function makeDeps(saved, { pollHook } = {}) {
  return {
    submit: async ({ requests, displayName }) => ({ name: await gb.submitGeminiBatch({ model: MODEL, requests, displayName }), model: MODEL }),
    poll: async ({ name, total, stage }) => {
      pollHook?.({ name, stage });
      return gb.pollGeminiBatch({ name, total, pollIntervalMs: 1 });
    },
    save: async (patch) => { saved.push(JSON.parse(JSON.stringify(patch))); return null; },
    now: () => 1_700_000_000_000,
  };
}

async function submitWriter() {
  const requests = SLOTS.map((_, i) => ({ systemPrompt: 'writer', userPrompt: `write W${i}` }));
  return gb.submitGeminiBatch({ model: MODEL, requests, displayName: 'writer' });
}

test.describe('batch job chain (#241, PR 6b)', () => {
  test('writing → judging → fixing → ready: judge verdicts applied, fix edited, reject dropped', async () => {
    const server = fakeBatchServer({ respond: respondDefault, pollsUntilDone: 2 });
    globalThis.fetch = server.fetch;
    const jobName = await submitWriter();
    const saved = [];
    const out = await runBatchChain({ state: { stage: 'writing', jobName, model: MODEL, slots: SLOTS }, judge: true, deps: makeDeps(saved) });

    // Three jobs: writer (4) → solver+judge (2 × 3 parsed) → editor (1 "fix").
    expect(server.log.created.map((j) => j.n)).toEqual([4, 6, 1]);
    expect(server.log.created[1].prompts.filter((p) => p.includes(SOLVER_MARKER))).toHaveLength(3);
    expect(server.log.created[1].prompts.filter((p) => p.includes(JUDGE_MARKER))).toHaveLength(3);
    expect(server.log.created[2].prompts[0]).toContain(EDITOR_MARKER);
    // The judge prompt carries the slot's material and design (saved as plain data).
    expect(server.log.created[1].prompts.find((p) => p.includes(JUDGE_MARKER) && p.includes('W1'))).toContain('material W1');

    // Each stage boundary was persisted, and each job name before it was polled.
    const stages = saved.map((s) => [s.pipeline.stage, s.pipeline.jobName]);
    expect(stages).toEqual([
      ['judging', null], ['judging', 'batches/job-2'],
      ['fixing', null], ['fixing', 'batches/job-3'],
      ['ready', null], ['ready', null],
    ]);
    expect(saved[1].pipeline.pending).toHaveLength(6);

    expect(out.questions.map((q) => q.unitId)).toEqual(['unit-W0', 'unit-W1']);
    expect(out.questions[0].judge).toMatchObject({ outcome: 'pass', score: 20, solverLetter: 'A', solverAgrees: true, fixed: false });
    expect(out.questions[1].question).toContain('(edited)');
    expect(out.questions[1].judge).toMatchObject({ outcome: 'pass', fixed: true });
    expect(out.questions[1].judge).not.toHaveProperty('fixHint');
    expect(out.metrics).toMatchObject({ requested: 4, generated: 2, rejected: 1, fixed: 1, judged: 2, passed: 2, judgeDegraded: false, background: true });
    expect(out.metrics.calls).toEqual({ writer: 4, solver: 3, judge: 3, editor: 1 });
  });

  test('closing the browser during the judging job: resume polls the SAME job, no resubmission', async () => {
    const server = fakeBatchServer({ respond: respondDefault, pollsUntilDone: 2 });
    globalThis.fetch = server.fetch;
    const jobName = await submitWriter();
    const saved = [];
    // Simulate the tab closing while the judging job is running.
    const closeOnJudging = ({ stage }) => { if (stage === 'judging') { const e = new Error('tab closed'); e.cancelled = true; throw e; } };
    await expect(runBatchChain({ state: { stage: 'writing', jobName, model: MODEL, slots: SLOTS }, judge: true, deps: makeDeps(saved, { pollHook: closeOnJudging }) }))
      .rejects.toThrow('tab closed');
    expect(server.log.created).toHaveLength(2);

    // What survived in IndexedDB: the last saved pipeline + questions.
    const last = saved[saved.length - 1];
    const questions = saved.filter((s) => s.questions).pop().questions;
    expect(last.pipeline).toMatchObject({ stage: 'judging', jobName: 'batches/job-2' });
    expect(isResumableChain({ ...last.pipeline, chain: true })).toBe(true);

    const saved2 = [];
    const out = await runBatchChain({ state: { ...last.pipeline, slots: SLOTS, questions }, judge: true, deps: makeDeps(saved2) });
    expect(server.log.created.map((j) => j.name)).toEqual(['batches/job-1', 'batches/job-2', 'batches/job-3']); // only the editor job is new
    expect(out.questions).toHaveLength(2);
    expect(out.metrics.calls).toMatchObject({ writer: 4, solver: 3, judge: 3, editor: 1 });
  });

  test('closed between two stages (judging saved, job not yet submitted): resume submits it', async () => {
    const server = fakeBatchServer({ respond: respondDefault });
    globalThis.fetch = server.fetch;
    const questions = parseWriterResults([WRITER.W0, WRITER.W1, WRITER.W2, WRITER.W3], SLOTS);
    expect(questions).toHaveLength(3);
    const saved = [];
    const out = await runBatchChain({ state: { stage: 'judging', jobName: null, chain: true, model: MODEL, slots: SLOTS, questions }, judge: true, deps: makeDeps(saved) });
    expect(server.log.created.map((j) => j.n)).toEqual([6, 1]);
    expect(out.metrics).toMatchObject({ generated: 2, rejected: 1, fixed: 1 });
  });

  test('a failed judging job degrades: questions are offered unjudged, the set does not fail', async () => {
    const server = fakeBatchServer({ respond: respondDefault, failJobs: new Set(['batches/job-2']) });
    globalThis.fetch = server.fetch;
    const jobName = await submitWriter();
    const saved = [];
    const out = await runBatchChain({ state: { stage: 'writing', jobName, model: MODEL, slots: SLOTS }, judge: true, deps: makeDeps(saved) });
    expect(server.log.created).toHaveLength(2); // no editor job: nothing was judged "fix"
    expect(out.questions).toHaveLength(3);
    expect(out.questions.every((q) => q.judge.outcome === 'unjudged')).toBe(true);
    expect(out.metrics).toMatchObject({ judgeDegraded: true, judged: 0, unjudged: 3 });
  });

  test('a failed writer job fails the chain', async () => {
    const server = fakeBatchServer({ respond: respondDefault, failJobs: new Set(['batches/job-1']) });
    globalThis.fetch = server.fetch;
    const jobName = await submitWriter();
    await expect(runBatchChain({ state: { stage: 'writing', jobName, model: MODEL, slots: SLOTS }, judge: true, deps: makeDeps([]) }))
      .rejects.toThrow('quota exceeded');
  });

  test('writer job with nothing parseable fails with code no-questions', async () => {
    const server = fakeBatchServer({ respond: () => 'not json' });
    globalThis.fetch = server.fetch;
    const jobName = await submitWriter();
    await expect(runBatchChain({ state: { stage: 'writing', jobName, model: MODEL, slots: SLOTS }, judge: true, deps: makeDeps([]) }))
      .rejects.toMatchObject({ code: 'no-questions' });
  });

  test('judging off: no solver/judge job; only structurally broken items go to the editor', async () => {
    const broken = JSON.stringify({ question: 'Pick one W1', choices: ['A. same', 'B. same', 'C. other', 'D. more'], correct: 'A', explanation: 'x' });
    const server = fakeBatchServer({
      respond: (p) => (p.includes(EDITOR_MARKER) ? quiz('W1', { question: 'Repaired W1' }) : p.includes('W1') ? broken : respondDefault(p)),
    });
    globalThis.fetch = server.fetch;
    const jobName = await submitWriter();
    const out = await runBatchChain({ state: { stage: 'writing', jobName, model: MODEL, slots: SLOTS }, judge: false, deps: makeDeps([]) });
    expect(server.log.created.map((j) => j.n)).toEqual([4, 1]);
    expect(out.questions.map((q) => q.judge.outcome)).toEqual(['unjudged', 'pass', 'unjudged']);
    expect(out.questions[1].question).toBe('Repaired W1');
  });

  test('isResumableChain and request mapping', () => {
    expect(isResumableChain(null)).toBe(false);
    expect(isResumableChain({ stage: 'writing', jobName: 'batches/x' })).toBe(true); // pre-6b sets with a live job
    expect(isResumableChain({ stage: 'writing', chain: true })).toBe(false); // writer prompts are not stored
    expect(isResumableChain({ stage: 'judging', chain: true })).toBe(true);
    expect(isResumableChain({ stage: 'fixing', chain: true })).toBe(true);
    expect(isResumableChain({ stage: 'ready', chain: true })).toBe(true);
    expect(isResumableChain({ stage: 'judging' })).toBe(false);
    const qs = parseWriterResults([WRITER.W0, null, WRITER.W2], SLOTS);
    expect(qs.map((q) => q.slotIndex)).toEqual([0, 2]);
    const { requests, pending } = buildJudgingRequests(qs, SLOTS);
    expect(pending).toEqual([{ q: 0, kind: 'solver' }, { q: 0, kind: 'judge' }, { q: 1, kind: 'solver' }, { q: 1, kind: 'judge' }]);
    expect(requests[3].userPrompt).toContain('material W2');
    expect(requests[0].userPrompt).not.toContain('S3 fits'); // solver never sees the explanation
    expect(CHAIN_STAGE.READY).toBe('ready');
  });
});
