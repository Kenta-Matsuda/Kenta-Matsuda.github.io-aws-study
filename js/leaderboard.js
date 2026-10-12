/**
 * Opt-in global XP leaderboard client (issue #32).
 *
 * Participation is off by default. When the learner turns on "ランキングに参加"
 * the app generates an anonymous random token (no account) and, from then on,
 * forwards every applied XP award (js/storage.js addXp -> onXpAwarded) to the
 * feedback backend's `POST /leaderboard/xp` together with the current user
 * name. Awards are accumulated locally and sent in debounced batches; each
 * batch carries a batchId that is persisted before sending, so a retry after a
 * lost response is idempotent on the server. Reading the ranking
 * (`GET /leaderboard`) needs no participation.
 *
 * Same transport conventions as js/learningEvents.js: text/plain JSON (no CORS
 * preflight), and a no-op when the backend is not configured (FEEDBACK_API_URL
 * empty, or localhost without window.__ASN_FEEDBACK_API_URL__).
 */

import { getFeedbackApiBaseUrl } from './feedbackApi.js';
import { getUserName, onXpAwarded } from './storage.js';

export const LEADERBOARD_PERIODS = Object.freeze(['daily', 'weekly', 'monthly', 'all']);
// Mirrors MAX_XP_PER_REQUEST / MAX_XP_PER_DAY in infra/feedback/src/leaderboard.mjs.
export const MAX_XP_PER_REQUEST = 1000;
export const MAX_XP_PER_DAY = 5000;

const STORAGE_KEY = 'asn_leaderboard_v1';
// One request per ~2 minutes of activity at most (plus a flush when the page is
// hidden): each accepted batch costs one 6-item DynamoDB transaction.
const DEFAULT_FLUSH_DELAY_MS = 120000;
const REQUEST_TIMEOUT_MS = 10000;
const MAX_BATCHES_PER_FLUSH = 10;
const RETRY_BASE_MS = 30000;
const RETRY_MAX_MS = 10 * 60 * 1000;

function emptyState() {
  return { optIn: false, token: '', publicId: '', pending: 0, inflight: null, leaveToken: '' };
}

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed && typeof parsed === 'object') return { ...emptyState(), ...parsed };
  } catch { /* fall through */ }
  return emptyState();
}

function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full / blocked */ }
}

function flushDelayMs() {
  const override = Number(globalThis.__ASN_LEADERBOARD_FLUSH_DELAY_MS__);
  return Number.isFinite(override) && override >= 0 ? override : DEFAULT_FLUSH_DELAY_MS;
}

function randomHex(bytes) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

function newBatchId() {
  return `b_${Date.now().toString(36)}_${randomHex(6)}`;
}

