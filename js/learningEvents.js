/**
 * Per-question learning events (issue #225, design §9).
 *
 * What a learner does with generated questions — generated, answered, set
 * completed — is recorded as small events keyed by ids only (set / question /
 * task / unit); question text never leaves the device. Events are kept in
 * IndexedDB and sent in batches to the feedback backend's `POST /events`
 * (infra/feedback) when that backend is configured, through the same
 * no-preflight `text/plain` JSON pattern as votes. Until then (localhost, or
 * FEEDBACK_API_URL empty) they just accumulate locally.
 *
 * Aggregation across users happens on `examId` + `unitId` / `taskId` (which
 * are stable), not on `questionId` (which is per device).
 */

import { getFeedbackApiBaseUrl } from './feedbackApi.js';

export const EVENT_TYPES = Object.freeze(['question_generated', 'question_shown', 'question_answered', 'question_voted', 'set_completed']);
export const EVENT_SCHEMA = 1;
const DB_NAME = 'asn-learning-events';
const DB_VERSION = 1;
const STORE = 'events';
const FLUSH_DELAY_MS = 5000;
const BATCH_MAX = 50;
const MAX_STORED = 5000;

function newId() {
  return `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── storage (IndexedDB with in-memory fallback) ───────────

function memoryBackend() {
  const store = new Map();
  return {
    kind: 'memory',
    async put(v) { store.set(v.id, v); },
    async all() { return [...store.values()]; },
    async remove(ids) { for (const id of ids) store.delete(id); },
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
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
  const tx = (mode) => db.transaction(STORE, mode).objectStore(STORE);
  return {
    kind: 'indexeddb',
    async put(v) { await idbRequest(tx('readwrite').put(v)); },
    async all() { return (await idbRequest(tx('readonly').getAll())) || []; },
    async remove(ids) { const s = tx('readwrite'); await Promise.all(ids.map((id) => idbRequest(s.delete(id)))); },
  };
}

let backendPromise = null;
function backend() {
  if (!backendPromise) {
    backendPromise = (typeof indexedDB !== 'undefined' && indexedDB ? idbBackend() : Promise.resolve(memoryBackend()))
      .catch(() => memoryBackend());
  }
  return backendPromise;
}

// ─── recording ──────────────────────────────────────────────

/**
 * Normalize to the wire schema (design §9). Unknown fields are dropped; ids are
 * strings; numbers are finite or omitted.
 * @param {object} e
 * @returns {object|null} null when the type is unknown
 */
export function normalizeLearningEvent(e) {
  if (!e || !EVENT_TYPES.includes(e.type)) return null;
  const str = (v) => (v === undefined || v === null || v === '' ? undefined : String(v).slice(0, 120));
  const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : undefined);
  const out = {
    type: e.type,
    at: e.at || new Date().toISOString(),
    schema: EVENT_SCHEMA,
    examId: str(e.examId),
    mode: str(e.mode),
    setId: str(e.setId),
    questionId: str(e.questionId),
    domainId: str(e.domainId),
    taskId: str(e.taskId),
    unitId: str(e.unitId),
    cardId: str(e.cardId),
    isCorrect: typeof e.isCorrect === 'boolean' ? e.isCorrect : undefined,
    userAnswer: num(e.userAnswer),
    elapsedMs: num(e.elapsedMs),
    judgeScore: num(e.judgeScore),
    score: num(e.score),
    total: num(e.total),
    value: e.value === 'good' || e.value === 'bad' ? e.value : undefined,
    reason: str(e.reason),
  };
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}

let flushTimer = null;
let unloadHookInstalled = false;
let sink = defaultSink;

/**
 * Record one event. Never throws; storage failures are logged.
 * @param {object} event
 * @returns {Promise<object|null>} the stored event
 */
export async function recordLearningEvent(event) {
  const normalized = normalizeLearningEvent(event);
  if (!normalized) return null;
  const stored = { id: newId(), ...normalized };
  try {
    const b = await backend();
    await b.put(stored);
    scheduleFlush();
  } catch (err) {
    console.warn('[learningEvents] record failed:', err);
  }
  return stored;
}

/** All locally stored (not yet sent) events, oldest first. */
export async function listPendingLearningEvents() {
  const all = await (await backend()).all();
  return all.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

export async function clearLearningEvents() {
  const b = await backend();
  await b.remove((await b.all()).map((e) => e.id));
}

// ─── sending ────────────────────────────────────────────────

/**
 * Replace the sink (tests / future transports). A sink receives an array of
 * events and resolves to true when they were accepted and can be deleted.
 * @param {(events: object[]) => Promise<boolean>} fn
 */
export function setLearningEventSink(fn) {
  sink = typeof fn === 'function' ? fn : defaultSink;
}

// Default sink: the feedback backend's /events route (design §9), only when
// that backend is configured. Resolves false (keep the events) otherwise.
async function defaultSink(events, { keepalive = false } = {}) {
  const base = getFeedbackApiBaseUrl();
  if (!base) return false;
  try {
    const res = await fetch(`${base}/events`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ events: events.map(({ id, ...rest }) => rest) }),
      keepalive,
    });
    return res.ok;
  } catch {
    return false;
  }
}

function scheduleFlush() {
  installUnloadHook();
  if (flushTimer) return;
  flushTimer = setTimeout(() => { flushTimer = null; flushLearningEvents().catch(() => {}); }, FLUSH_DELAY_MS);
}

function installUnloadHook() {
  if (unloadHookInstalled || typeof document === 'undefined') return;
  unloadHookInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushLearningEvents({ keepalive: true }).catch(() => {});
  });
}

/**
 * Send pending events in batches; accepted batches are deleted locally.
 * Also trims the local store to the newest MAX_STORED when nothing can be sent.
 * @returns {Promise<{ sent: number, pending: number }>}
 */
export async function flushLearningEvents({ keepalive = false } = {}) {
  const b = await backend();
  let pending = await listPendingLearningEvents();
  let sent = 0;
  while (pending.length) {
    const batch = pending.slice(0, BATCH_MAX);
    let ok = false;
    try { ok = await sink(batch, { keepalive }); } catch { ok = false; }
    if (!ok) break;
    await b.remove(batch.map((e) => e.id));
    sent += batch.length;
    pending = pending.slice(BATCH_MAX);
  }
  if (pending.length > MAX_STORED) {
    await b.remove(pending.slice(0, pending.length - MAX_STORED).map((e) => e.id));
    pending = pending.slice(pending.length - MAX_STORED);
  }
  return { sent, pending: pending.length };
}
