/**
 * Leaderboard modal + participation toggles (issue #32).
 * Markup lives in index.html (#leaderboardModal, #openLeaderboardBtn and the
 * settings toggle); this module only wires and renders it.
 */

import { t, getLocale, onLocaleChange } from './i18n.js';
import { escapeHtml } from './utils.js';
import {
  LEADERBOARD_PERIODS,
  MAX_XP_PER_DAY,
  fetchLeaderboard,
  flushLeaderboard,
  initLeaderboard,
  isLeaderboardAvailable,
  isLeaderboardParticipating,
  setLeaderboardParticipation,
} from './leaderboard.js';

const TOGGLE_IDS = ['leaderboardOptInToggle', 'leaderboardModalOptInToggle'];
const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

let period = 'weekly';
let requestSeq = 0;
let lastView = { kind: 'idle' };
let statusOverride = '';

const $ = (id) => document.getElementById(id);

function formatNumber(n) {
  try { return Number(n || 0).toLocaleString(getLocale()); } catch { return String(n || 0); }
}

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString(getLocale(), { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(iso);
  }
}

function reflectToggles() {
  const available = isLeaderboardAvailable();
  const on = isLeaderboardParticipating();
  for (const id of TOGGLE_IDS) {
    const el = $(id);
    if (!el) continue;
    el.checked = on;
    el.disabled = !available;
  }
  const status = statusOverride || (!available
    ? t('leaderboard.statusUnavailable')
    : (on ? t('leaderboard.statusOn') : t('leaderboard.statusOff')));
  for (const id of ['leaderboardOptInStatus', 'leaderboardModalOptInStatus']) {
    const el = $(id);
    if (el) el.textContent = status;
  }
}

async function onToggleChange(event) {
  const wantOn = Boolean(event.target.checked);
  for (const id of TOGGLE_IDS) { const el = $(id); if (el) el.disabled = true; }
  statusOverride = '';
  try {
    const result = await setLeaderboardParticipation(wantOn);
    if (!wantOn && result.removed === false) statusOverride = t('leaderboard.leavePending');
  } finally {
    reflectToggles();
    if (isModalOpen()) loadPeriod(period);
  }
}

function isModalOpen() {
  const modal = $('leaderboardModal');
  return Boolean(modal && modal.style.display === 'block');
}

function reflectTabs() {
  document.querySelectorAll('#leaderboardTabs [data-lb-period]').forEach((btn) => {
    const active = btn.getAttribute('data-lb-period') === period;
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
    btn.classList.toggle('bg-indigo-600', active);
    btn.classList.toggle('text-white', active);
    btn.classList.toggle('text-gray-600', !active);
    btn.classList.toggle('hover:bg-gray-100', !active);
  });
}

function renderMessage(html) {
  const list = $('leaderboardList');
  if (list) list.innerHTML = `<li class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">${html}</li>`;
  const meta = $('leaderboardMeta');
  if (meta) meta.textContent = '';
  const me = $('leaderboardMe');
  if (me) { me.textContent = ''; me.classList.add('hidden'); }
}

