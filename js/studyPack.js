/**
 * studyPack.js — 静的な試験データ（js/data/*.js）を NotebookLM 等に取り込みやすい
 * 学習アセット文字列へ変換するピュア関数群。issue #165（NotebookLM 学習パック）の
 * バックエンド不要な前進部分。
 *
 * 設計方針（js/quizCsv.js と同じ）:
 *  - 入力は「素の試験オブジェクト」だけ（js/data/<exam>.js が export する形、および
 *    js/data/common-steps.js の COMMON_STEPS と同じ resources/items 形）。
 *  - DOM を参照しない・localStorage を読まない・storage.js を import しない。
 *    そのためブラウザ無し（Node）でも単体テストできる。
 *  - CSV エスケープは js/quizCsv.js の escapeCsvField を再利用し、実装の分岐を避ける。
 *    CSV は RFC 4180 準拠・CRLF 改行・末尾改行あり（quizHistoryToCsv と同じ規約）。
 *    UTF-8 BOM は Excel 対策として呼び出し側（UI）が付与する。本モジュールは付けない。
 *  - locale オプション（'ja' | 'en'）を受け取り、'en' のときは *En フィールド
 *    （titleEn / noteEn / urlEn / descriptionEn / knowledgeEn / labelEn）を優先し、
 *    無ければ日本語フィールドへフォールバックする。既定は 'ja'。
 *  - 各ビルダー（buildResourceLinksMarkdown / buildResourceLinksCsv /
 *    buildStudyRouteMarkdown / buildGlossaryCsv）は「単一の試験オブジェクト」でも
 *    「試験オブジェクトの配列（ALL_EXAMS）」でも受け付ける。配列を渡すと全試験を
 *    連結した“全試験まとめ”アセットを生成する。これにより UI 側は、特定試験が
 *    選択されていない（既定の「すべて」タブ）状態でも 4 ボタンすべてで全試験版を
 *    ダウンロードでき、空選択時の挙動が 4 ボタンで一貫する。
 *
 * グロッサリー（リソース用語集）の定義:
 *  これは「AWS 用語の概念定義集」ではなく、リソースのタイトル→ノートを引いた
 *  “リソース索引（resource glossary）”である。UI ラベルも「リソース用語集」とし、
 *  概念定義を含むかのような誤解を避ける。
 *  試験データには専用の用語集フィールドが無いため、グロッサリーは resources[].items[]
 *  から決定論的に導出する。各リソース項目を 1 用語とみなし、
 *    term       = 項目タイトル（en なら titleEn、無ければ title）
 *    definition = 項目ノート（en なら noteEn、無ければ note）
 *    source     = 項目 URL（en なら urlEn、無ければ url）
 *    examCode   = その項目が属する試験コード（無ければ exam.id）
 *  とする。term（大小無視・前後空白除去）で重複排除し、最初に現れたものを採用する。
 *  この定義により、追加のヒューリスティック無しで安定・再現可能な CSV を生成できる。
 *
 * ZIP バンドルについて（意図的に見送り）:
 *  リポジトリの「依存を増やさない」方針と INTEGRATIONS_ONLY（外部ネットワーク不可）の
 *  制約に従い、ZIP ライブラリは追加しない。3 種類のアセット（リソースリンク Markdown /
 *  CSV、学習ルート Markdown、グロッサリー CSV）は個別ダウンロードとして提供する。
 *  1 つの ZIP へまとめるのは今回のスコープ外（レビュー容易性と無依存の維持を優先）。
 *  将来、依存無しの ZIP ライターを足す場合でも、本モジュールの各 generator が返す
 *  文字列を集めるだけで済むよう、純粋な「入力→文字列」構造を保っている。
 */

import { escapeCsvField } from './quizCsv.js';

/** 単一試験 or 試験配列を、null/undefined を除いた試験配列へ正規化する。 */
function normalizeExams(exams) {
  return (Array.isArray(exams) ? exams : [exams]).filter(Boolean);
}

/** locale に応じて主フィールド / *En フィールドのどちらかを返す（無ければフォールバック）。 */
function pick(locale, primary, en) {
  if (locale === 'en') {
    const v = en == null || en === '' ? primary : en;
    return v == null ? '' : v;
  }
  const v = primary == null || primary === '' ? en : primary;
  return v == null ? '' : v;
}

/** ステップの表示タイトル（ja は jpTitle 優先、en は title 優先）。 */
function stepTitleOf(step, locale) {
  if (!step) return '';
  if (locale === 'en') return step.title || step.jpTitle || step.id || '';
  return step.jpTitle || step.title || step.id || '';
}

