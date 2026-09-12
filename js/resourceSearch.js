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
 * 試験ガイド由来の「重要な AWS サービス名 / 概念キーワード」辞書（catalog）を構築する
 * ピュア関数（issue #209）。
 *
 * 背景 / なぜ必要か: AI 検索の HyDE（`js/ui.js` の expandQueryToAwsKeywords）は、曖昧な
 * クエリを具体的な AWS サービス名へ「モデルに推測させる」ことに全面的に依存している。
 * しかし新しめ・エッジなサービス（issue #209 のリトマス試験である "Quick" → Amazon
 * QuickSight / Amazon Q など）は、LLM が学習していない場合に展開語へ現れず、検索から
 * 抜け落ちる。一方で各試験データには、その試験で「どのサービス / 概念が重要か」が
 * `knowledge` / `knowledgeEn` 配列（素の AWS サービス名文字列）として明示されており、
 * これはモデルの知識に依存しない**恒久的な出典**になる。この関数はその出典を辞書化し、
 * HyDE の展開語を補強する材料（`augmentTermsWithCatalog` が使う）を提供する。
 *
 * 走査対象は `buildResourceIndex` と整合を保つ: step レベル（`exam.steps[].knowledge` /
 * `knowledgeEn`）と task レベル（`exam.domains[].tasks[].knowledge` / `knowledgeEn`）の
 * 両方を歩く。値は文字列または配列を受け付け、trim し、空要素は捨てる。大文字小文字を
 * 区別せず重複排除し、最初に現れた表記（casing）を保持する。DOM / ネットワーク非依存。
 *
 * @param {Array<object>} [exams=ALL_EXAMS] - 辞書化する試験オブジェクトの配列。
 *   既定は全 13 試験（`ALL_EXAMS`）。テスト用に部分集合を渡すこともできる。
 * @returns {string[]} 一意な重要キーワードの配列（出現順を保持）。
 */
export function buildExamKeywordCatalog(exams = ALL_EXAMS) {
  const examList = Array.isArray(exams) ? exams : [];
  const seen = new Set();
  const catalog = [];

  const collect = (value) => {
    // 文字列単体でも配列でも受け付ける。
    const values = Array.isArray(value) ? value : value == null ? [] : [value];
    for (const raw of values) {
      const keyword = str(raw).trim();
      if (!keyword) continue;
      const key = keyword.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      catalog.push(keyword);
    }
  };

  for (const exam of examList) {
    if (!exam || typeof exam !== 'object') continue;

    // step レベルの knowledge / knowledgeEn。
    const steps = Array.isArray(exam.steps) ? exam.steps : [];
    for (const step of steps) {
      if (!step || typeof step !== 'object') continue;
      collect(step.knowledge);
      collect(step.knowledgeEn);
    }

    // task レベルの knowledge / knowledgeEn（buildResourceIndex と同じ domain→task 走査）。
    const domains = Array.isArray(exam.domains) ? exam.domains : [];
    for (const domain of domains) {
      if (!domain || typeof domain !== 'object') continue;
      const tasks = Array.isArray(domain.tasks) ? domain.tasks : [];
      for (const task of tasks) {
        if (!task || typeof task !== 'object') continue;
        collect(task.knowledge);
        collect(task.knowledgeEn);
      }
    }
  }

  return catalog;
}

