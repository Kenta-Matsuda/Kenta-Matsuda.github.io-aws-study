/**
 * missions.js — デイリー / ウィークリー / マンスリーのローカルミッション（issue #193）
 *
 * 「ミッション（デイリー/ウィークリー/マンスリー）があって、クリアすると XP が貰える」
 * という要望に対応するためのピュア関数モジュール。`js/resourceSearch.js` /
 * `js/data/daily-challenge.js` と同じ方針で DOM / ネットワーク / localStorage には一切
 * 触れず、入力（進捗オブジェクト + 基準時刻）だけで動くため、ブラウザ無しで単体テストできる。
 *
 * 設計方針:
 * - ミッションは「期間（daily/weekly/monthly）× メトリクス × 目標数 × 報酬 XP」のテンプレート
 *   として定義する（`MISSION_TEMPLATES`）。
 * - 各期間には「期間キー」（daily=YYYY-MM-DD, weekly=YYYY-Www, monthly=YYYY-MM）があり、
 *   基準時刻から算出する。進捗オブジェクトに保存された期間キーと現在の期間キーが違えば、
 *   その期間のカウンタと報酬受領フラグをリセットする（＝期間ロールオーバー）。
 * - 実際の XP 付与は行わない。`computeMissionState()` は「今クリア済みだが報酬未受領」の
 *   ミッション一覧（`newlyCompleted`）を返すだけで、XP 付与と受領フラグの記録は呼び出し側
 *   （`js/storage.js` / `js/ui.js`）が既存の XP 機構（`addXp`）経由で行う。これにより
 *   XP 経済圏を二重に持たない。
 *
 * メトリクス（進捗カウンタのキー）:
 * - `quiz`    … クイズ（AI 作問 / デイリーチャレンジ / 模擬試験）を 1 問回答するたびに +1。
 * - `correct` … クイズに正解するたびに +1。
 * - `link`    … 学習リソースのリンクを開くたびに +1。
 * - `xp`      … 期間内に獲得した XP の合計。
 */