/** ステップの説明文配列（en は descriptionEn 優先）。常に配列を返す。 */
function stepDescriptionsOf(step, locale) {
  if (!step) return [];
  const primary = Array.isArray(step.description) ? step.description : [];
  const en = Array.isArray(step.descriptionEn) ? step.descriptionEn : [];
  const chosen = locale === 'en' ? (en.length ? en : primary) : (primary.length ? primary : en);
  return chosen.filter((s) => typeof s === 'string' && s.trim() !== '');
}

/**
 * ステップの要点（knowledge）配列（en は knowledgeEn 優先）。
 * knowledge が無いステップも多いため、その場合は説明文（description）へフォールバックする。
 */
function stepKnowledgeOf(step, locale) {
  if (!step) return [];
  const primary = Array.isArray(step.knowledge) ? step.knowledge : [];
  const en = Array.isArray(step.knowledgeEn) ? step.knowledgeEn : [];
  const chosen = locale === 'en' ? (en.length ? en : primary) : (primary.length ? primary : en);
  const knowledge = chosen.filter((s) => typeof s === 'string' && s.trim() !== '');
  if (knowledge.length) return knowledge;
  return stepDescriptionsOf(step, locale);
}

/**
 * 試験の steps[].resources[].items[] を歩いて、リソース項目を平坦な配列に集める。
 * scripts/collect-resource-urls.mjs の走査方針を踏襲しつつ、リンクリスト生成に必要な
 * ステップ（ドメイン）情報とグループ情報も一緒に保持する。URL で重複排除する。
 *
 * @param {object} exam - 素の試験オブジェクト。
 * @param {{ locale?: string }} [opts]
 * @returns {Array<{examId:string, examCode:string, stepId:string, stepTitle:string,
 *   groupKey:string, group:string, title:string, url:string, note:string, recommend:boolean}>}
 */
export function collectResourceItems(exam, { locale = 'ja' } = {}) {
  const out = [];
  const seenUrls = new Set();
  if (!exam || !Array.isArray(exam.steps)) return out;

  const examId = exam.id || '';
  const examCode = exam.code || exam.id || '';

  for (const step of exam.steps) {
    if (!step) continue;
    const stepId = step.id || '';
    const stepTitle = stepTitleOf(step, locale);
    for (const group of Array.isArray(step.resources) ? step.resources : []) {
      if (!group) continue;
      const groupKey = group.key || '';
      const groupLabel = pick(locale, group.label, group.labelEn);
      for (const item of Array.isArray(group.items) ? group.items : []) {
        if (!item) continue;
        const url = String(pick(locale, item.url, item.urlEn) || '').trim();
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);
        out.push({
          examId,
          examCode,
          stepId,
          stepTitle,
          groupKey,
          group: groupLabel,
          title: String(pick(locale, item.title, item.titleEn) || '').trim(),
          url,
          note: String(pick(locale, item.note, item.noteEn) || '').trim(),
          recommend: item.recommend === true,
        });
      }
    }
  }
  return out;
}

/** 1 試験分のリソースリンク Markdown 本文（見出しレベルは baseLevel 起点）。 */
function resourceLinksMarkdownBody(exam, locale, baseLevel) {
  const en = locale === 'en';
  const items = collectResourceItems(exam, { locale });
  const lines = [];

  // ステップ（ドメイン）ごとにグルーピング。collectResourceItems はステップ順を保つ。
  const byStep = new Map();
  for (const it of items) {
    const key = it.stepId || it.stepTitle || '';
    if (!byStep.has(key)) byStep.set(key, { title: it.stepTitle, items: [] });
    byStep.get(key).items.push(it);
  }

  if (byStep.size === 0) {
    lines.push(en ? '_No resources found._' : '_リソースが見つかりませんでした。_');
    lines.push('');
    return lines;
  }

  const h2 = '#'.repeat(baseLevel + 1);
  const h3 = '#'.repeat(baseLevel + 2);
  for (const { title, items: stepItems } of byStep.values()) {
    lines.push(`${h2} ${title || (en ? 'Resources' : 'リソース')}`);
    lines.push('');
    // グループ（リソース種別）ごとに次の見出しレベルを付ける。
    const byGroup = new Map();
    for (const it of stepItems) {
      const gk = it.group || '';
      if (!byGroup.has(gk)) byGroup.set(gk, []);
      byGroup.get(gk).push(it);
    }
    for (const [group, groupItems] of byGroup) {
      if (group) {
        lines.push(`${h3} ${group}`);
        lines.push('');
      }
      for (const it of groupItems) {
        const label = it.title || it.url;
        let line = `- [${label}](${it.url})`;
        if (it.recommend) line += en ? ' ⭐ (recommended)' : ' ⭐ (おすすめ)';
        lines.push(line);
        if (it.note) lines.push(`  - ${it.note}`);
      }
      lines.push('');
    }
  }
  return lines;
}

