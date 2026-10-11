/**
 * Exam sets and attempts, persisted in IndexedDB (issue #225, design §7).
 *
 * An ExamSet is a generated (or imported) set of questions; an Attempt is one
 * run through a set. They are separate so that
 *   - a question is saved the moment it is generated, before anyone answers it
 *     (previously nothing was saved until the whole session was finished),
 *   - a set that was interrupted mid-generation keeps the questions it has and
 *     can be resumed or started as a partial set,
 *   - the same set can be retaken, and per-question statistics can accumulate.
 *
 * IndexedDB rather than localStorage: a 65-question set with explanations is
 * 100–200 KB, so the 5 MB localStorage budget would fill after 20–30 sets.
 * When IndexedDB is unavailable (private mode, old browsers, tests in Node),
 * everything falls back to an in-memory store so callers never have to branch.
 *
 * The legacy `quizHistory` in localStorage keeps being written by the quiz UI
 * for now (history modal, CSV export, smart review depend on it).
 */

const DB_NAME = 'asn-exam-sets';
const DB_VERSION = 1;
const SETS = 'examSets';
const ATTEMPTS = 'attempts';

export const SET_STATUS = Object.freeze({
  PLANNING: 'planning',
  GENERATING: 'generating',
  JUDGING: 'judging',
  READY: 'ready',
  PARTIAL: 'partial',
  FAILED: 'failed',
});

/** Statuses in which a pipeline is (or was) still producing questions. */
const IN_PROGRESS = new Set([SET_STATUS.PLANNING, SET_STATUS.GENERATING, SET_STATUS.JUDGING]);

function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

// ─── Storage backends ───────────────────────────────────────

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

/** In-memory backend with the same tiny interface as the IDB backend. */
function memoryBackend() {
  const stores = { [SETS]: new Map(), [ATTEMPTS]: new Map() };
  return {
    kind: 'memory',
    async get(store, id) { return stores[store].get(id) ?? null; },
    async put(store, value) { stores[store].set(value.id, value); return value; },
    async delete(store, id) { stores[store].delete(id); },
    async all(store) { return [...stores[store].values()]; },
  };
}

function idbRequest(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbBackend() {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(SETS)) {
        const s = d.createObjectStore(SETS, { keyPath: 'id' });
        s.createIndex('examId', 'examId');
        s.createIndex('status', 'status');
        s.createIndex('updatedAt', 'updatedAt');
      }
      if (!d.objectStoreNames.contains(ATTEMPTS)) {
        const a = d.createObjectStore(ATTEMPTS, { keyPath: 'id' });
        a.createIndex('setId', 'setId');
        a.createIndex('examId', 'examId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
  const tx = (store, mode) => db.transaction(store, mode).objectStore(store);
  return {
    kind: 'indexeddb',
    async get(store, id) { return (await idbRequest(tx(store, 'readonly').get(id))) ?? null; },
    async put(store, value) { await idbRequest(tx(store, 'readwrite').put(value)); return value; },
    async delete(store, id) { await idbRequest(tx(store, 'readwrite').delete(id)); },
    async all(store) { return (await idbRequest(tx(store, 'readonly').getAll())) || []; },
  };
}

let backendPromise = null;

function backend() {
  if (!backendPromise) {
    backendPromise = (hasIndexedDb() ? idbBackend() : Promise.resolve(memoryBackend()))
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[examSets] IndexedDB unavailable, using in-memory store:', err);
        return memoryBackend();
      });
  }
  return backendPromise;
}

/** Which backend is active ('indexeddb' | 'memory'); mainly for diagnostics/tests. */
export async function getExamSetStorageKind() {
  return (await backend()).kind;
}

// ─── Exam sets ──────────────────────────────────────────────

/**
 * @typedef {object} ExamSet
 * @property {string} id
 * @property {string} examId
 * @property {string} mode            'single' | 'quick5' | 'speed' | 'mock'
 * @property {string} source          'ai' | 'batch' | 'daily' | 'offline' | 'smartReview'
 * @property {string} title
 * @property {string} status          one of SET_STATUS
 * @property {number} requested       number of questions asked for
 * @property {object[]} questions     appended as generated
 * @property {object} pipeline        { stage, jobName?, provider?, model?, attempts }
 * @property {object} metrics
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * Create a set. Pass `questions` for imported sets (daily / offline / smart
 * review), which start as READY.
 * @returns {Promise<ExamSet>}
 */
