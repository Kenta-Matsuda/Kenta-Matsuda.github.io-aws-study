/**
 * Gemini Batch job chain for the background mock exam (issue #225 design §6.1,
 * PR 6b / issue #241).
 *
 * The foreground generator (js/examGenerator.js) runs writer → solver + judge →
 * editor per question while the tab is open. The background (Batch) path runs
 * the same quality evaluation as a CHAIN of provider-side jobs, so it keeps
 * progressing while the browser is closed:
 *
 *   writing ──(writer job)──→ judging ──(solver + judge job)──→ fixing ──(editor job)──→ ready
 *
 * - Every stage boundary is persisted through `deps.save` before the next job is
 *   submitted, and every job name right after submission. On the next visit the
 *   chain resumes from the saved stage: it polls the saved job, or — when the
 *   page closed between two stages — rebuilds that stage's requests from the
 *   saved questions and submits them.
 * - Solver and judge go into ONE job (2 requests per question). The judge does
 *   not see the solver's answer (they run in parallel); decideVerdict combines
 *   the two exactly as in the foreground path.
 * - Failure policy (design §5): the writer job failing fails the set; a judging
 *   or fixing job failing never does — the questions are offered as unjudged /
 *   with their issues (`metrics.judgeDegraded`).
 *
 * Pure orchestration: network and storage are injected through `deps`, so the
 * state machine is unit-tested with a mocked fetch (tests/exam-batch-chain.spec.mjs).
 */

import { parseQuizResponse, appendMissingResourceRefs } from './quiz.js';
import {
  runDeterministicChecks,
  buildSolverPrompt,
  buildJudgePrompt,
  buildEditorPrompt,
  parseSolverResponse,
  parseJudgeResponse,
  decideVerdict,
  summarizeJudging,
  HARD_FLAGS,
} from './examJudge.js';

export const CHAIN_STAGE = Object.freeze({
  WRITING: 'writing',
  JUDGING: 'judging',
  FIXING: 'fixing',
  READY: 'ready',
});

/** Flags an edited item must not have to replace the original (same rule as the foreground path). */
const EDIT_BLOCKING_FLAGS = ['choice-count', 'duplicate-choices', 'all-of-the-above', 'missing-question', 'correct-index'];

/**
 * True when a saved pipeline can be picked up on boot: a chained set in a
 * judging / fixing stage (with or without a live job), or any stage with a
 * live job name, or one parked at "ready" before final assembly. A writing
 * stage without a job cannot be rebuilt (the writer
 * prompts are not stored) and is treated as interrupted.
 * @param {object|null|undefined} pipeline
 */
export function isResumableChain(pipeline) {
  if (!pipeline) return false;
  if (pipeline.jobName) return true;
  // READY too: the page may close after the last job but before final assembly
  // (callers only consider sets whose status is still in progress).
  return Boolean(pipeline.chain) && [CHAIN_STAGE.JUDGING, CHAIN_STAGE.FIXING, CHAIN_STAGE.READY].includes(pipeline.stage);
}

function slotAt(slots, q) {
  return (Array.isArray(slots) && Number.isInteger(q?.slotIndex) && slots[q.slotIndex]) || {};
}

function chainInfo(q) {
  return q?.judge && typeof q.judge === 'object' ? q.judge : {};
}

/**
 * Parse the writer job's texts into questions, attaching slot metadata and the
 * deterministic flags (design §8.1). Unparseable slots are skipped.
 * @param {(string|null)[]} texts
 * @param {object[]} slots  saved per-slot metadata (see buildChainSlot in js/ui.js)
 * @returns {object[]}
 */
export function parseWriterResults(texts, slots = []) {
  const questions = [];
  (texts || []).forEach((text, i) => {
    if (!text) return;
    const parsed = parseQuizResponse(text);
    if (!parsed) return;
    const slot = slots[i] || {};
    parsed.slotIndex = i;
    parsed.domainId = slot.domainId ?? null;
    parsed.taskId = slot.taskId ?? null;
    parsed.unitId = slot.unitId ?? null;
    const flags = runDeterministicChecks(parsed, {
      expectedLetter: slot.answerLetter,
      allowedUrls: Array.isArray(slot.allowedUrls) ? slot.allowedUrls : (slot.resources || []).map((r) => r.url),
    });
    parsed.judge = { outcome: 'pending', flags };
    questions.push(parsed);
  });
  return questions;
}