/**
 * 試験のリソースリンクを、ステップ（ドメイン）ごとにグルーピングした Markdown で返す。
 * NotebookLM の「ソース」として貼り付けやすいよう、各項目を Markdown リンクにする。
 * 単一の試験でも、試験配列（ALL_EXAMS）でも受け付ける。配列のときは試験ごとに
 * H2 セクションへまとめ、その下にステップ／グループを H3/H4 で展開する。
 *
 * @param {object|Array<object>} exams - 単一試験または試験配列。
 * @param {{ locale?: string }} [opts]
 * @returns {string} Markdown 文書（末尾改行あり）。
 */
export function buildResourceLinksMarkdown(exams, { locale = 'ja' } = {}) {
  const en = locale === 'en';
  const list = normalizeExams(exams);
  const multi = Array.isArray(exams) && list.length > 1;
  const lines = [];

  const title = multi
    ? (en ? 'All Exams - Resource Links' : '全試験 - 参考リンク集')
    : `${[list[0]?.code || list[0]?.id || '', pick(locale, list[0]?.title, list[0]?.title)].filter(Boolean).join(' - ')} ${en ? 'Resource Links' : '参考リンク集'}`.trim();
  lines.push(`# ${title}`.trim());
  lines.push('');
  lines.push(en ? `Generated: ${new Date().toISOString().slice(0, 10)}` : `生成日: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');

  if (list.length === 0) {
    lines.push(en ? '_No resources found._' : '_リソースが見つかりませんでした。_');
    return lines.join('\n') + '\n';
  }

  if (multi) {
    // 全試験版: 各試験を H2 セクションにし、本文の見出しは H3 起点にする。
    for (const exam of list) {
      const examCode = exam?.code || exam?.id || '';
      const examTitle = pick(locale, exam?.title, exam?.title);
      lines.push(`## ${[examCode, examTitle].filter(Boolean).join(' - ')}`.trim());
      lines.push('');
      lines.push(...resourceLinksMarkdownBody(exam, locale, 2));
    }
  } else {
    lines.push(...resourceLinksMarkdownBody(list[0], locale, 1));
  }

  return lines.join('\n').replace(/\n+$/, '\n');
}

/** リソースリンク CSV のヘッダー（列順・意味の単一の定義）。 */
export const RESOURCE_CSV_HEADERS = [
  'examId',
  'examCode',
  'stepId',
  'stepTitle',
  'resourceGroup',
  'title',
  'url',
  'note',
  'recommend',
];

/**
 * 試験のリソースリンクを CSV 文字列で返す（RFC 4180・CRLF・末尾改行あり）。
 * 単一の試験でも、試験配列（ALL_EXAMS）でも受け付ける。配列のときは試験ごとの
 * 行を順に連結する（examId/examCode 列で試験を区別できる）。
 * @param {object|Array<object>} exams - 単一試験または試験配列。
 * @param {{ locale?: string }} [opts]
 * @returns {string}
 */
export function buildResourceLinksCsv(exams, { locale = 'ja' } = {}) {
  const rows = [RESOURCE_CSV_HEADERS.map(escapeCsvField).join(',')];
  for (const exam of normalizeExams(exams)) {
    for (const it of collectResourceItems(exam, { locale })) {
      const cells = [
        it.examId,
        it.examCode,
        it.stepId,
        it.stepTitle,
        it.group,
        it.title,
        it.url,
        it.note,
        it.recommend ? 'true' : 'false',
      ];
      rows.push(cells.map(escapeCsvField).join(','));
    }
  }
  return rows.join('\r\n') + '\r\n';
}

/** 1 試験分の学習ルート本文（ステップ見出しは stepLevel、既定 H2）。 */
function studyRouteMarkdownBody(exam, locale, stepLevel) {
  const en = locale === 'en';
  const lines = [];
  const steps = Array.isArray(exam?.steps) ? exam.steps : [];
  if (steps.length === 0) {
    lines.push(en ? '_No steps found._' : '_ステップが見つかりませんでした。_');
    lines.push('');
    return lines;
  }

  const stepHeading = '#'.repeat(stepLevel);
  let n = 0;
  for (const step of steps) {
    n++;
    lines.push('---');
    lines.push('');
    lines.push(`${stepHeading} ${en ? 'Step' : 'ステップ'} ${n}: ${stepTitleOf(step, locale)}`);
    lines.push('');

    const knowledge = stepKnowledgeOf(step, locale);
    if (knowledge.length) {
      lines.push(en ? '**Key points:**' : '**要点:**');
      for (const k of knowledge) lines.push(`- ${k}`);
      lines.push('');
    }

    const resourceCount = collectResourceItems({ id: exam.id, code: exam.code, steps: [step] }, { locale }).length;
    if (resourceCount > 0) {
      lines.push(
        en
          ? `_See the resource link list for ${resourceCount} reference(s) in this step._`
          : `_このステップの参考リンク ${resourceCount} 件はリンク集を参照してください。_`,
      );
      lines.push('');
    }
  }
  return lines;
}