export async function createExamSet({ examId, mode, source = 'ai', title = '', requested = 0, questions = [], profile = null, blueprint = null, plan = null, pipeline = {} }) {
  const ts = nowIso();
  const set = {
    id: newId('set'),
    examId: String(examId || ''),
    mode: String(mode || 'single'),
    source,
    title: String(title || ''),
    profile,
    status: questions.length ? SET_STATUS.READY : SET_STATUS.GENERATING,
    requested: Number(requested) || questions.length,
    questions: questions.map((q, i) => normalizeQuestion(q, i)),
    blueprint,
    plan,
    pipeline: { stage: questions.length ? 'ready' : 'writing', attempts: 0, ...pipeline },
    metrics: {},
    createdAt: ts,
    updatedAt: ts,
  };
  return (await backend()).put(SETS, set);
}

function normalizeQuestion(q, slotIndex) {
  return {
    id: q.id || newId('q'),
    slotIndex: Number.isInteger(q.slotIndex) ? q.slotIndex : slotIndex,
    question: String(q.question || ''),
    choices: Array.isArray(q.choices) ? q.choices.map((c) => String(c ?? '')) : [],
    correctIndex: Number.isInteger(q.correctIndex) ? q.correctIndex : -1,
    explanation: String(q.explanation || ''),
    domainId: q.domainId ?? null,
    taskId: q.taskId ?? null,
    unitId: q.unitId ?? null,
    sources: Array.isArray(q.sources) ? q.sources.slice() : [],
    judge: q.judge ?? null,
    generatedAt: q.generatedAt || nowIso(),
  };
}

/** @returns {Promise<ExamSet|null>} */
export async function getExamSet(setId) {
  if (!setId) return null;
  return (await backend()).get(SETS, setId);
}

/**
 * Append one generated question. Returns the stored question (with id).
 * @returns {Promise<object|null>}
 */
export async function appendExamSetQuestion(setId, question) {
  const b = await backend();
  const set = await b.get(SETS, setId);
  if (!set) return null;
  const stored = normalizeQuestion(question, set.questions.length);
  set.questions.push(stored);
  set.updatedAt = nowIso();
  await b.put(SETS, set);
  return stored;
}

/**
 * Shallow-merge a patch (status / pipeline / metrics / title …).
 * `pipeline` and `metrics` are merged one level deep.
 * @returns {Promise<ExamSet|null>}
 */
export async function updateExamSet(setId, patch) {
  const b = await backend();
  const set = await b.get(SETS, setId);
  if (!set) return null;
  const next = { ...set, ...patch, updatedAt: nowIso() };
  if (patch.pipeline) next.pipeline = { ...set.pipeline, ...patch.pipeline };
  if (patch.metrics) next.metrics = { ...set.metrics, ...patch.metrics };
  await b.put(SETS, next);
  return next;
}

/**
 * Mark a set finished: READY when all requested questions exist, PARTIAL when
 * some do, FAILED when none.
 */
export async function finalizeExamSet(setId, extra = {}) {
  const set = await getExamSet(setId);
  if (!set) return null;
  return updateExamSet(setId, { status: finishedStatusFor(set), pipeline: { stage: 'ready' }, ...extra });
}

/**
 * The finished status a set deserves from its question count (pure).
 * @param {{ questions?: object[], requested?: number }} set
 * @returns {string}
 */
export function finishedStatusFor(set) {
  const n = set?.questions?.length || 0;
  if (n === 0) return SET_STATUS.FAILED;
  return n >= (set.requested || n) ? SET_STATUS.READY : SET_STATUS.PARTIAL;
}

/**
 * List sets, newest first.
 * @param {{ examId?: string, status?: string|string[] }} [filter]
 * @returns {Promise<ExamSet[]>}
 */
