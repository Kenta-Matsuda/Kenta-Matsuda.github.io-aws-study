import { getMilestoneStatus, getNewlyUnlockedMilestones } from './milestones.js';

const API_KEY_STORAGE_KEY = 'gemini_api_key';

const STUDY_STATE_STORAGE_KEY = 'asn_study_state_v1';

export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function saveApiKeyFromInput({ inputEl, messageEl, onSuccess }) {
  const key = (inputEl.value || '').trim();

  if (!key) {
    showMessage(messageEl, 'APIキーを入力してください。', 'text-red-500');
    return;
  }

  localStorage.setItem(API_KEY_STORAGE_KEY, key);
  showMessage(messageEl, 'APIキーを保存しました。', 'text-green-500');
  onSuccess?.();
}

export function clearApiKey({ inputEl, messageEl }) {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
  inputEl.value = '';
  showMessage(messageEl, 'APIキーを削除しました。', 'text-gray-500');
}

function getLocalDayString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dayDiff(fromDayString, toDayString) {
  // from/to are YYYY-MM-DD in local time
  const [fy, fm, fd] = String(fromDayString || '').split('-').map((v) => Number(v));
  const [ty, tm, td] = String(toDayString || '').split('-').map((v) => Number(v));
  if (!fy || !fm || !fd || !ty || !tm || !td) return 0;

  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / 86400000);
}

function ensureWeekRing(week, todayDay) {
  const defaultWeek = {
    baseDay: todayDay,
    baseIndex: 0,
    buckets: [0, 0, 0, 0, 0, 0, 0],
  };

  if (!week || typeof week !== 'object') return { ...defaultWeek };
  const baseDay = typeof week.baseDay === 'string' ? week.baseDay : todayDay;
  const baseIndex = Number.isFinite(week.baseIndex) ? week.baseIndex : 0;
  const buckets = Array.isArray(week.buckets) ? week.buckets.map((n) => Number(n || 0)) : null;
  if (!buckets || buckets.length !== 7) return { ...defaultWeek };

  const out = { baseDay, baseIndex: ((baseIndex % 7) + 7) % 7, buckets };
  const delta = dayDiff(out.baseDay, todayDay);
  if (delta <= 0) return out;

  if (delta >= 7) {
    out.baseDay = todayDay;
    out.baseIndex = 0;
    out.buckets = [0, 0, 0, 0, 0, 0, 0];
    return out;
  }

  for (let i = 0; i < delta; i += 1) {
    out.baseIndex = (out.baseIndex + 1) % 7;
    out.buckets[out.baseIndex] = 0;
  }
  out.baseDay = todayDay;
  return out;
}

function defaultStudyState() {
  return {
    schemaVersion: 2,
    profile: {
      name: '',
    },
    xp: {
      total: 0,
      week: null,
      milestonesUnlocked: {},
      lastUrlAwardedDay: {},
      lastDailyFirstBonusDayByReason: {},
    },
  };
}

function weekRingToOffsets(week, todayDay) {
  const normalized = ensureWeekRing(week, todayDay);
  const offsets = new Array(7).fill(0);
  // offsets[0] = today, offsets[1] = yesterday, ...
  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const idx = (normalized.baseIndex - dayOffset + 7 * 10) % 7;
    offsets[dayOffset] = Number(normalized.buckets[idx] || 0);
  }
  return offsets;
}

function weekRingFromOffsets(offsets, todayDay) {
  const off = Array.isArray(offsets) ? offsets : [];
  const week = ensureWeekRing(null, todayDay);
  week.baseDay = todayDay;
  week.baseIndex = 0; // today is index 0
  week.buckets = [0, 0, 0, 0, 0, 0, 0];
  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const value = Number(off[dayOffset] || 0);
    // If baseIndex=0 is today, then yesterday should be index 6, two days ago index 5...
    const idx = (0 - dayOffset + 7 * 10) % 7;
    week.buckets[idx] = value;
  }
  return week;
}

