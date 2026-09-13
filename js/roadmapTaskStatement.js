/**
 * roadmapTaskStatement.js — ロードマップの各タスクの「タスクステートメント」を
 * 表示用の行配列／クリップボード用のプレーンテキストへ変換するピュア関数。
 *
 * issue #191（タスクステートメントを希望時のみ表示できるように）と
 * issue #192（タスクステートメントを簡単にクリップボードへコピーできるように）への
 * 対応。DOM や localStorage を触らず、タスクオブジェクトと locale だけを入力に取る
 * ことで、ブラウザ無しでも単体テストできるように ui.js から切り出している
 * （`js/quizCsv.js` と同じ方針）。UI 側（`js/ui.js`）はこの関数で得た行をレンダリング
 * し、コピーテキストをクリップボードへ書き込む。
 *
 * ここでのロケール選択・正規化のロジックは、ui.js の `localizedDescription`
 * （'en' は descriptionEn があればそれ、無ければ description。'ja' は description）と
 * `normalizeDescriptionLines`（文字列/配列を受け取り、各要素を trim し空を除外して
 * 文字列配列を返す）と byte-compatible に保つこと。片方だけ変更すると表示と
 * コピー内容がずれるため、両者を同期させて更新する。
 */

/**
 * タスクオブジェクトから、指定ロケールの説明（description）配列を選択する。
 * ui.js の `localizedDescription` と同じ選択規則。
 * @param {object} task - ロードマップのタスクオブジェクト。
 * @param {string} locale - 'en' または 'ja'。
 * @returns {string|Array<string>|undefined} 生の description（未正規化）。
 */
function selectDescription(task, locale) {
  if (!task) return [];
  if (locale === 'en' && task.descriptionEn) return task.descriptionEn;
  return task.description || [];
}

/**
 * 文字列または配列の description を、trim 済みかつ空要素を除いた文字列配列へ正規化する。
 * ui.js の `normalizeDescriptionLines` と byte-compatible。
 * @param {string|Array<*>|*} description
 * @returns {Array<string>}
 */
function normalizeDescriptionLines(description) {
  if (!description) return [];
  if (Array.isArray(description)) {
    return description
      .map((v) => (typeof v === 'string' ? v.trim() : String(v ?? '').trim()))
      .filter(Boolean);
  }
  if (typeof description === 'string') {
    const trimmed = description.trim();
    return trimmed ? [trimmed] : [];
  }
  const asString = String(description).trim();
  return asString ? [asString] : [];
}

/**
 * 指定ロケールでのタスクステートメントの表示行を返す。
 *
 * - 'en' は task.descriptionEn があればそれを使い、無ければ task.description にフォールバック。
 * - 'ja'（および 'en' 以外）は task.description を使う。
 * - 各行は trim され、空行・空白のみの行は除外される。
 *
 * @param {object} task - ロードマップのタスクオブジェクト。
 * @param {string} locale - 'en' または 'ja'。
 * @returns {Array<string>} trim 済みの非空ステートメント行の配列。description が無ければ []。
 */
export function taskStatementLines(task, locale) {
  return normalizeDescriptionLines(selectDescription(task, locale));
}

/**
 * 指定ロケールでのタスクステートメントを、クリップボード向けの単一プレーンテキストへ変換する。
 * 行を出現順に '\n' で連結する。行が無い場合は '' を返す。
 *
 * @param {object} task - ロードマップのタスクオブジェクト。
 * @param {string} locale - 'en' または 'ja'。
 * @returns {string} クリップボードへ書き込めるプレーンテキスト。
 */
export function taskStatementCopyText(task, locale) {
  return taskStatementLines(task, locale).join('\n');
}