export async function listExamSets(filter = {}) {
  const all = await (await backend()).all(SETS);
  const statuses = filter.status ? new Set([].concat(filter.status)) : null;
  return all
    .filter((s) => (!filter.examId || s.examId === filter.examId) && (!statuses || statuses.has(s.status)))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

/** Delete a set and its attempts. */
export async function deleteExamSet(setId) {
  const b = await backend();
  const attempts = (await b.all(ATTEMPTS)).filter((a) => a.setId === setId);
  for (const a of attempts) await b.delete(ATTEMPTS, a.id);
  await b.delete(SETS, setId);
}

/**
 * Boot-time cleanup: a set still marked in-progress after a reload was
 * interrupted (no pipeline runs across page loads yet). Sets that carry a
 * provider-side job name are left alone for the resume logic (design §6.1).
 * @returns {Promise<ExamSet[]>} the sets whose status changed
 */
export async function markInterruptedExamSets() {
  const changed = [];
  for (const set of await listExamSets()) {
    if (!IN_PROGRESS.has(set.status) || set.pipeline?.jobName) continue;
    changed.push(await updateExamSet(set.id, { status: finishedStatusFor(set), pipeline: { stage: 'interrupted' } }));
  }
  return changed;
}

/**
 * Display summary (pure).
 * @param {ExamSet} set
 * @returns {{ done: number, requested: number, progress: number, inProgress: boolean, startable: boolean }}
 */
export function summarizeExamSet(set) {
  const done = set?.questions?.length || 0;
  const requested = Math.max(set?.requested || 0, done);
  return {
    done,
    requested,
    progress: requested ? done / requested : 0,
    inProgress: IN_PROGRESS.has(set?.status),
    startable: done > 0 && !IN_PROGRESS.has(set?.status),
  };
}

// ─── Attempts ───────────────────────────────────────────────

/**
 * @returns {Promise<{ id: string, setId: string, examId: string, mode: string, startedAt: string, finishedAt: string|null, answers: object[], score: number|null }>}
 */
export async function createAttempt({ setId, examId, mode }) {
  const attempt = {
    id: newId('att'),
    setId: String(setId || ''),
    examId: String(examId || ''),
    mode: String(mode || ''),
    startedAt: nowIso(),
    finishedAt: null,
    answers: [],
    score: null,
    maxCombo: 0,
    xpEarned: 0,
  };
  return (await backend()).put(ATTEMPTS, attempt);
}

export async function recordAttemptAnswer(attemptId, { questionId, userAnswer, isCorrect, elapsedMs = null, xpEarned = 0 }) {
  const b = await backend();
  const attempt = await b.get(ATTEMPTS, attemptId);
  if (!attempt) return null;
  attempt.answers.push({
    questionId: String(questionId || ''),
    userAnswer: Number.isInteger(userAnswer) ? userAnswer : -1,
    isCorrect: Boolean(isCorrect),
    elapsedMs: Number.isFinite(elapsedMs) ? elapsedMs : null,
    xpEarned: Number(xpEarned) || 0,
    answeredAt: nowIso(),
  });
  attempt.xpEarned += Number(xpEarned) || 0;
  return b.put(ATTEMPTS, attempt);
}

export async function finishAttempt(attemptId, { maxCombo = 0 } = {}) {
  const b = await backend();
  const attempt = await b.get(ATTEMPTS, attemptId);
  if (!attempt) return null;
  const answered = attempt.answers.filter((a) => a.userAnswer >= 0);
  attempt.finishedAt = nowIso();
  attempt.maxCombo = Number(maxCombo) || 0;
  attempt.score = attempt.answers.length ? answered.filter((a) => a.isCorrect).length / attempt.answers.length : null;
  return b.put(ATTEMPTS, attempt);
}

/**
 * @param {{ setId?: string, examId?: string }} [filter]
 */
export async function listAttempts(filter = {}) {
  const all = await (await backend()).all(ATTEMPTS);
  return all
    .filter((a) => (!filter.setId || a.setId === filter.setId) && (!filter.examId || a.examId === filter.examId))
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

/** Remove everything (used by "reset app data"). */
export async function clearExamSetStorage() {
  const b = await backend();
  for (const s of await b.all(SETS)) await b.delete(SETS, s.id);
  for (const a of await b.all(ATTEMPTS)) await b.delete(ATTEMPTS, a.id);
}