/**
 * Solver + judge requests, two per question. `pending[k]` says which question
 * and role request k belongs to, so results map back after a reload.
 * @returns {{ requests: Array<{systemPrompt:string,userPrompt:string}>, pending: Array<{q:number,kind:string}> }}
 */
export function buildJudgingRequests(questions, slots = []) {
  const requests = [];
  const pending = [];
  questions.forEach((q, k) => {
    const slot = slotAt(slots, q);
    requests.push(buildSolverPrompt(q));
    pending.push({ q: k, kind: 'solver' });
    requests.push(buildJudgePrompt({ question: q, material: slot.material || '', design: slot.design || '', level: slot.level || '' }));
    pending.push({ q: k, kind: 'judge' });
  });
  return { requests, pending };
}

function withVerdict(q, { judgeResult = null, solverLetter = null }) {
  const info = chainInfo(q);
  const flags = Array.isArray(info.flags) ? info.flags : [];
  const verdict = decideVerdict({ flags, judge: judgeResult, solverLetter, correctLetter: 'ABCD'[q.correctIndex] });
  return {
    ...q,
    judge: {
      outcome: verdict.outcome,
      score: verdict.score,
      scores: judgeResult?.scores || null,
      issues: verdict.issues,
      flags: verdict.flags,
      solverLetter,
      solverAgrees: verdict.solverAgrees,
      fixed: false,
      fixHint: judgeResult?.fix || '',
    },
  };
}

/**
 * Apply the solver + judge job results. Missing / unparseable responses leave
 * that question unjudged (or "fix" when it has a structural flag).
 * @param {{ questions: object[], pending: Array<{q:number,kind:string}>, texts: (string|null)[] }} opts
 * @returns {object[]}
 */
export function applyJudgingResults({ questions, pending = [], texts = [] }) {
  const solver = new Map();
  const judge = new Map();
  pending.forEach((p, i) => {
    const text = texts[i];
    if (!text) return;
    if (p.kind === 'solver') solver.set(p.q, parseSolverResponse(text).letter);
    else if (p.kind === 'judge') judge.set(p.q, parseJudgeResponse(text));
  });
  return questions.map((q, k) => withVerdict(q, { judgeResult: judge.get(k) || null, solverLetter: solver.get(k) || null }));
}

/** Verdicts from the deterministic flags only (judging disabled). */
export function applyVerdictsWithoutJudge(questions) {
  return questions.map((q) => withVerdict(q, {}));
}

/**
 * One editor request per question whose verdict is "fix".
 * @returns {{ requests: Array<{systemPrompt:string,userPrompt:string}>, pending: Array<{q:number,kind:string}> }}
 */
export function buildFixingRequests(questions, slots = []) {
  const requests = [];
  const pending = [];
  questions.forEach((q, k) => {
    const info = chainInfo(q);
    if (info.outcome !== 'fix') return;
    requests.push(buildEditorPrompt({ question: q, issues: info.issues || [], fix: info.fixHint || '', material: slotAt(slots, q).material || '' }));
    pending.push({ q: k, kind: 'editor' });
  });
  return { requests, pending };
}

/**
 * Apply the editor job results: an edit that passes the structural re-check
 * replaces the item (outcome → pass); a structurally broken item that could not
 * be repaired is rejected; anything else keeps its "fix" outcome and issues.
 * @param {{ questions: object[], slots?: object[], pending: Array<{q:number,kind:string}>, texts: (string|null)[] }} opts
 * @returns {object[]}
 */