/** 週の ISO 週番号キー "YYYY-Www"（月曜始まり、ローカルタイム基準）を返す。 */
function getLocalWeekKey(d) {
  // ISO-8601: 週は月曜始まり。木曜日を含む週が、その年の週として数えられる。
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (date.getDay() + 6) % 7; // 月曜=0 ... 日曜=6
  date.setDate(date.getDate() - day + 3); // その週の木曜日へ移動
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** 月キー "YYYY-MM"（ローカルタイム基準）を返す。 */
function getLocalMonthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 日キー "YYYY-MM-DD"（ローカルタイム基準）。storage.js の getLocalDayString と一致。 */
function getLocalDayKey(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 指定した期間（daily/weekly/monthly）の、基準時刻に対する期間キーを返す。
 * 同一期間内では常に同じキーを返し、期間をまたぐと変化する（＝リセット判定に使う）。
 * @param {'daily'|'weekly'|'monthly'} period
 * @param {Date} now
 * @returns {string}
 */
export function getPeriodKey(period, now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  switch (period) {
    case 'weekly':
      return getLocalWeekKey(d);
    case 'monthly':
      return getLocalMonthKey(d);
    case 'daily':
    default:
      return getLocalDayKey(d);
  }
}

/**
 * ミッションテンプレート。id は永続化キーにも使うため安定させる。
 * title/desc の表示文言は i18n（`missions.<id>.title` / `.desc`）で解決する（UI 側）。
 * @typedef {Object} MissionTemplate
 * @property {string} id
 * @property {'daily'|'weekly'|'monthly'} period
 * @property {'quiz'|'correct'|'link'|'xp'} metric
 * @property {number} target
 * @property {number} xpReward
 */

/** @type {MissionTemplate[]} */
export const MISSION_TEMPLATES = [
  // デイリー
  { id: 'daily_quiz_3', period: 'daily', metric: 'quiz', target: 3, xpReward: 5 },
  { id: 'daily_correct_1', period: 'daily', metric: 'correct', target: 1, xpReward: 5 },
  { id: 'daily_link_1', period: 'daily', metric: 'link', target: 1, xpReward: 3 },
  // ウィークリー
  { id: 'weekly_quiz_20', period: 'weekly', metric: 'quiz', target: 20, xpReward: 30 },
  { id: 'weekly_correct_10', period: 'weekly', metric: 'correct', target: 10, xpReward: 30 },
  // マンスリー
  { id: 'monthly_xp_500', period: 'monthly', metric: 'xp', target: 500, xpReward: 100 },
];

const VALID_PERIODS = new Set(['daily', 'weekly', 'monthly']);
const VALID_METRICS = new Set(['quiz', 'correct', 'link', 'xp']);

/**
 * 進捗オブジェクトの 1 期間分。
 * @typedef {Object} MissionPeriodProgress
 * @property {string} periodKey            この期間のキー（getPeriodKey の値）。
 * @property {Record<string, number>} counters  メトリクスごとの累積カウンタ。
 * @property {Record<string, boolean>} claimed   ミッション id ごとの「報酬受領済み」フラグ。
 */

/**
 * ミッション全体の進捗オブジェクト（localStorage に保存される形）。
 * @typedef {Object} MissionsProgress
 * @property {MissionPeriodProgress} daily
 * @property {MissionPeriodProgress} weekly
 * @property {MissionPeriodProgress} monthly
 */

/** 空の 1 期間分の進捗を作る。 */
function emptyPeriodProgress(periodKey) {
  return { periodKey, counters: {}, claimed: {} };
}

/**
 * 進捗オブジェクトを検証・正規化し、期間キーが変わっていればその期間をリセットする（ロールオーバー）。
 * 純粋関数: 入力を破壊せず新しいオブジェクトを返す。
 * @param {MissionsProgress|null|undefined} progress
 * @param {Date} now
 * @returns {MissionsProgress}
 */
export function normalizeMissionsProgress(progress, now = new Date()) {
  const out = {};
  for (const period of ['daily', 'weekly', 'monthly']) {
    const currentKey = getPeriodKey(period, now);
    const src = progress && typeof progress === 'object' ? progress[period] : null;

    if (!src || typeof src !== 'object' || src.periodKey !== currentKey) {
      // 期間が変わった（またはデータ無し）→ リセット
      out[period] = emptyPeriodProgress(currentKey);
      continue;
    }

    const counters = {};
    if (src.counters && typeof src.counters === 'object') {
      for (const [k, v] of Object.entries(src.counters)) {
        const n = Number(v);
        if (VALID_METRICS.has(k) && Number.isFinite(n) && n >= 0) counters[k] = n;
      }
    }
    const claimed = {};
    if (src.claimed && typeof src.claimed === 'object') {
      for (const [k, v] of Object.entries(src.claimed)) {
        if (v === true) claimed[k] = true;
      }
    }
    out[period] = { periodKey: currentKey, counters, claimed };
  }
  return out;
}

/**
 * 進捗にメトリクスイベントを加算した新しい進捗を返す（純粋関数）。
 * 加算前に normalizeMissionsProgress を通すので、期間ロールオーバーも同時に処理される。
 * @param {MissionsProgress|null|undefined} progress
 * @param {'quiz'|'correct'|'link'|'xp'} metric
 * @param {number} amount 加算量（既定 1）
 * @param {Date} now
 * @returns {MissionsProgress}
 */
export function recordMissionMetric(progress, metric, amount = 1, now = new Date()) {
  const normalized = normalizeMissionsProgress(progress, now);
  const inc = Number(amount);
  if (!VALID_METRICS.has(metric) || !Number.isFinite(inc) || inc <= 0) return normalized;

  // このメトリクスに関係する期間だけ加算する（テンプレートに存在する period のみ）。
  const affectedPeriods = new Set(
    MISSION_TEMPLATES.filter((m) => m.metric === metric).map((m) => m.period),
  );
  for (const period of affectedPeriods) {
    const p = normalized[period];
    p.counters[metric] = Number(p.counters[metric] || 0) + inc;
  }
  return normalized;
}

/**
 * 1 つのミッションの現在状態を計算する。
 * @param {MissionTemplate} template
 * @param {MissionsProgress} normalized 正規化済み進捗
 * @returns {{ id: string, period: string, metric: string, target: number, xpReward: number, progress: number, completed: boolean, claimed: boolean, progress01: number }}
 */
function computeSingleMission(template, normalized) {
  const periodProgress = normalized[template.period] || emptyPeriodProgress('');
  const progress = Math.max(0, Number(periodProgress.counters[template.metric] || 0));
  const completed = progress >= template.target;
  const claimed = periodProgress.claimed[template.id] === true;
  const progress01 = template.target > 0 ? Math.min(1, progress / template.target) : 1;
  return {
    id: template.id,
    period: template.period,
    metric: template.metric,
    target: template.target,
    xpReward: template.xpReward,
    progress,
    completed,
    claimed,
    progress01,
  };
}

/**
 * すべてのミッションの現在状態と、「今クリア済みだが報酬未受領」のミッション一覧を計算する。
 * 純粋関数。XP 付与や受領フラグの更新は行わない（呼び出し側の責務）。
 * @param {MissionsProgress|null|undefined} progress
 * @param {Date} now
 * @returns {{ missions: Array, newlyCompleted: Array, normalized: MissionsProgress }}
 */
export function computeMissionState(progress, now = new Date()) {
  const normalized = normalizeMissionsProgress(progress, now);
  const missions = MISSION_TEMPLATES.map((tpl) => computeSingleMission(tpl, normalized));
  const newlyCompleted = missions.filter((m) => m.completed && !m.claimed);
  return { missions, newlyCompleted, normalized };
}

/**
 * `newlyCompleted` のミッションを「報酬受領済み」にマークした新しい進捗を返す（純粋関数）。
 * 呼び出し側は、この関数の前に各ミッションの xpReward を既存の XP 機構で付与すること。
 * @param {MissionsProgress|null|undefined} progress
 * @param {string[]} missionIds 受領済みにするミッション id
 * @param {Date} now
 * @returns {MissionsProgress}
 */
export function claimMissions(progress, missionIds, now = new Date()) {
  const normalized = normalizeMissionsProgress(progress, now);
  const ids = Array.isArray(missionIds) ? missionIds : [];
  const byId = new Map(MISSION_TEMPLATES.map((m) => [m.id, m]));
  for (const id of ids) {
    const tpl = byId.get(id);
    if (!tpl) continue;
    const periodProgress = normalized[tpl.period];
    if (!periodProgress) continue;
    // クリア済みのものだけ受領マークする（未達成を勝手に claim しない）。
    const progressCount = Number(periodProgress.counters[tpl.metric] || 0);
    if (progressCount >= tpl.target) {
      periodProgress.claimed[id] = true;
    }
  }
  return normalized;
}

export { VALID_PERIODS, VALID_METRICS };