/**
 * catalog エントリを「そのまま検索語（live search term）として使ってよいか」を判定する
 * ピュア関数（issue #209 v1 レビュー指摘 3）。
 *
 * なぜ必要か: `searchResources` はクエリを空白で分割し、各トークンの**部分一致 AND**で
 * 照合する。そのため 1 文字トークンを含む短い catalog エントリ（典型例: 素の "Amazon Q"
 * → `amazon` AND `q`）は、`q` が queue / quotas / parquet / data quality などに偶然
 * 部分一致し、無関係なリソースを大量に（実データで約 38 件）引き込んでグラウンディングを
 * 薄めてしまう。一方 "Amazon Q Developer" や "Amazon Q Business" は `developer` /
 * `business` という**アンカー語**があるため過剰一致しない。
 *
 * 判定規則: 句読点を除いたトークン列に 1 文字以下のトークンが含まれ、かつトークン総数が
 * 2 個以下（＝過剰一致を抑えるアンカー語が無い）の場合のみ「危険（unsafe）」として
 * 検索語に使わない。これにより素の "Amazon Q" だけを弾き、"Amazon Q Developer" 等の
 * 有用な複数語サービスは温存する（検証済み: 実データで弾かれるのは "Amazon Q" 系のみ）。
 *
 * @param {string} entry - catalog エントリ。
 * @returns {boolean} 検索語として安全なら true。
 */
export function isSafeCatalogSearchTerm(entry) {
  const value = str(entry).trim();
  if (!value) return false;
  // 句読点（例 スラッシュ）を落としてから空白分割で「検索トークン」を作る。
  const tokens = value
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (tokens.length === 0) return false;
  const hasShortToken = tokens.some((t) => t.length < 2);
  // 1 文字トークンがあり、かつアンカー語（3 トークン目以降）が無いものだけ危険とみなす。
  return !(hasShortToken && tokens.length <= 2);
}

/**
 * 「概念（intent）→ サービス」の小さな手動エイリアス表（issue #209 v1 レビュー指摘 5）。
 *
 * なぜ必要か: `augmentTermsWithCatalog` の関連判定は**字面（部分一致）**ベースなので、
 * サービス名と語が重ならない曖昧クエリ（例 "BIツール" ↔ Amazon QuickSight）は catalog を
 * 引けない。概念→サービスの完全な意味的対応は決定的ピュア関数の範囲外だが、試験データに
 * 実在するサービスへの**低リスクで小さな手動エイリアス**なら、字面が重ならないクエリでも
 * 意図するサービスを引ける。ここは重い意味マッピングを導入せず、代表的な数語に絞る。
 *
 * 各エントリのキー（概念語, 小文字）にクエリが（部分一致で）触れたら、値のサービス語群を
 * 「クエリ語」として扱い、通常の catalog 照合に載せる（catalog に無いサービスは加えない）。
 * @type {ReadonlyArray<{concept: string, services: string[]}>}
 */
export const CONCEPT_SERVICE_ALIASES = [
  { concept: 'biツール', services: ['Amazon QuickSight'] },
  { concept: 'bi tool', services: ['Amazon QuickSight'] },
  { concept: 'ビジネスインテリジェンス', services: ['Amazon QuickSight'] },
  { concept: 'business intelligence', services: ['Amazon QuickSight'] },
  { concept: 'ダッシュボード', services: ['Amazon QuickSight'] },
  { concept: 'dashboard', services: ['Amazon QuickSight'] },
];

