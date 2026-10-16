/**
 * examLifecycle.js — 試験バージョンの改定・廃止のお知らせを決めるピュア関数モジュール。
 *
 * データ（js/data/exam-lifecycle.js）の phases から「今日」に当たるフェーズを選び、
 * 表示ロケールに合わせた文言と出典を返す。`js/examSchedule.js` と同じ方針で DOM /
 * ネットワーク / localStorage には触れず、「現在時刻」を引数で受け取るため、
 * ブラウザ無しで単体テストできる。UI（js/ui.js）はバナーとサイドバーのバッジに、
 * AI チャット（js/chat.js）はシステムプロンプトの前提情報に使う。
 */

import { EXAM_LIFECYCLE } from './data/exam-lifecycle.js';

/**
 * お知らせの状態。i18n キー（examLifecycle.title.* / examLifecycle.badge.*）と 1:1 対応する。
 * @enum {string}
 */
export const LIFECYCLE_STATUSES = Object.freeze({
  UPDATING: 'updating', // 新バージョンへの改定予定（旧バージョンはまだ受験できる）
  SUPERSEDED: 'superseded', // 新バージョンへ移行済み（このページは旧バージョン準拠）
  RETIRING: 'retiring', // 後継なしの廃止予定
  RETIRED: 'retired', // 廃止済み
});

/**
 * Date をローカル暦日のキー（YYYY-MM-DD）に変換する。不正な値は null。
 * キーは文字列のまま大小比較できる（ゼロ埋めの ISO 形式のため）。
 * @param {Date} date
 * @returns {?string}
 */
export function toLocalDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  const y = String(date.getFullYear()).padStart(4, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * entry.phases のうち `now` の暦日を含むフェーズを返す（from / until は両端を含む）。
 * 該当が無ければ null。
 * @param {{ phases?: Array<{ from?: string, until?: string }> } | null | undefined} entry
 * @param {Date} [now]
 * @returns {object | null}
 */
export function getActiveLifecyclePhase(entry, now = new Date()) {
  const today = toLocalDateKey(now);
  if (!today || !entry || !Array.isArray(entry.phases)) return null;
  return (
    entry.phases.find(
      (phase) => phase && (!phase.from || phase.from <= today) && (!phase.until || today <= phase.until),
    ) || null
  );
}

function pickLocalized(obj, jaKey, enKey, isEn) {
  return isEn ? obj[enKey] || obj[jaKey] || '' : obj[jaKey] || obj[enKey] || '';
}

/**
 * 試験の改定・廃止のお知らせを、表示ロケールに合わせて返す。
 * 発表済みの予定が無い試験（または今日に当たるフェーズが無い場合）は null。
 *
 * @param {string} examId
 * @param {{ now?: Date, locale?: string, lifecycle?: object }} [opts]
 *   lifecycle はテスト用の差し替え口（既定は js/data/exam-lifecycle.js）。
 * @returns {{
 *   examId: string,
 *   status: string,
 *   successorCode: string | null,
 *   message: string,
 *   sources: Array<{ title: string, url: string }>,
 * } | null}
 */
export function getExamLifecycleNotice(examId, { now = new Date(), locale = 'ja', lifecycle = EXAM_LIFECYCLE } = {}) {
  if (!examId || !lifecycle || !Object.prototype.hasOwnProperty.call(lifecycle, examId)) return null;
  const entry = lifecycle[examId];
  const phase = getActiveLifecyclePhase(entry, now);
  if (!phase) return null;

  const isEn = locale === 'en';
  const sources = (Array.isArray(entry.sources) ? entry.sources : [])
    .map((source) => ({
      title: pickLocalized(source, 'title', 'titleEn', isEn),
      url: pickLocalized(source, 'url', 'urlEn', isEn),
    }))
    .filter((source) => /^https:\/\//.test(source.url));

  return {
    examId,
    status: phase.status,
    successorCode: entry.successorCode || null,
    message: pickLocalized(phase, 'message', 'messageEn', isEn),
    sources,
  };
}