export function applyFixingResults({ questions, slots = [], pending = [], texts = [] }) {
  const edits = new Map();
  pending.forEach((p, i) => { if (p.kind === 'editor' && texts[i]) edits.set(p.q, texts[i]); });
  return questions.map((q, k) => {
    const info = chainInfo(q);
    if (info.outcome !== 'fix') return q;
    const slot = slotAt(slots, q);
    const edited = edits.has(k) ? parseQuizResponse(edits.get(k)) : null;
    if (edited) {
      const editedFlags = runDeterministicChecks(edited, {
        expectedLetter: slot.answerLetter,
        allowedUrls: Array.isArray(slot.allowedUrls) ? slot.allowedUrls : (slot.resources || []).map((r) => r.url),
      });
      if (!editedFlags.some((f) => EDIT_BLOCKING_FLAGS.includes(f))) {
        return {
          ...q,
          question: edited.question,
          choices: edited.choices,
          correctIndex: edited.correctIndex,
          explanation: edited.explanation,
          judge: { ...info, outcome: 'pass', flags: editedFlags, fixed: true },
        };
      }
    }
    if ((info.flags || []).some((f) => HARD_FLAGS.has(f))) return { ...q, judge: { ...info, outcome: 'reject' } };
    return q;
  });
}

/**
 * Final assembly: drop rejected items, append the curated resource links the
 * explanation does not cite, and strip chain-internal fields.
 * @returns {{ questions: object[], rejected: number }}
 */
export function finalizeChainQuestions(questions, slots = [], { dropRejected = true } = {}) {
  let rejected = 0;
  const out = [];
  for (const q of questions) {
    const info = chainInfo(q);
    if (info.outcome === 'reject' && dropRejected) { rejected++; continue; }
    const { fixHint, ...judge } = info;
    out.push({
      ...q,
      explanation: appendMissingResourceRefs(q.explanation, slotAt(slots, q).resources || []),
      judge: info.outcome === 'pending' ? { ...judge, outcome: 'unjudged' } : judge,
    });
  }
  return { questions: out, rejected };
}

function hasFixes(questions) {
  return questions.some((q) => chainInfo(q).outcome === 'fix');
}

/**
 * Run (or resume) the chain until the set is ready.
 *
 * @param {object} opts
 * @param {{ stage: string, jobName?: string|null, model?: string, slots: object[], pending?: Array<{q:number,kind:string}>|null,
 *           questions?: object[], calls?: object, judgeDegraded?: boolean, rejected?: number }} opts.state
 *   the persisted pipeline plus the set's current questions
 * @param {boolean} [opts.judge=true]          run the solver + judge stage
 * @param {boolean} [opts.dropRejected=true]
 * @param {object} opts.deps
 * @param {(req: { requests: object[], displayName: string, stage: string }) => Promise<{ name: string, model?: string }>} opts.deps.submit
 * @param {(req: { name: string, total: number, stage: string }) => Promise<{ texts: (string|null)[], errors?: (string|null)[] }>} opts.deps.poll
 * @param {(patch: { pipeline: object, questions?: object[] }) => Promise<{ questions?: object[] }|null|void>} opts.deps.save
 *   persist a stage boundary; may return the stored questions (with ids) to continue with
 * @param {(stage: string) => void} [opts.deps.onStage]
 * @param {() => number} [opts.deps.now]
 * @returns {Promise<{ questions: object[], metrics: object }>}
 */
