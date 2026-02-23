const VOTE_STORAGE_KEY = 'asn_votes_v1';

function safeParseJson(raw) {
  try {
    const parsed = JSON.parse(String(raw || ''));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function loadVoteState() {
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(VOTE_STORAGE_KEY) : null;
  const parsed = safeParseJson(raw);
  if (!parsed) return { schemaVersion: 1, votes: {} };
  if (parsed.schemaVersion !== 1) return { schemaVersion: 1, votes: {} };
  if (!parsed.votes || typeof parsed.votes !== 'object') parsed.votes = {};
  return parsed;
}

function saveVoteState(state) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(VOTE_STORAGE_KEY, JSON.stringify(state));
}

function normalizeTargetId(targetId) {
  return String(targetId || '').trim();
}

function makeVoteKey({ targetType, targetId }) {
  const t = String(targetType || '').trim() || 'unknown';
  const id = normalizeTargetId(targetId);
  return `${t}|${id}`;
}

function computeVoteDeltas(prevValue, nextValue) {
  const prev = prevValue === 'good' || prevValue === 'bad' ? prevValue : null;
  const next = nextValue === 'good' || nextValue === 'bad' ? nextValue : null;

  let voteGoodDelta = 0;
  let voteBadDelta = 0;

  // Remove previous state
  if (prev === 'good') voteGoodDelta -= 1;
  if (prev === 'bad') voteBadDelta -= 1;

  // Apply next state
  if (next === 'good') voteGoodDelta += 1;
  if (next === 'bad') voteBadDelta += 1;

  // Convenience score: good=+1, bad=-1
  const voteScoreDelta = voteGoodDelta - voteBadDelta;

  return {
    prev,
    next,
    voteGoodDelta,
    voteBadDelta,
    voteScoreDelta,
  };
}

export function getExistingVote({ targetType, targetId }) {
  const id = normalizeTargetId(targetId);
  if (!id) return null;
  const s = loadVoteState();
  const key = makeVoteKey({ targetType, targetId: id });
  const v = s.votes[key];
  if (!v || typeof v !== 'object') return null;
  const value = String(v.value || '');
  return value === 'good' || value === 'bad' ? value : null;
}

export function clearVote({ targetType, targetId, meta }) {
  const id = normalizeTargetId(targetId);
  if (!id) return { ok: false, reason: 'missing_target_id' };

  const existing = getExistingVote({ targetType, targetId: id });
  if (!existing) return { ok: true, cleared: false };

  const s = loadVoteState();
  const key = makeVoteKey({ targetType, targetId: id });
  if (s.votes && typeof s.votes === 'object') {
    delete s.votes[key];
  }
  saveVoteState(s);

  const deltas = computeVoteDeltas(existing, null);
  const gaParams = {
    target_type: String(targetType || ''),
    target_id: id,
    prev_value: deltas.prev,
    next_value: deltas.next,
    vote_good_delta: deltas.voteGoodDelta,
    vote_bad_delta: deltas.voteBadDelta,
    vote_score_delta: deltas.voteScoreDelta,
    ...((meta && typeof meta === 'object') ? meta : {}),
  };
  sendGaEvent('vote_clear', gaParams);

  return { ok: true, cleared: true, previous: existing };
}

function sendGaEvent(eventName, params) {
  try {
    if (typeof window === 'undefined') return;
    const gtag = window.gtag;
    if (typeof gtag !== 'function') return;
    gtag('event', eventName, params);
  } catch {
    // ignore
  }
}

export function submitVote({ targetType, targetId, value, meta }) {
  const id = normalizeTargetId(targetId);
  const v = String(value || '').trim();
  if (!id) return { ok: false, reason: 'missing_target_id' };
  if (v !== 'good' && v !== 'bad') return { ok: false, reason: 'invalid_value' };

  const existing = getExistingVote({ targetType, targetId: id });
  if (existing && existing === v) {
    return { ok: true, updated: false, existing };
  }

  const s = loadVoteState();
  const key = makeVoteKey({ targetType, targetId: id });
  s.votes[key] = {
    value: v,
    at: new Date().toISOString(),
    meta: meta && typeof meta === 'object' ? meta : undefined,
  };
  saveVoteState(s);

  const updated = Boolean(existing && existing !== v);
  const eventName = v === 'good' ? 'vote_good' : 'vote_bad';
  const deltas = computeVoteDeltas(existing, v);
  const gaParams = {
    target_type: String(targetType || ''),
    target_id: id,
    is_update: updated,
    prev_value: deltas.prev,
    next_value: deltas.next,
    vote_good_delta: deltas.voteGoodDelta,
    vote_bad_delta: deltas.voteBadDelta,
    vote_score_delta: deltas.voteScoreDelta,
    ...((meta && typeof meta === 'object') ? meta : {}),
  };
  sendGaEvent(eventName, gaParams);

  return { ok: true, updated, previous: existing ?? null };
}
