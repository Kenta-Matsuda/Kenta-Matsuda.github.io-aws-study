/**
 * resourceSearch.js — 全試験（13 種）に掲載されているリソースを横断検索するための
 * ピュア関数モジュール（issue #189）。
 *
 * 「掲載されているリソースを横断して検索したい（例: Amazon QuickSight のドキュメントが
 * ないか調べる）」という要望に対応する。特定の試験に絞った検索（モード1）と、試験を
 * 絞らずキーワードだけで全試験を検索（モード2）の両方を支える中核ロジックをここに置く。
 *
 * `js/quizCsv.js` と同じ方針で DOM / ネットワーク / localStorage には一切触れず、
 * 入力（`ALL_EXAMS` の配列）だけで動くピュア関数として実装しているため、ブラウザ無しで
 * 単体テストできる。UI 側（`js/ui.js`）はここで作った索引と検索結果を描画に使う。
 *
 * リソースは step レベル（`exam.steps[].resources`）と task レベル
 * （`exam.domains[].tasks[].resources`）の両方に存在するため（`js/data/clf-c02.js` 参照）、
 * 索引化ではその両方を走査する。task レベルのレコードでは、その task が属する domain を
 * セクション見出し（stepTitle 相当）として記録する。
 * また現在のロケール（ja/en）に関係なく検索できるよう、日本語・英語の両フィールドを
 * まとめた haystack に対して照合する。
 */

import { ALL_EXAMS } from './exams.js';

/**
 * 検索対象の 1 レコード（フラット化されたリソース項目）。
 * @typedef {Object} ResourceRecord
 * @property {string} examId       試験 ID（例 'clf-c02'）。
 * @property {string} examCode     試験コード（例 'CLF-C02'）。
 * @property {string} examTitle    試験の正式名称。
 * @property {string} examShortLabel 試験の短縮ラベル（例 'CLF'）。
 * @property {string} stepId       セクション ID（step レコードでは step.id、task レコードでは domain.id）。
 * @property {string} stepTitle    セクションの英語タイトル（step レコードでは step.title、task レコードでは domain.title）。
 * @property {string} stepJpTitle  セクションの日本語タイトル（step レコードでは step.jpTitle、task レコードでは domain.jpTitle）。
 * @property {?string} taskId      タスク ID（step レベルのリソースでは null）。
 * @property {?string} taskTitle   タスクの英語タイトル（step レベルのリソースでは null）。
 * @property {?string} taskJpTitle タスクの日本語タイトル（step レベルのリソースでは null）。
 * @property {string} groupKey     リソースグループの key。
 * @property {string} groupLabel   グループの日本語ラベル。
 * @property {string} groupLabelEn グループの英語ラベル。
 * @property {string} iconClass    グループのアイコンクラス。
 * @property {string} iconColorClass グループのアイコン色クラス。
 * @property {string} title        リソースの日本語タイトル。
 * @property {string} titleEn      リソースの英語タイトル。
 * @property {string} url          リソース URL（日本語向け）。
 * @property {string} urlEn        リソース URL（英語向け）。
 * @property {string} note         補足（日本語）。
 * @property {string} noteEn       補足（英語）。
 * @property {boolean} recommend   おすすめフラグ。
 */

/** 値を安全に文字列化（null/undefined は空文字）。 */
function str(value) {
  return value == null ? '' : String(value);
}

/**
 * リソース索引を構築する。各試験の `steps[]` を走査し、step 直下の `resources[]` と
 * 各 `tasks[].resources[]` の両方を対象に、グループ内の item をフラットなレコードへ展開する。
 *
 * title か url を欠く item は検索対象にならないため除外する（`js/ui.js` の
 * normalizeResourceItems と同じ基準）。
 *
 * @param {Array<object>} [exams=ALL_EXAMS] - 索引化する試験オブジェクトの配列。
 *   既定は全 13 試験（`ALL_EXAMS`）。テスト用に部分集合を渡すこともできる。
 * @returns {ResourceRecord[]} フラット化されたリソースレコードの配列。
 */