/**
 * HyDE の展開語（terms）に、クエリと関連する試験ガイド辞書（catalog）のエントリを
 * 足し込むピュア関数（issue #209 / v1 レビュー指摘 1・3・5 対応）。
 *
 * これは issue #209 が求める「試験ガイドごとに重要なサービス / 概念を整理し、それを
 * HyDE に反映する」を、モデルに依存しない決定的なロジックとして実装したもの。モデルが
 * "Amazon QuickSight" を展開語に出さなくても、クエリに "Quick" / "QuickSight" が含まれて
 * いれば辞書の "Amazon QuickSight" を引き込み、`searchResourcesMulti` が公開済みの
 * QuickSight リソースを見つけられるようにする。
 *
 * 「関連する」の判定は緩めの部分一致（大文字小文字を無視）:
 *   - いずれかのクエリ語が catalog エントリの部分文字列（例 'Quick' ⊂ 'Amazon QuickSight'）、
 *     または
 *   - catalog エントリがいずれかのクエリ語の部分文字列（例 catalog の 'Amazon Q Developer'
 *     が クエリ語 'Amazon Q Developer とは' に含まれる）。
 *
 * v1 レビュー対応:
 *   - 指摘 3: `isSafeCatalogSearchTerm` を通らない過剰一致トークン（素の "Amazon Q" 等）は
 *     検索語に加えない（グラウンディングのノイズ希釈を防ぐ）。
 *   - 指摘 5: `CONCEPT_SERVICE_ALIASES` により、字面が重ならない概念クエリ（例 "BIツール"）
 *     でも対応サービス（catalog に実在するもの）を引ける。
 *
 * 結果は terms と関連 catalog エントリの和集合。大文字小文字を無視して重複排除し、順序は
 * 「元の terms が先、その後に catalog 順で追加分」を保つ。プロンプト / 候補サイズを抑える
 * ため `opts.limit`（既定 24）で全体を打ち切る。入力（terms / catalog）は変更しない。
 *
 * @param {string[]} terms - HyDE の展開語（`[query, ...expandedTerms]` を想定）。
 * @param {string[]} catalog - `buildExamKeywordCatalog()` が返す辞書。
 * @param {Object} [opts]
 * @param {number} [opts.limit=24] - 返す語数の上限。
 * @returns {string[]} terms ∪（関連する catalog エントリ）。重複排除・順序保持済み。
 */
export function augmentTermsWithCatalog(terms, catalog, { limit = 24 } = {}) {
  const termList = Array.isArray(terms) ? terms : [];
  const catalogList = Array.isArray(catalog) ? catalog : [];

  const seen = new Set();
  const result = [];

  const add = (raw) => {
    const value = str(raw).trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(value);
  };

  // 1) 元の terms を先に（空・空白は無視、重複排除）。
  for (const term of termList) add(term);

  // 関連判定に使う、trim 済み・非空のクエリ語（小文字）。
  const queryTermsLower = termList
    .map((t) => str(t).trim().toLowerCase())
    .filter(Boolean);

  // 指摘 5: 概念エイリアス。クエリが概念語を**含む**とき（前方一致のみ）、対応サービス語を
  // 「クエリ語」として扱い、下の catalog 照合で拾えるようにする（字面が重ならなくても可）。
  // v2 レビュー指摘: 逆方向（`conceptLower.includes(q)`）は過剰発火する。短い/一般的な
  // クエリ語（例 'b' / 'business' / 'ビジネス'）が概念語（'business intelligence' /
  // 'ビジネスインテリジェンス'）の部分文字列というだけで QuickSight を注入してしまうため、
  // 前方向（クエリが概念語を含む）のみで判定する。`q === conceptLower` は
  // `q.includes(conceptLower)` が真になるので、完全一致の概念クエリは引き続き発火する。
  for (const { concept, services } of CONCEPT_SERVICE_ALIASES) {
    const conceptLower = str(concept).trim().toLowerCase();
    if (!conceptLower) continue;
    const hit = queryTermsLower.some((q) => q.includes(conceptLower));
    if (hit) {
      for (const svc of services) {
        const svcLower = str(svc).trim().toLowerCase();
        if (svcLower) queryTermsLower.push(svcLower);
      }
    }
  }

  // 2) クエリと関連する catalog エントリを catalog 順で追加。
  //    指摘 3: 過剰一致する短い/曖昧なエントリは検索語に使わない。
  for (const entry of catalogList) {
    const entryStr = str(entry).trim();
    if (!entryStr) continue;
    if (!isSafeCatalogSearchTerm(entryStr)) continue;
    const entryLower = entryStr.toLowerCase();
    const relevant = queryTermsLower.some(
      (q) => entryLower.includes(q) || q.includes(entryLower),
    );
    if (relevant) add(entryStr);
  }

  const cap = Number.isFinite(limit) && limit > 0 ? limit : result.length;
  return result.slice(0, cap);
}

