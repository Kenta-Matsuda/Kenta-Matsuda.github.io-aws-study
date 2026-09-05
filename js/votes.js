const VOTE_STORAGE_KEY = 'asn_votes_v1';

function safeLocalStorageGetItem(key) {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSetItem(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeParseJson(raw) {
  try {
    const parsed = JSON.parse(String(raw || ''));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function loadVoteState() {
  const raw = safeLocalStorageGetItem(VOTE_STORAGE_KEY);
  const parsed = safeParseJson(raw);
  if (!parsed) return { schemaVersion: 1, votes: {} };
  if (parsed.schemaVersion !== 1) return { schemaVersion: 1, votes: {} };
  if (!parsed.votes || typeof parsed.votes !== 'object') parsed.votes = {};
  return parsed;
}

function saveVoteState(state) {
  safeLocalStorageSetItem(VOTE_STORAGE_KEY, JSON.stringify(state));
}

function normalizeTargetId(targetId) {
  return String(targetId || '').trim();
}

function makeVoteKey({ targetType, targetId }) {
  const t = String(targetType || '').trim() || 'unknown';
  const id = normalizeTargetId(targetId);
  return `${t}|${id}`;
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

  return { ok: true, cleared: true, previous: existing };
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

  return { ok: true, updated, previous: existing ?? null };
}