function migrateV1ToV2(parsedV1, todayDay) {
  const out = defaultStudyState();
  out.profile.name = String(parsedV1?.profile?.name || '');

  const byExam = parsedV1?.xp?.byExam && typeof parsedV1.xp.byExam === 'object' ? parsedV1.xp.byExam : {};
  const totals = [];
  const weekOffsetsSum = new Array(7).fill(0);
  const lastUrlAwardedDay = {};

  for (const examId of Object.keys(byExam)) {
    const ex = byExam[examId];
    const total = Number(ex?.total || 0);
    totals.push(total);

    const offsets = weekRingToOffsets(ex?.week, todayDay);
    for (let i = 0; i < 7; i += 1) {
      weekOffsetsSum[i] += Number(offsets[i] || 0);
    }

    const urlDays = ex?.lastUrlAwardedDay && typeof ex.lastUrlAwardedDay === 'object' ? ex.lastUrlAwardedDay : {};
    for (const [k, v] of Object.entries(urlDays)) {
      // Keep the latest day string for each URL
      const prev = String(lastUrlAwardedDay[k] || '');
      const next = String(v || '');
      if (!prev || next > prev) lastUrlAwardedDay[k] = next;
    }
  }

  out.xp.total = totals.reduce((acc, v) => acc + Number(v || 0), 0);
  out.xp.week = weekRingFromOffsets(weekOffsetsSum, todayDay);
  out.xp.lastUrlAwardedDay = lastUrlAwardedDay;
  out.xp.milestonesUnlocked = {};
  out.xp.lastDailyFirstBonusDayByReason = {};
  return out;
}

export function loadStudyState() {
  try {
    const today = getLocalDayString();
    const raw = localStorage.getItem(STUDY_STATE_STORAGE_KEY);
    if (!raw) return defaultStudyState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultStudyState();

    // Minimal migration/validation
    if (parsed.schemaVersion === 1) {
      const migrated = migrateV1ToV2(parsed, today);
      saveStudyState(migrated);
      return migrated;
    }

    if (parsed.schemaVersion !== 2) return defaultStudyState();

    if (!parsed.profile || typeof parsed.profile !== 'object') parsed.profile = { name: '' };
    if (!parsed.xp || typeof parsed.xp !== 'object') {
      parsed.xp = {
        total: 0,
        week: null,
        milestonesUnlocked: {},
        lastUrlAwardedDay: {},
        lastDailyFirstBonusDayByReason: {},
      };
    }
    if (!Number.isFinite(Number(parsed.xp.total))) parsed.xp.total = 0;
    // week normalized later in ensureXpState
    if (!parsed.xp.milestonesUnlocked || typeof parsed.xp.milestonesUnlocked !== 'object') parsed.xp.milestonesUnlocked = {};
    if (!parsed.xp.lastUrlAwardedDay || typeof parsed.xp.lastUrlAwardedDay !== 'object') parsed.xp.lastUrlAwardedDay = {};
    if (!parsed.xp.lastDailyFirstBonusDayByReason || typeof parsed.xp.lastDailyFirstBonusDayByReason !== 'object') {
      parsed.xp.lastDailyFirstBonusDayByReason = {};
    }
    return parsed;
  } catch {
    return defaultStudyState();
  }
}

export function saveStudyState(state) {
  const safe = state && typeof state === 'object' ? state : defaultStudyState();
  localStorage.setItem(STUDY_STATE_STORAGE_KEY, JSON.stringify(safe));
}

export function getUserName() {
  const s = loadStudyState();
  return String(s?.profile?.name || '');
}

export function setUserName(name) {
  const trimmed = String(name || '').trim();
  const s = loadStudyState();
  s.profile = s.profile && typeof s.profile === 'object' ? s.profile : {};
  s.profile.name = trimmed;
  saveStudyState(s);
  return trimmed;
}

