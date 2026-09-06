/**
 * quizCsv.js — 学習履歴（quiz history）を CSV 文字列へ変換するピュア関数。
 *
 * issue #165 のフィードバック「問題データの CSV ダウンロード（過去の問題復習の
 * ために localStorage に保存していたはず）」への対応。localStorage を直接触らず、
 * `getQuizHistory()` が返す配列だけを入力に取ることで、ブラウザ無しでも単体テスト
 * できるように storage.js から切り出している（`js/markdown.js` / `js/aiErrors.js`
 * と同じ方針）。UI 側（`js/ui.js`）が localStorage から履歴を読み、この関数で CSV へ
 * 変換して Blob ダウンロードさせる。
 */

/**
 * 1 つの CSV フィールドをエスケープする（RFC 4180 準拠）。
 * ダブルクォート・カンマ・改行を含む場合はダブルクォートで囲み、内部の `"` は `""` に。
 * @param {*} value
 * @returns {string}
 */
export function escapeCsvField(value) {
  let s = value == null ? '' : String(value);
  // Excel が改行を壊さないよう、CR/LF は空白へ潰さずそのまま囲み、フィールド内改行を許容する。
  if (/[",\r\n]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/** 0 始まりの選択肢インデックスを A/B/C... の文字へ。null は '' */
function letterOf(index) {
  return Number.isFinite(index) ? String.fromCharCode(65 + index) : '';
}

/** CSV のヘッダー行（列の順序と意味の単一の定義） */
export const QUIZ_CSV_HEADERS = [
  'answeredAt',
  'examId',
  'domainId',
  'mode',
  'question',
  'choiceA',
  'choiceB',
  'choiceC',
  'choiceD',
  'choiceE',
  'correctAnswer',
  'yourAnswer',
  'isCorrect',
  'elapsedSec',
  'explanation',
];

/**
 * 学習履歴エントリの配列を CSV 文字列へ変換する。
 *
 * - 問題文（`question`）が空のエントリは復習に使えないため除外する
 *   （`exportQuizHistory` のマークダウン版と同じ基準）。
 * - 選択肢は最大 5 択（A〜E）まで個別列に展開する。6 択以上は起こらない想定だが、
 *   万一多い場合も先頭 5 択のみ列に出す（データ欠落を避けるため、余剰は explanation では
 *   なく単純に列外となる。列を固定してツール取り込みを安定させることを優先）。
 * - Excel での文字化けを避けるため、呼び出し側で UTF-8 BOM を付与できるよう本関数は
 *   BOM を含めない純テキストを返す。
 *
 * @param {Array<object>} history - `getQuizHistory()` が返す形の配列。
 * @returns {string} CSV 文字列（末尾改行あり）。対象 0 件ならヘッダー行のみを返す。
 */
export function quizHistoryToCsv(history) {
  const rows = [QUIZ_CSV_HEADERS.map(escapeCsvField).join(',')];
  const list = Array.isArray(history) ? history : [];
  for (const h of list) {
    if (!h || !h.question) continue;
    const choices = Array.isArray(h.choices) ? h.choices : [];
    const elapsedSec = Number.isFinite(h.elapsedMs) ? Math.round(h.elapsedMs / 1000) : '';
    const cells = [
      h.answeredAt || '',
      h.examId || '',
      h.domainId == null ? '' : h.domainId,
      h.mode || '',
      h.question || '',
      choices[0] || '',
      choices[1] || '',
      choices[2] || '',
      choices[3] || '',
      choices[4] || '',
      letterOf(h.correctIndex),
      letterOf(h.userAnswer),
      h.isCorrect ? 'correct' : 'incorrect',
      elapsedSec,
      h.explanation || '',
    ];
    rows.push(cells.map(escapeCsvField).join(','));
  }
  return rows.join('\r\n') + '\r\n';
}