/**
 * grounding 用の候補選抜（`selectAiCandidates`）に渡す「採点用クエリ」を、拡張後の
 * term 集合から組み立てるピュア関数（issue #209 v1 レビュー指摘 4）。
 *
 * なぜ必要か: `selectAiCandidates(candidates, query, cap)` を**生クエリ**で採点すると、
 * catalog 経由でのみ候補に入ったリソース（例 "Amazon QuickSight" で引かれた QuickSight
 * ドキュメントだが、生クエリには "quick" が無い場合）は `scoreResourceRelevance` で 0 点に
 * なり、40 件キャップの外へ押し出されてモデルに届かない恐れがある。採点対象を「拡張後の
 * term 集合」にすることで、catalog 由来のヒットもスコアが付き、モデルに確実に届く。
 *
 * `selectAiCandidates` / `scoreResourceRelevance` は変更せず、呼び出し側が渡すクエリ文字列を
 * この関数で作るだけにとどめる（純粋・テスト可能なまま）。
 *
 * @param {string[]} terms - `augmentTermsWithCatalog` が返した拡張後の term 集合。
 * @returns {string} 採点用に空白連結したクエリ文字列（重複語は除去、順序保持）。
 */
export function buildAugmentedScoringQuery(terms) {
  const termList = Array.isArray(terms) ? terms : [];
  const seen = new Set();
  const parts = [];
  for (const term of termList) {
    const value = str(term).trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(value);
  }
  return parts.join(' ');
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

/**
 * 複数の展開語（expanded terms）で `searchResources` を実行し、その結果を和集合で
 * マージ（union）して重複排除（dedupe）する。AI 検索の HyDE（Hypothetical Document
 * Embeddings）フローで使う（issue #201）。
 *
 * 背景: AI 検索はこれまで、ユーザーのクエリで **まずキーワード検索** を行い、その
 * ヒットだけを AI に再ランクさせていた。そのため「分析用のAIサービス」のような
 * ふわっとしたクエリはどのリソースの haystack にも部分一致せず、候補が 0 件になり
 * AI が何もできなかった。HyDE では、まず AI にこの曖昧なクエリから具体的な AWS
 * サービス名 / キーワード（例: "Amazon Q", "SageMaker", "Comprehend"）を生成させ、
 * その **展開語のそれぞれ** で索引を検索して和集合を取ることで、元クエリでは 0 件でも
 * 候補を得られるようにする。得られた候補は従来どおり AI に「候補リストの中からのみ
 * 推薦・ランク付けさせる」grounding として渡す。
 *
 * `searchResources` は語を空白で分割して AND 条件で照合するため、1 つの展開語が
 * 複数語（例 "Amazon QuickSight"）でも意図どおり動く。ここでは展開語ごとに
 * `searchResources` を呼び、返ってきたレコードを (examId + url) をキーに重複排除して
 * つなげる。順序は「最初にヒットした展開語の順」を保つ安定な和集合とし、そのうえで
 * recommend:true を先頭へ寄せる（`searchResources` と同じ表示方針）。
 *
 * DOM / ネットワーク非依存のピュア関数なので、ブラウザ無しで単体テストできる。
 * AI 呼び出し自体（曖昧なクエリ → 展開語）は UI 側（`js/ui.js`）が担い、ここには
 * 展開語のマージ・重複排除という純粋なロジックだけを置く。
 *
 * @param {ResourceRecord[]} index - `buildResourceIndex()` が返す配列。
 * @param {string[]} terms - 検索する展開語の配列。空・空白のみの語は無視する。
 * @param {Object} [options]
 * @param {string} [options.examId] - 指定するとその試験に絞る（`searchResources` と同じ）。
 * @param {number} [options.perTermLimit=200] - 展開語ごとの `searchResources` の上限。
 * @param {number} [options.limit=200] - マージ後に返す件数の上限。
 * @returns {ResourceRecord[]} 展開語全体の和集合（重複排除済み）。recommend:true を先頭へ
 *   寄せ、それ以外は「最初にヒットした展開語の順 → その語の結果順」を保つ。
 */
export function searchResourcesMulti(index, terms, { examId, perTermLimit = 200, limit = 200 } = {}) {
  const termList = Array.isArray(terms) ? terms : [];
  const seen = new Set();
  const merged = [];

  for (const term of termList) {
    const trimmed = typeof term === 'string' ? term.trim() : '';
    if (!trimmed) continue;
    const results = searchResources(index, trimmed, { examId, limit: perTermLimit });
    for (const record of results) {
      if (!record) continue;
      const dedupeKey = `${record.examId}\n${record.url}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      merged.push(record);
    }
  }

  // recommend:true を先頭へ。安定ソートなので同グループ内は和集合の順序（最初に
  // ヒットした展開語の順）を保つ。
  merged.sort((a, b) => (b.recommend === true ? 1 : 0) - (a.recommend === true ? 1 : 0));

  const cap = Number.isFinite(limit) && limit > 0 ? limit : merged.length;
  return merged.slice(0, cap);
}

/**
 * 1 レコードとクエリ語の一致度を粗く採点する。AI モードで「モデルに渡す候補（grounding）」を
 * 選ぶときに使う。`searchResources` の recommend 優先ソートは表示順としては妥当だが、
 * その順で上位 N 件を切り取ると、recommend でない強い一致がキャップ外に押し出され、
 * キーワードモードには出るのに AI モードには渡らない、という取りこぼしが起きうる（issue #189 レビュー指摘 2）。
 * そこで AI 候補の選抜だけは、この関数で計算した「一致度」で並べ替えてから上位を採る。
 *
 * 採点は軽量なヒューリスティック（DOM/ネットワーク非依存のピュア関数）:
 *  - タイトル（日英）に語が含まれる: 語ごとに +3
 *  - URL（日英）に語が含まれる: 語ごとに +2
 *  - 補足・グループ名などその他フィールドに含まれる: 語ごとに +1
 *  - recommend フラグ: +1（同点時の穏やかなタイブレーク）
 * すべての語について最も強い出現箇所を採点する。
 *
 * @param {ResourceRecord} record
 * @param {string} query
 * @returns {number} 一致度スコア（大きいほど関連が強い）。
 */
export function scoreResourceRelevance(record, query) {
  if (!record) return 0;
  const trimmed = typeof query === 'string' ? query.trim().toLowerCase() : '';
  const terms = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  if (terms.length === 0) return 0;

  const titleHay = [record.title, record.titleEn].join('\n').toLowerCase();
  const urlHay = [record.url, record.urlEn].join('\n').toLowerCase();
  const otherHay = [record.note, record.noteEn, record.groupLabel, record.groupLabelEn]
    .join('\n')
    .toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (titleHay.includes(term)) score += 3;
    else if (urlHay.includes(term)) score += 2;
    else if (otherHay.includes(term)) score += 1;
  }
  if (record.recommend === true) score += 1;
  return score;
}

/**
 * AI モードの grounding としてモデルに渡す候補を、関連度の高い順に最大 `limit` 件選ぶ。
 * `searchResources` の結果（recommend 優先の表示順）をそのまま上位 N 件で切ると
 * 強い一致を落としうるため、ここでは `scoreResourceRelevance` の降順で並べ替えてから
 * 上位を採る。安定ソートのため同点は元の（表示）順を保つ。
 *
 * @param {ResourceRecord[]} results - `searchResources` が返した一致レコード。
 * @param {string} query - 検索キーワード。
 * @param {number} [limit=40] - 返す候補の上限（プロンプトサイズを抑えるため）。
 * @returns {ResourceRecord[]} 関連度順に並べ替え、上位 `limit` 件に絞った候補。
 */
export function selectAiCandidates(results, query, limit = 40) {
  const list = Array.isArray(results) ? results.filter(Boolean) : [];
  const cap = Number.isFinite(limit) && limit > 0 ? limit : list.length;
  // 元の順序を保持したうえで安定ソートするため index を添える。
  return list
    .map((record, index) => ({ record, index, score: scoreResourceRelevance(record, query) }))
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .slice(0, cap)
    .map((entry) => entry.record);
}