export async function runBatchChain({ state, judge = true, dropRejected = true, deps }) {
  const s = {
    stage: state.stage,
    jobName: state.jobName || null,
    model: state.model || null,
    slots: Array.isArray(state.slots) ? state.slots : [],
    pending: Array.isArray(state.pending) ? state.pending : null,
    questions: Array.isArray(state.questions) ? state.questions.slice() : [],
    calls: { writer: 0, solver: 0, judge: 0, editor: 0, ...(state.calls || {}) },
    judgeDegraded: Boolean(state.judgeDegraded),
    rejected: Number(state.rejected) || 0,
    submittedAt: state.submittedAt || null,
  };
  const now = deps.now || (() => Date.now());
  const pipelineOf = () => ({
    stage: s.stage, jobName: s.jobName, model: s.model, pending: s.pending, submittedAt: s.submittedAt || null,
    calls: s.calls, judgeDegraded: s.judgeDegraded, rejected: s.rejected,
  });
  const persist = async (patch, { withQuestions = false } = {}) => {
    Object.assign(s, patch);
    const stored = await deps.save({ pipeline: pipelineOf(), ...(withQuestions ? { questions: s.questions } : {}) });
    if (withQuestions && stored && Array.isArray(stored.questions) && stored.questions.length === s.questions.length) {
      s.questions = stored.questions;
    }
  };

  // Submit (if needed) and poll one evaluation stage. Never throws except on cancel:
  // a failed job degrades to "no results" (design §5 failure policy).
  const runEvaluationJob = async (stage, build) => {
    if (!s.jobName) {
      const { requests, pending } = build();
      if (!requests.length) return { texts: [], pending: [] };
      try {
        const job = await deps.submit({ requests, displayName: `${stage}-${now()}`, stage });
        await persist({ jobName: job.name, model: job.model || s.model, pending, submittedAt: new Date(now()).toISOString() });
      } catch (err) {
        if (err?.cancelled) throw err;
        s.judgeDegraded = true;
        return { texts: [], pending };
      }
    }
    try {
      const res = await deps.poll({ name: s.jobName, total: (s.pending || []).length, stage });
      return { texts: res?.texts || [], pending: s.pending || [] };
    } catch (err) {
      if (err?.cancelled) throw err;
      s.judgeDegraded = true;
      return { texts: [], pending: s.pending || [] };
    }
  };

  for (let guard = 0; guard < 8; guard++) {
    deps.onStage?.(s.stage);
    if (s.stage === CHAIN_STAGE.WRITING) {
      if (!s.jobName) throw new Error('writer batch job name is missing');
      const res = await deps.poll({ name: s.jobName, total: s.slots.length, stage: s.stage });
      if (!res || !Array.isArray(res.texts)) throw new Error('no results from the writer batch');
      s.calls.writer += res.texts.length;
      let questions = parseWriterResults(res.texts, s.slots);
      if (!questions.length) {
        const err = new Error('no parseable questions in the writer batch');
        err.code = 'no-questions';
        throw err;
      }
      let next = CHAIN_STAGE.JUDGING;
      if (!judge) {
        questions = applyVerdictsWithoutJudge(questions);
        next = hasFixes(questions) ? CHAIN_STAGE.FIXING : CHAIN_STAGE.READY;
      }
      s.questions = questions;
      await persist({ stage: next, jobName: null, pending: null }, { withQuestions: true });
      continue;
    }
    if (s.stage === CHAIN_STAGE.JUDGING) {
      const { texts, pending } = await runEvaluationJob(s.stage, () => buildJudgingRequests(s.questions, s.slots));
      s.calls.solver += pending.filter((p) => p.kind === 'solver').length;
      s.calls.judge += pending.filter((p) => p.kind === 'judge').length;
      s.questions = applyJudgingResults({ questions: s.questions, pending, texts });
      await persist({ stage: hasFixes(s.questions) ? CHAIN_STAGE.FIXING : CHAIN_STAGE.READY, jobName: null, pending: null }, { withQuestions: true });
      continue;
    }
    if (s.stage === CHAIN_STAGE.FIXING) {
      const { texts, pending } = await runEvaluationJob(s.stage, () => buildFixingRequests(s.questions, s.slots));
      s.calls.editor += pending.length;
      s.questions = applyFixingResults({ questions: s.questions, slots: s.slots, pending, texts });
      await persist({ stage: CHAIN_STAGE.READY, jobName: null, pending: null }, { withQuestions: true });
      continue;
    }
    if (s.stage === CHAIN_STAGE.READY) {
      const { questions, rejected } = finalizeChainQuestions(s.questions, s.slots, { dropRejected });
      s.questions = questions;
      s.rejected += rejected;
      await persist({ stage: CHAIN_STAGE.READY, jobName: null, pending: null }, { withQuestions: true });
      const judging = summarizeJudging(s.questions);
      return {
        questions: s.questions,
        metrics: {
          requested: s.slots.length,
          generated: s.questions.length,
          rejected: s.rejected,
          fixed: s.questions.filter((q) => q.judge?.fixed).length,
          judged: judging.judged,
          passed: judging.passed,
          unjudged: judging.unjudged,
          avgJudgeScore: judging.avgScore,
          judgeDegraded: s.judgeDegraded,
          calls: s.calls,
          background: true,
        },
      };
    }
    throw new Error(`unknown chain stage: ${s.stage}`);
  }
  throw new Error('job chain did not settle');
}