function normalizeExternalUrl(href) {
  try {
    const u = new URL(String(href || ''));
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

function ensureXpState(studyState, todayDay) {
  const state = studyState;
  if (!state.xp || typeof state.xp !== 'object') {
    state.xp = {
      total: 0,
      week: ensureWeekRing(null, todayDay),
      milestonesUnlocked: {},
      lastUrlAwardedDay: {},
      lastDailyFirstBonusDayByReason: {},
    };
  }

  state.xp.total = Number(state.xp.total || 0);
  state.xp.week = ensureWeekRing(state.xp.week, todayDay);
  state.xp.milestonesUnlocked = state.xp.milestonesUnlocked && typeof state.xp.milestonesUnlocked === 'object' ? state.xp.milestonesUnlocked : {};
  state.xp.lastUrlAwardedDay = state.xp.lastUrlAwardedDay && typeof state.xp.lastUrlAwardedDay === 'object' ? state.xp.lastUrlAwardedDay : {};
  state.xp.lastDailyFirstBonusDayByReason =
    state.xp.lastDailyFirstBonusDayByReason && typeof state.xp.lastDailyFirstBonusDayByReason === 'object'
      ? state.xp.lastDailyFirstBonusDayByReason
      : {};
  return state.xp;
}

function sumWeekBuckets(week) {
  if (!week || !Array.isArray(week.buckets)) return 0;
  return week.buckets.reduce((acc, v) => acc + Number(v || 0), 0);
}

export function addXp({ examId, amount, reason, url } = {}) {
  const xp = Math.max(0, Math.floor(Number(amount || 0)));
  if (!xp) return { applied: false, amountApplied: 0, bonusApplied: 0, unlocked: [], summary: getXpSummary() };

  const today = getLocalDayString();
  const state = loadStudyState();
  const ex = ensureXpState(state, today);

  // Enforce: same URL once per day
  if (reason === 'link') {
    const normalized = normalizeExternalUrl(url);
    if (!normalized) {
      return { applied: false, amountApplied: 0, unlocked: [], summary: getXpSummary() };
    }
    const already = String(ex.lastUrlAwardedDay[normalized] || '');
    if (already === today) {
      return { applied: false, amountApplied: 0, unlocked: [], summary: getXpSummary() };
    }
    ex.lastUrlAwardedDay[normalized] = today;

    // Soft cap: prevent unbounded growth
    const keys = Object.keys(ex.lastUrlAwardedDay);
    if (keys.length > 400) {
      // Delete older entries not from today (best-effort)
      for (const k of keys) {
        if (ex.lastUrlAwardedDay[k] !== today) {
          delete ex.lastUrlAwardedDay[k];
        }
        if (Object.keys(ex.lastUrlAwardedDay).length <= 250) break;
      }
    }
  }

  // Daily first bonus: first action per reason per day gets 2x (i.e., +xp bonus)
  const dailyBonusReasons = new Set(['link', 'explain', 'quiz']);
  let bonus = 0;
  if (dailyBonusReasons.has(String(reason || ''))) {
    const lastDay = String(ex.lastDailyFirstBonusDayByReason[String(reason)] || '');
    if (lastDay !== today) {
      bonus = xp;
      ex.lastDailyFirstBonusDayByReason[String(reason)] = today;
    }
  }

  const prevTotal = ex.total;
  const applied = xp + bonus;
  ex.total += applied;
  ex.week.buckets[ex.week.baseIndex] = Number(ex.week.buckets[ex.week.baseIndex] || 0) + applied;

  const unlocked = getNewlyUnlockedMilestones(prevTotal, ex.total);
  const nowIso = new Date().toISOString();
  for (const m of unlocked) {
    if (!ex.milestonesUnlocked[m.id]) {
      ex.milestonesUnlocked[m.id] = {
        unlockedAt: nowIso,
        xpAtUnlock: ex.total,
      };
    }
  }

  saveStudyState(state);
  return {
    applied: true,
    amountApplied: applied,
    bonusApplied: bonus,
    unlocked,
    summary: getXpSummary(),
  };
}

export function getXpSummary(examId) {
  const today = getLocalDayString();
  const state = loadStudyState();
  const ex = ensureXpState(state, today);
  // Save back normalized week ring if needed
  saveStudyState(state);

  const weekXp = sumWeekBuckets(ex.week);
  const totalXp = Number(ex.total || 0);
  const ms = getMilestoneStatus(totalXp);

  return {
    totalXp,
    weekXp,
    milestoneId: ms.current?.id || null,
    title: ms.current?.title || '',
    nextMilestoneId: ms.next?.id || null,
    nextTitle: ms.next?.title || null,
    remainingXp: ms.remainingXp,
    progress01: ms.progress01,
  };
}

function showMessage(messageEl, text, colorClass) {
  messageEl.textContent = text;
  messageEl.className = `text-sm mb-4 ${colorClass}`;
  messageEl.classList.remove('hidden');
}