export function buildResourceIndex(exams = ALL_EXAMS) {
  const records = [];
  const examList = Array.isArray(exams) ? exams : [];

  for (const exam of examList) {
    if (!exam || typeof exam !== 'object') continue;
    const examMeta = {
      examId: str(exam.id),
      examCode: str(exam.code),
      examTitle: str(exam.title),
      examShortLabel: str(exam.shortLabel),
    };

    // step レベルのリソース（`exam.steps[].resources`）。taskId は null。
    const steps = Array.isArray(exam.steps) ? exam.steps : [];
    for (const step of steps) {
      if (!step || typeof step !== 'object') continue;
      const stepMeta = {
        stepId: str(step.id),
        stepTitle: str(step.title),
        stepJpTitle: str(step.jpTitle),
      };
      pushGroups(records, step.resources, examMeta, stepMeta, {
        taskId: null,
        taskTitle: null,
        taskJpTitle: null,
      });
    }

    // task レベルのリソース（`exam.domains[].tasks[].resources`）。
    // domain をセクション見出し（stepTitle 相当）として記録する。
    const domains = Array.isArray(exam.domains) ? exam.domains : [];
    for (const domain of domains) {
      if (!domain || typeof domain !== 'object') continue;
      const domainMeta = {
        stepId: str(domain.id),
        stepTitle: str(domain.title),
        stepJpTitle: str(domain.jpTitle),
      };
      const tasks = Array.isArray(domain.tasks) ? domain.tasks : [];
      for (const task of tasks) {
        if (!task || typeof task !== 'object') continue;
        pushGroups(records, task.resources, examMeta, domainMeta, {
          taskId: str(task.id),
          taskTitle: str(task.title),
          taskJpTitle: str(task.jpTitle),
        });
      }
    }
  }

  return records;
}

/**
 * リソースグループ配列を走査してレコードを `out` に追加する内部ヘルパー。
 * @param {ResourceRecord[]} out
 * @param {*} groups - グループ配列（未定義や非配列は無視）。
 * @param {{examId:string,examCode:string,examTitle:string,examShortLabel:string}} examMeta
 * @param {{stepId:string,stepTitle:string,stepJpTitle:string}} stepMeta
 * @param {{taskId:?string,taskTitle:?string,taskJpTitle:?string}} taskMeta
 */
function pushGroups(out, groups, examMeta, stepMeta, taskMeta) {
  if (!Array.isArray(groups)) return;
  for (const group of groups) {
    if (!group || typeof group !== 'object') continue;
    const groupMeta = {
      groupKey: str(group.key),
      groupLabel: str(group.label),
      groupLabelEn: str(group.labelEn),
      iconClass: str(group.iconClass),
      iconColorClass: str(group.iconColorClass),
    };
    const items = Array.isArray(group.items) ? group.items : [];
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const title = str(item.title);
      const url = str(item.url);
      // title か url を欠く項目は検索・表示に使えないため除外する。
      if (!title || !url) continue;
      out.push({
        ...examMeta,
        ...stepMeta,
        ...taskMeta,
        ...groupMeta,
        title,
        titleEn: str(item.titleEn),
        url,
        urlEn: str(item.urlEn),
        note: str(item.note),
        noteEn: str(item.noteEn),
        recommend: item.recommend === true,
      });
    }
  }
}

/**
 * 1 レコードから照合用の haystack 文字列（小文字化済み）を作る。
 * ロケールに関係なくヒットさせるため日本語・英語フィールドを両方含める。
 * @param {ResourceRecord} record
 * @returns {string}
 */
function haystackOf(record) {
  return [
    record.title,
    record.titleEn,
    record.note,
    record.noteEn,
    record.url,
    record.urlEn,
    record.groupLabel,
    record.groupLabelEn,
  ]
    .join('\n')
    .toLowerCase();
}

/**
 * 索引に対してキーワード検索を行う。大文字小文字を区別しない部分一致で、
 * クエリを空白で分割した全ての語を含むレコードのみ返す（AND 条件）。
 * これにより 'quick sight' のように分けて入力しても 'QuickSight' のドキュメントに
 * ヒットする。
 *
 * @param {ResourceRecord[]} index - `buildResourceIndex()` が返す配列。
 * @param {string} query - 検索キーワード。前後空白は無視し、空・空白のみなら [] を返す。
 * @param {Object} [options]
 * @param {string} [options.examId] - 指定すると、その試験に絞って検索する（モード1）。
 *   未指定なら全試験を横断検索する（モード2）。
 * @param {number} [options.limit=200] - 返す件数の上限。
 * @returns {ResourceRecord[]} 一致したレコード配列。recommend:true を先頭に寄せ、
 *   その後は索引（試験）順を保つ。同一の (examId + url) は重複排除する。
 */
export function searchResources(index, query, { examId, limit = 200 } = {}) {
  const records = Array.isArray(index) ? index : [];
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (!trimmed) return [];

  const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const scoped = examId ? records.filter((r) => r && r.examId === examId) : records;

  const seen = new Set();
  const matches = [];
  for (const record of scoped) {
    if (!record) continue;
    const haystack = haystackOf(record);
    // 全ての語を含む場合のみ一致とみなす（AND 条件）。
    if (!terms.every((term) => haystack.includes(term))) continue;

    const dedupeKey = `${record.examId}\n${record.url}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    matches.push(record);
  }

  // recommend:true を先頭へ。安定ソートなので同グループ内は索引（試験）順を保つ。
  matches.sort((a, b) => (b.recommend === true ? 1 : 0) - (a.recommend === true ? 1 : 0));

  const cap = Number.isFinite(limit) && limit > 0 ? limit : matches.length;
  return matches.slice(0, cap);
}