/** Public id the server derives from a token: sha256("lb|" + token), first 20 hex chars. */
export async function computePublicId(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`lb|${token}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 20);
}

/** True when the backend URL is configured (the leaderboard can be shown / joined). */
export function isLeaderboardAvailable() {
  return Boolean(getFeedbackApiBaseUrl());
}

export function isLeaderboardParticipating() {
  const s = load();
  return Boolean(s.optIn && s.token);
}

/** Public id of this device while participating ('' otherwise or not yet computed). */
export function getLeaderboardPublicId() {
  const s = load();
  return s.optIn ? String(s.publicId || '') : '';
}

async function postJson(path, body, { keepalive = false } = {}) {
  const base = getFeedbackApiBaseUrl();
  if (!base) throw new Error('leaderboard_disabled');
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS) : null;
  try {
    return await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(body),
      keepalive,
      signal: ctrl?.signal,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const isPermanentRejection = (status) => status >= 400 && status < 500 && status !== 429;

/**
 * Join or leave the leaderboard.
 * Joining only flips the local flag (XP earned from now on is sent). Leaving
 * stops sending, discards unsent XP, forgets the token (re-joining starts a new
 * anonymous identity) and asks the server to remove this participant from the
 * current rankings; if the server cannot be reached the removal is retried on
 * a later flush.
 * @returns {Promise<{ participating: boolean, removed?: boolean }>}
 */
export async function setLeaderboardParticipation(on) {
  const s = load();
  if (on) {
    if (!s.token) {
      s.token = randomHex(16);
      s.publicId = '';
    }
    s.optIn = true;
    save(s);
    if (!s.publicId) {
      try {
        const publicId = await computePublicId(s.token);
        const latest = load();
        if (latest.token === s.token) save({ ...latest, publicId });
      } catch { /* filled from the server response later */ }
    }
    return { participating: true };
  }

  const leaveToken = s.token || s.leaveToken || '';
  save({ ...emptyState(), leaveToken });
  const removed = leaveToken ? await sendPendingLeave() : true;
  return { participating: false, removed };
}

async function sendPendingLeave() {
  const { leaveToken } = load();
  if (!leaveToken || !isLeaderboardAvailable()) return false;
  try {
    const res = await postJson('/leaderboard/leave', { token: leaveToken });
    if (res.ok || isPermanentRejection(res.status)) {
      const latest = load();
      if (latest.leaveToken === leaveToken) save({ ...latest, leaveToken: '' });
      return res.ok;
    }
  } catch { /* offline: keep leaveToken for the next flush */ }
  return false;
}

// ─── sending XP ─────────────────────────────────────────────

let flushTimer = null;
let flushing = null;
let failures = 0;

/** Add applied XP to the outgoing queue (no-op unless participating and configured). */
export function queueLeaderboardXp(amount) {
  const xp = Math.floor(Number(amount));
  if (!(xp > 0) || !isLeaderboardAvailable()) return false;
  const s = load();
  if (!s.optIn || !s.token) return false;
  // More than a day's cap can never be accepted in one sitting; don't hoard.
  s.pending = Math.min(MAX_XP_PER_DAY, Number(s.pending || 0) + xp);
  save(s);
  scheduleFlush(flushDelayMs());
  return true;
}

function scheduleFlush(delay) {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushLeaderboard().catch(() => {});
  }, delay);
}

/**
 * Send queued XP now. Only one flush runs at a time.
 * @returns {Promise<{ sent: number, pending: number }>}
 */
export function flushLeaderboard({ keepalive = false } = {}) {
  if (!flushing) flushing = doFlush({ keepalive }).finally(() => { flushing = null; });
  return flushing;
}

async function doFlush({ keepalive }) {
  if (!isLeaderboardAvailable()) return { sent: 0, pending: load().pending || 0 };
  if (load().leaveToken) await sendPendingLeave();

  let sent = 0;
  for (let i = 0; i < MAX_BATCHES_PER_FLUSH; i += 1) {
    const s = load();
    if (!s.optIn || !s.token) break;
    if (!s.inflight) {
      if (!(s.pending > 0)) break;
      // Persist the batch (with its id) before sending so a retry reuses it.
      const xp = Math.min(s.pending, MAX_XP_PER_REQUEST);
      s.inflight = { batchId: newBatchId(), xp };
      s.pending -= xp;
      save(s);
    }
    const { token, inflight } = s;
    let status = 0;
    let data = null;
    try {
      const res = await postJson('/leaderboard/xp', { token, name: getUserName(), xp: inflight.xp, batchId: inflight.batchId }, { keepalive });
      status = res.status;
      if (res.ok) data = await res.json().catch(() => null);
    } catch {
      status = 0;
    }
    if (status === 0 || status === 429 || status >= 500) {
      failures += 1;
      scheduleFlush(Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** (failures - 1)));
      break;
    }
    failures = 0;
    // Accepted, duplicate, capped or permanently rejected: the batch is done.
    const latest = load();
    if (latest.inflight?.batchId === inflight.batchId) latest.inflight = null;
    if (data?.id && latest.token === token) latest.publicId = data.id;
    save(latest);
    if (status >= 200 && status < 300) sent += Number(data?.accepted ?? inflight.xp) || 0;
  }
  return { sent, pending: load().pending || 0 };
}

// ─── reading ────────────────────────────────────────────────

/**
 * Fetch one period of the ranking.
 * @param {'daily'|'weekly'|'monthly'|'all'} period
 * @returns {Promise<{ period: string, periodKey: string, periodStart: string|null, periodEnd: string|null,
 *   participants: number, entries: { rank: number, id: string, name: string, xp: number }[],
 *   me: { rank: number, id: string, name: string, xp: number }|null, myId: string }>}
 */
export async function fetchLeaderboard(period, { limit = 50 } = {}) {
  const base = getFeedbackApiBaseUrl();
  if (!base) throw new Error('leaderboard_disabled');
  if (!LEADERBOARD_PERIODS.includes(period)) throw new Error('invalid_period');
  let myId = getLeaderboardPublicId();
  if (!myId && isLeaderboardParticipating()) {
    try {
      myId = await computePublicId(load().token);
      save({ ...load(), publicId: myId });
    } catch { myId = ''; }
  }
  const params = new URLSearchParams({ period, limit: String(limit) });
  if (myId) params.set('me', myId);
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS) : null;
  try {
    const res = await fetch(`${base}/leaderboard?${params}`, { signal: ctrl?.signal });
    if (!res.ok) throw new Error(`leaderboard_http_${res.status}`);
    const data = await res.json();
    return { ...data, entries: Array.isArray(data?.entries) ? data.entries : [], myId };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ─── wiring ─────────────────────────────────────────────────

let initialized = false;

/** Hook XP awards and page-hide flushing. Safe to call more than once. */
export function initLeaderboard() {
  if (initialized) return;
  initialized = true;
  onXpAwarded(({ amount }) => queueLeaderboardXp(amount));
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushLeaderboard({ keepalive: true }).catch(() => {});
    });
  }
  const s = load();
  if (isLeaderboardAvailable() && (s.leaveToken || (s.optIn && (s.pending > 0 || s.inflight)))) {
    scheduleFlush(flushDelayMs());
  }
}