function render() {
  reflectTabs();
  const list = $('leaderboardList');
  if (!list) return;
  if (lastView.kind === 'disabled') {
    renderMessage(`<i class="fas fa-plug-circle-xmark mr-1"></i>${escapeHtml(t('leaderboard.unavailable'))}`);
    return;
  }
  if (lastView.kind === 'loading') {
    renderMessage(`<i class="fas fa-spinner fa-spin mr-1"></i>${escapeHtml(t('leaderboard.loading'))}`);
    return;
  }
  if (lastView.kind === 'error') {
    renderMessage(`${escapeHtml(t('leaderboard.error'))}<br><button type="button" id="leaderboardRetryBtn" class="mt-3 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-bold">${escapeHtml(t('leaderboard.retry'))}</button>`);
    $('leaderboardRetryBtn')?.addEventListener('click', () => loadPeriod(period));
    return;
  }
  if (lastView.kind !== 'data') return;

  const data = lastView.data;
  const myId = data.myId || '';
  if (!data.entries.length) {
    renderMessage(escapeHtml(t('leaderboard.empty')));
  } else {
    list.innerHTML = data.entries.map((e) => {
      const isMe = Boolean(myId) && e.id === myId;
      const name = e.name ? escapeHtml(e.name) : `<span class="italic text-gray-400">${escapeHtml(t('leaderboard.anonymous'))}</span>`;
      const rankNo = Number(e.rank) || 0;
      const rank = MEDALS[rankNo] || `#${rankNo}`;
      return `<li class="leaderboard-row flex items-center gap-3 px-3 py-2 rounded-lg ${isMe ? 'bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-200 dark:ring-indigo-700' : ''}" data-rank="${rankNo}"${isMe ? ' data-me="true"' : ''}>
        <span class="w-10 text-center font-bold text-gray-700 dark:text-gray-200 font-mono">${rank}</span>
        <span class="flex-1 min-w-0 truncate text-sm text-gray-800 dark:text-gray-100">${name}${isMe ? ` <span class="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">${escapeHtml(t('leaderboard.you'))}</span>` : ''}</span>
        <span class="text-sm font-bold font-mono text-gray-900 dark:text-gray-100">${formatNumber(e.xp)} XP</span>
      </li>`;
    }).join('');
  }

  const meta = $('leaderboardMeta');
  if (meta) {
    const parts = [t('leaderboard.participants', { count: formatNumber(data.participants || 0) })];
    if (data.period !== 'all' && data.periodKey) parts.push(t('leaderboard.periodLabel', { key: data.periodKey }));
    if (data.periodEnd) parts.push(t('leaderboard.resetsAt', { time: formatDateTime(data.periodEnd) }));
    meta.textContent = parts.join(' · ');
  }

  const me = $('leaderboardMe');
  if (me) {
    me.classList.remove('hidden');
    if (!isLeaderboardParticipating()) {
      me.textContent = t('leaderboard.joinCta');
    } else if (data.me) {
      me.textContent = t('leaderboard.myRank', { rank: data.me.rank, total: formatNumber(data.participants || 0), xp: formatNumber(data.me.xp) });
    } else {
      me.textContent = t('leaderboard.myRankNone');
    }
  }
}

async function loadPeriod(next) {
  period = LEADERBOARD_PERIODS.includes(next) ? next : 'weekly';
  if (!isLeaderboardAvailable()) {
    lastView = { kind: 'disabled' };
    render();
    return;
  }
  const seq = ++requestSeq;
  lastView = { kind: 'loading' };
  render();
  try {
    // Send XP still waiting in the local batch so the caller sees their latest total.
    if (isLeaderboardParticipating()) await flushLeaderboard().catch(() => {});
    const data = await fetchLeaderboard(period);
    if (seq !== requestSeq) return;
    lastView = { kind: 'data', data };
  } catch (err) {
    if (seq !== requestSeq) return;
    console.warn('[leaderboard] load failed:', err);
    lastView = { kind: 'error' };
  }
  render();
}

export function openLeaderboardModal() {
  const modal = $('leaderboardModal');
  if (!modal) return;
  statusOverride = '';
  reflectToggles();
  const note = $('leaderboardNote');
  if (note) note.textContent = t('leaderboard.note', { cap: formatNumber(MAX_XP_PER_DAY) });
  modal.style.display = 'block';
  loadPeriod(period);
}

export function initLeaderboardUi() {
  initLeaderboard();
  $('openLeaderboardBtn')?.addEventListener('click', openLeaderboardModal);
  document.querySelectorAll('#leaderboardTabs [data-lb-period]').forEach((btn) => {
    btn.addEventListener('click', () => loadPeriod(btn.getAttribute('data-lb-period')));
  });
  for (const id of TOGGLE_IDS) $(id)?.addEventListener('change', onToggleChange);
  // Reflect state whenever settings opens (another tab may have changed it).
  $('settingsBtn')?.addEventListener('click', () => { statusOverride = ''; reflectToggles(); });
  onLocaleChange(() => {
    reflectToggles();
    const note = $('leaderboardNote');
    if (note) note.textContent = t('leaderboard.note', { cap: formatNumber(MAX_XP_PER_DAY) });
    render();
  });
  reflectToggles();
}