/**
 * 試験のステップから学習ルート（study route）Markdown を生成する。
 * storage.js の exportQuizHistory のマークダウンと同じトーン・構造を踏襲する
 * （先頭 H1 に試験名＋生成日、各ステップを H2、要点を箇条書き）。
 * 単一の試験でも、試験配列（ALL_EXAMS）でも受け付ける。配列のときは試験ごとに
 * H2 セクションへまとめ、ステップ見出しを H3 に下げる。
 *
 * @param {object|Array<object>} exams - 単一試験または試験配列。
 * @param {{ locale?: string }} [opts]
 * @returns {string} Markdown 文書（末尾改行あり）。
 */
export function buildStudyRouteMarkdown(exams, { locale = 'ja' } = {}) {
  const en = locale === 'en';
  const list = normalizeExams(exams);
  const multi = Array.isArray(exams) && list.length > 1;
  const lines = [];

  if (multi) {
    lines.push(`# ${en ? 'All Exams - Study Route' : '全試験 - 学習ルート'}`.trim());
    lines.push('');
    lines.push(en ? `Generated: ${new Date().toISOString().slice(0, 10)}` : `生成日: ${new Date().toISOString().slice(0, 10)}`);
    lines.push('');
    if (list.length === 0) {
      lines.push(en ? '_No steps found._' : '_ステップが見つかりませんでした。_');
      return lines.join('\n') + '\n';
    }
    for (const exam of list) {
      const examCode = exam?.code || exam?.id || '';
      const examTitle = pick(locale, exam?.title, exam?.title);
      lines.push(`## ${[examCode, examTitle].filter(Boolean).join(' - ')}`.trim());
      lines.push('');
      lines.push(...studyRouteMarkdownBody(exam, locale, 3));
    }
    return lines.join('\n').replace(/\n+$/, '\n');
  }

  const exam = list[0];
  const examCode = exam?.code || exam?.id || '';
  const examTitle = pick(locale, exam?.title, exam?.title);
  const subtitle = pick(locale, exam?.subtitle, exam?.subtitleEn);
  lines.push(`# ${[examCode, examTitle].filter(Boolean).join(' - ')} ${en ? 'Study Route' : '学習ルート'}`.trim());
  lines.push('');
  if (subtitle) {
    lines.push(subtitle);
    lines.push('');
  }
  lines.push(en ? `Generated: ${new Date().toISOString().slice(0, 10)}` : `生成日: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');

  if (!exam) {
    lines.push(en ? '_No steps found._' : '_ステップが見つかりませんでした。_');
    return lines.join('\n') + '\n';
  }

  lines.push(...studyRouteMarkdownBody(exam, locale, 2));
  return lines.join('\n').replace(/\n+$/, '\n');
}

/** グロッサリー CSV のヘッダー（列順・意味の単一の定義）。 */
export const GLOSSARY_CSV_HEADERS = ['term', 'definition', 'source', 'examCode'];

/**
 * 試験データからグロッサリー（用語集）CSV を生成する。
 * 単一の試験オブジェクトでも、試験オブジェクトの配列（ALL_EXAMS）でも受け付ける。
 * 用語の定義はモジュール先頭コメント参照（resource item を 1 用語として扱う）。
 * term（大小無視・前後空白除去）で重複排除する。RFC 4180・CRLF・末尾改行あり。
 *
 * @param {object|Array<object>} exams - 単一試験または試験配列。
 * @param {{ locale?: string }} [opts]
 * @returns {string}
 */
export function buildGlossaryCsv(exams, { locale = 'ja' } = {}) {
  const rows = [GLOSSARY_CSV_HEADERS.map(escapeCsvField).join(',')];
  const seenTerms = new Set();

  for (const exam of normalizeExams(exams)) {
    for (const it of collectResourceItems(exam, { locale })) {
      const term = it.title;
      if (!term) continue;
      const dedupeKey = term.toLowerCase();
      if (seenTerms.has(dedupeKey)) continue;
      seenTerms.add(dedupeKey);
      const cells = [term, it.note, it.url, it.examCode];
      rows.push(cells.map(escapeCsvField).join(','));
    }
  }
  return rows.join('\r\n') + '\r\n';
}
