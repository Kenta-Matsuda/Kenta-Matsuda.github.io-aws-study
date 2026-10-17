// Client for the feedback collector backend (infra/feedback, issues #162 / #167).
//
// When FEEDBACK_API_URL (js/config.js) is empty the backend is treated as not
// deployed: isFeedbackApiEnabled() returns false, the feedback form shows an
// "unavailable" error with a copy-text fallback (#247) and votes stay local-only.
//
// Requests use Content-Type text/plain so the browser sends them as CORS
// "simple" requests (no preflight); the Lambda parses the body as JSON anyway.

import { FEEDBACK_API_URL } from './config.js';

const REQUEST_TIMEOUT_MS = 10000;
const UPLOAD_TIMEOUT_MS = 45000;
// Must stay under MAX_IMAGE_BYTES / MAX_IMAGES in infra/feedback/src/index.mjs.
const MAX_IMAGE_UPLOAD_BYTES = 1.4 * 1024 * 1024;
export const MAX_FEEDBACK_IMAGES = 3;
const VOTE_FLUSH_DELAY_MS = 3000;
const VOTE_BATCH_MAX = 50;

let pendingVotes = [];
let flushTimer = null;
let unloadHookInstalled = false;

function isLocalHost() {
  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  } catch {
    return false;
  }
}

function getBaseUrl() {
  // Tests (and local experiments) may override the configured URL.
  const override = typeof globalThis !== 'undefined' ? globalThis.__ASN_FEEDBACK_API_URL__ : undefined;
  if (typeof override === 'string') return override.trim().replace(/\/+$/, '');
  // Local dev servers and the test suite must not write into the production
  // table; set window.__ASN_FEEDBACK_API_URL__ to opt in explicitly.
  if (isLocalHost()) return '';
  return String(FEEDBACK_API_URL || '').trim().replace(/\/+$/, '');
}

export function isFeedbackApiEnabled() {
  return Boolean(getBaseUrl());
}

// Base URL ('' when disabled) for other collectors that share this backend
// (js/learningEvents.js posts to /events with the same conventions).
export function getFeedbackApiBaseUrl() {
  return getBaseUrl();
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Downscale and re-encode an attached image so it fits the backend limit.
// Re-encoding through a canvas also strips EXIF metadata such as GPS
// location before anything leaves the device. Resolves to base64 or null.
export async function encodeFeedbackImage(file) {
  try {
    const bitmap = await createImageBitmap(file);
    for (const [maxSide, quality] of [[1600, 0.85], [1280, 0.75], [960, 0.65]]) {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      // Browsers without WebP encoding silently return PNG; fall back to JPEG then.
      let blob = await canvasToBlob(canvas, 'image/webp', quality);
      if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      if (blob && blob.size <= MAX_IMAGE_UPLOAD_BYTES) return await blobToBase64(blob);
    }
    return null;
  } catch {
    return null;
  }
}

// POST the user's feedback. The backend stores it and files the GitHub issue
// itself, in the same request. Resolves to { ok: true, issueUrl } or
// { ok: false, error } — never rejects, so callers can branch on `ok`.
// `images` is a list of base64 strings from encodeFeedbackImage().
export async function sendFeedback({ category, text, lang, appVersion, page, elapsedMs, website = '', images = [] }) {
  const base = getBaseUrl();
  if (!base) return { ok: false, error: 'disabled' };

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutMs = images.length ? UPLOAD_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(`${base}/feedback`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({
        category, text, lang, appVersion, page, elapsedMs, website,
        images: images.map((data) => ({ data })),
      }),
      signal: controller?.signal,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    if (!res.ok || !data?.ok) return { ok: false, error: data?.error || `http_${res.status}` };
    return { ok: true, issueUrl: data.issueUrl || null };
  } catch {
    return { ok: false, error: 'network' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function flushVotes({ keepalive = false } = {}) {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  const base = getBaseUrl();
  if (!base || pendingVotes.length === 0) return;
  const events = pendingVotes.splice(0, VOTE_BATCH_MAX);
  // Fire-and-forget: vote analytics must never affect the voting UX.
  try {
    fetch(`${base}/votes`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ events }),
      keepalive,
    }).catch(() => {});
  } catch {
    // ignore
  }
  if (pendingVotes.length) flushVotes({ keepalive });
}

function installUnloadHook() {
  if (unloadHookInstalled || typeof document === 'undefined') return;
  unloadHookInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushVotes({ keepalive: true });
  });
}

// Queue a Good/Bad vote event; events are batched and sent a few seconds later
// (or immediately when the page is hidden). No-op when the backend is disabled.
export function queueVoteEvent({ targetType, targetId, action, value, meta }) {
  if (!isFeedbackApiEnabled()) return;
  pendingVotes.push({
    targetType: String(targetType || ''),
    targetId: String(targetId || ''),
    action: action === 'clear' ? 'clear' : 'set',
    value: String(value || ''),
    at: new Date().toISOString(),
    meta: meta && typeof meta === 'object' ? meta : {},
  });
  installUnloadHook();
  if (pendingVotes.length >= VOTE_BATCH_MAX) {
    flushVotes();
    return;
  }
  if (!flushTimer) flushTimer = setTimeout(() => flushVotes(), VOTE_FLUSH_DELAY_MS);
}
