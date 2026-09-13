/**
 * examSchedule.js — 受験予定日のカウントダウン / ステージ判定を担うピュア関数モジュール（issue #200）。
 *
 * 「受験予定日を登録し、受験が近づくにつれて表示（通知）メッセージが変わり、合格したら
 * おめでとう的な反応があると嬉しい」という要望に対応する中核ロジックをここに置く。
 *
 * `js/resourceSearch.js` / `js/markdown.js` と同じ方針で DOM / ネットワーク / localStorage には
 * 一切触れず、入力（対象日付と「現在時刻」）だけで動くピュア関数として実装しているため、
 * ブラウザ無しで単体テストできる。UI 側（`js/ui.js`）は localStorage から読み出した予定日と、
 * ここで計算した残り日数・ステージを使って表示メッセージを切り替える。
 *
 * 注意（スコープ）: このモジュールは端末内（localStorage）で動く「アプリ内メッセージ」の
 * ためのロジックであり、OS のプッシュ通知そのものは扱わない。真のプッシュ通知には
 * バックエンド + Service Worker の push が必要で、本アプリのアーキテクチャ（バックエンド無し）
 * では対象外（issue #200 の PR 本文参照）。
 */

/**
 * 受験予定日ステージのキー。UI 側の i18n キー（`examDate.stage.*`）と 1:1 対応する。
 * @enum {string}
 */
export const EXAM_STAGES = Object.freeze({
  FAR: 'far', // 30日超
  SOON: 'soon', // 8〜30日
  IMMINENT: 'imminent', // 1〜7日
  TODAY: 'today', // 当日
  PAST: 'past', // 予定日を過ぎた（未合格）
});

/**
 * ステージ境界（残り日数の下限、含む）。大きい順に評価する。
 * daysUntil >= 31 → far / 8〜30 → soon / 1〜7 → imminent / 0 → today / < 0 → past。
 */
const SOON_MIN_DAYS = 8;
const IMMINENT_MIN_DAYS = 1;
const FAR_MIN_DAYS = 31;

/**
 * ローカル暦日（YYYY-MM-DD 相当の時刻要素）を 00:00:00 に丸めた Date を返す内部ヘルパー。
 * 時差・時刻成分による 1 日のズレを避けるため、残り日数はローカル日付の「日」単位で数える。
 * @param {Date} d
 * @returns {Date}
 */
function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * ISO 形式（YYYY-MM-DD もしくは完全な ISO 文字列）または Date を、ローカル暦日の Date へ正規化する。
 * 解釈できない入力は null を返す。
 * @param {string|Date} value
 * @returns {?Date}
 */
export function parseExamDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : startOfLocalDay(value);
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // YYYY-MM-DD（`<input type="date">` の値）はローカル日付として解釈する。
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day);
    // ロールオーバー（例: 2月30日）を弾く。
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
    return d;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfLocalDay(parsed);
}

/**
 * 対象日（受験予定日）までの残り日数を、ローカル暦日の差として計算する。
 * 「現在時刻」を引数で受け取る（テスト容易性のため）。当日は 0、明日は 1、昨日は -1。
 *
 * @param {string|Date} target - 受験予定日（YYYY-MM-DD / ISO 文字列 / Date）。
 * @param {Date} [now=new Date()] - 現在時刻。テストでは固定値を注入する。
 * @returns {?number} 残り日数（整数）。target が解釈できなければ null。
 */
export function daysUntilExam(target, now = new Date()) {
  const targetDay = parseExamDate(target);
  if (!targetDay) return null;
  const nowDay = startOfLocalDay(now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date());
  const ms = targetDay.getTime() - nowDay.getTime();
  return Math.round(ms / 86400000);
}

/**
 * 残り日数からステージキーを選ぶ。境界の扱いは EXAM_STAGES のコメントを参照。
 * null（対象日が無い / 不正）は null を返す。
 *
 * @param {?number} daysUntil - `daysUntilExam` の戻り値。
 * @returns {?string} EXAM_STAGES のいずれか、または null。
 */
export function stageForDaysUntil(daysUntil) {
  if (daysUntil == null || !Number.isFinite(daysUntil)) return null;
  if (daysUntil < 0) return EXAM_STAGES.PAST;
  if (daysUntil === 0) return EXAM_STAGES.TODAY;
  if (daysUntil >= FAR_MIN_DAYS) return EXAM_STAGES.FAR;
  if (daysUntil >= SOON_MIN_DAYS) return EXAM_STAGES.SOON;
  if (daysUntil >= IMMINENT_MIN_DAYS) return EXAM_STAGES.IMMINENT;
  return EXAM_STAGES.FAR;
}

/**
 * 対象日と現在時刻から、UI 表示に必要な要素をまとめて返す便利関数。
 * `daysUntilExam` と `stageForDaysUntil` を合成しただけのピュア関数。
 *
 * @param {string|Date} target
 * @param {Date} [now=new Date()]
 * @returns {{ daysUntil: ?number, stage: ?string }}
 */
export function describeExamSchedule(target, now = new Date()) {
  const daysUntil = daysUntilExam(target, now);
  return { daysUntil, stage: stageForDaysUntil(daysUntil) };
}

/**
 * i18n の stage メッセージキー（`examDate.stage.<stage>`）を返す。stage が無ければ null。
 * @param {?string} stage - EXAM_STAGES のいずれか。
 * @returns {?string}
 */
export function messageKeyForStage(stage) {
  if (!stage) return null;
  const valid = Object.values(EXAM_STAGES);
  return valid.includes(stage) ? `examDate.stage.${stage}` : null;
}

/**
 * 合格お祝い（celebration）を表示すべきかを判定する。
 * 「合格済みフラグが立っていて、まだお祝いを見せていない」ときだけ true。
 * localStorage には触れず、状態は引数で受け取る（ピュア関数）。
 *
 * @param {Object} params
 * @param {boolean} params.passed - ユーザーが「合格」をマークしたか。
 * @param {boolean} params.alreadyCelebrated - すでにお祝いを表示済みか。
 * @returns {boolean}
 */
export function shouldCelebratePass({ passed, alreadyCelebrated } = {}) {
  return Boolean(passed) && !alreadyCelebrated;
}
