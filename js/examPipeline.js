/**
 * Multi-stage exam generation pipeline (issue #225).
 *
 * Single-shot generation ("write one question about this task") converges on
 * the model's most probable answer — e.g. every AIB-C01 question ending up as
 * "establish an AI CoE" — because each question is written in isolation and
 * the only guard was a hint listing the last few question texts. This module
 * splits generation into stages; everything that does not need a model is
 * deterministic code here, and the model is only asked to plan and to write.
 *
 *   Stage 0  buildExamBlueprint   (code)  one slot per question: domain, task,
 *                                          the exact knowledge/skill item to
 *                                          test, question type, perspective,
 *                                          industry, correct-answer letter.
 *   Stage 1  buildPlannerPrompt   (LLM)   ONE call that turns the blueprint
 *            parsePlan / validatePlan      into an exam plan: per slot the
 *                                          concept the correct answer tests, a
 *                                          scenario seed and distractor themes,
 *                                          with concepts unique across the exam.
 *                                          Duplicates are removed in code.
 *   Stage 2  buildSlotPromptSuffix (LLM)  one call per question, told exactly
 *                                          what to test and which concepts are
 *                                          already taken by other questions.
 *   Stage 3  isDuplicateQuestion  (code)  near-duplicate detection on the
 *            correctChoiceText             correct choice / question text, so
 *                                          a slot can be regenerated once with
 *                                          the offending concept banned.
 *
 * Pure module: no DOM / network / storage. `rng` is injectable for tests.
 */

import { getLocale } from './i18n.js';
import { assignTaskTargets, assignAnswerLetters } from './quiz.js';

// ─── Stage 0: blueprint ─────────────────────────────────────

/** How a question asks, independent of what it asks. */
export const QUESTION_TYPES = [
  { id: 'select-best', ja: 'シナリオに最も適した選択肢を選ぶ', en: 'choose the best option for a scenario' },
  { id: 'first-step', ja: '最初に取るべき行動を選ぶ', en: 'decide what to do first' },
  { id: 'identify-risk', ja: 'リスク・課題・ギャップを特定する', en: 'identify the risk, issue or gap' },
  { id: 'metric', ja: '適切な評価指標・成功基準を選ぶ', en: 'choose the right metric or success criterion' },
  { id: 'tradeoff', ja: '2 つのアプローチのトレードオフを判断する', en: 'judge the trade-off between two approaches' },
  { id: 'define', ja: '概念・用語の正しい説明を選ぶ', en: 'pick the correct description of a concept or term' },
  { id: 'diagnose', ja: '起きている問題の原因を特定する', en: 'diagnose the cause of an observed problem' },
];

const BUSINESS_PERSPECTIVES = [
  { ja: '経営層（CEO / CFO）', en: 'executive leadership (CEO / CFO)' },
  { ja: '事業部門のリーダー', en: 'a line-of-business leader' },
  { ja: '人事・組織開発の責任者', en: 'the head of HR / organizational development' },
  { ja: '法務・コンプライアンス担当', en: 'legal / compliance' },
  { ja: 'プロダクトマネージャー', en: 'a product manager' },
  { ja: 'データ / IT 部門の責任者', en: 'the head of data / IT' },
];

const TECHNICAL_PERSPECTIVES = [
  { ja: 'ソリューションアーキテクト', en: 'a solutions architect' },
  { ja: 'アプリケーション開発者', en: 'an application developer' },
  { ja: '運用・SRE 担当', en: 'an operations / SRE engineer' },
  { ja: 'セキュリティ担当', en: 'a security engineer' },
  { ja: 'データエンジニア', en: 'a data engineer' },
  { ja: 'コスト最適化の担当者', en: 'someone responsible for cost optimization' },
];

export const INDUSTRIES = [
  { ja: '医療・ヘルスケア', en: 'healthcare' },
  { ja: '金融・保険', en: 'financial services / insurance' },
  { ja: '小売・EC', en: 'retail / e-commerce' },
  { ja: '製造', en: 'manufacturing' },
  { ja: '公共・行政', en: 'the public sector' },
  { ja: 'メディア・エンタメ', en: 'media / entertainment' },
  { ja: '物流・運輸', en: 'logistics / transportation' },
  { ja: '教育', en: 'education' },
  { ja: 'スタートアップ（SaaS）', en: 'a SaaS startup' },
  { ja: 'エネルギー・公益', en: 'energy / utilities' },
];

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isEn() {
  return getLocale() === 'en';
}

/**
 * The knowledge / skill bullets of a task statement, in the current locale.
 * Header lines ("対象知識:", "Knowledge of:") are dropped. Falls back to the
 * task title when the statement has no bullets.
 * @param {object} task
 * @returns {string[]}
 */
export function extractTaskItems(task) {
  if (!task) return [];
  const raw = isEn() ? (task.descriptionEn || task.description) : (task.description || task.descriptionEn);
  const lines = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  // Two statement formats exist in js/data: bullet lists under "対象知識:" /
  // "Knowledge of:" headers (SAA etc.), and numbered lines such as
  // "スキル 4.3.1: …" / "Knowledge 1.2.3: …" (AIB etc.). Task header lines are skipped.
  const BULLET = /^[-•・*]\s*/;
  const NUMBERED = /^(?:スキル|知識|Skill|Knowledge)\s*\d+(?:\.\d+)+\s*[:：]\s*/i;
  const items = lines
    .map((l) => String(l).trim())
    .filter((l) => BULLET.test(l) || NUMBERED.test(l))
    .map((l) => l.replace(BULLET, '').replace(NUMBERED, '').trim())
    .filter(Boolean);
  if (items.length) return items;
  const title = isEn() ? (task.title || task.jpTitle) : (task.jpTitle || task.title);
  return title ? [String(title)] : [];
}

/**
 * Stage 0. One slot per question.
 * @param {object} opts
 * @param {object} opts.exam                 exam data (domains with tasks)
 * @param {number} opts.count                number of questions
 * @param {object} [opts.task]               fixed task (task-mode quiz); omit for cross-domain
 * @param {string} [opts.level]              exam level ('Business' picks business perspectives)
 * @param {() => number} [opts.rng]
 * @returns {Array<{ index: number, domain: object|null, task: object|null, item: string, type: object, perspective: object, industry: object, answerLetter: string }>}
 */
export function buildExamBlueprint({ exam, count, task = null, level = 'Associate', rng = Math.random }) {
  const targets = task
    ? Array.from({ length: count }, () => ({ domain: null, task }))
    : assignTaskTargets(exam?.domains || [], count, rng);
  const letters = assignAnswerLetters(count, rng);
  const perspectives = shuffle(level === 'Business' ? BUSINESS_PERSPECTIVES : TECHNICAL_PERSPECTIVES, rng);
  const types = shuffle(QUESTION_TYPES, rng);
  const industries = shuffle(INDUSTRIES, rng);

  // Round-robin over each task's items (shuffled once per task) so a task that
  // gets k questions covers k distinct items before any repeats.
  const itemCursor = new Map();
  const nextItem = (t) => {
    if (!t) return '';
    if (!itemCursor.has(t)) itemCursor.set(t, { items: shuffle(extractTaskItems(t), rng), next: 0 });
    const c = itemCursor.get(t);
    return c.items.length ? c.items[c.next++ % c.items.length] : '';
  };

  return targets.map((tg, i) => ({
    index: i,
    domain: tg?.domain || null,
    task: tg?.task || null,
    item: nextItem(tg?.task || null),
    // Cycle lengths 7 / 6 / 10 are pairwise distinct so combinations repeat late.
    type: types[i % types.length],
    perspective: perspectives[i % perspectives.length],
    industry: industries[i % industries.length],
    answerLetter: letters[i],
  }));
}

/**
 * Serializable form of a blueprint for persisting on an ExamSet (data objects
 * are replaced by ids; axis objects by their labels).
 * @param {object[]} blueprint
 * @returns {object[]}
 */
export function compactBlueprint(blueprint) {
  return (blueprint || []).map((s) => ({
    index: s.index,
    domainId: s.domain?.id ?? null,
    taskId: s.task?.id ?? null,
    item: s.item,
    type: s.type?.id,
    perspective: s.perspective?.en,
    industry: s.industry?.en,
    answerLetter: s.answerLetter,
  }));
}

// ─── Stage 1: planner ───────────────────────────────────────

/** Sessions shorter than this skip the planner call (not worth a round trip). */
export const PLANNER_MIN_QUESTIONS = 5;

export const PLAN_MARKER = '[Exam Plan]';

function slotLabel(slot) {
  const task = slot.task;
  const taskName = task ? (isEn() ? (task.title || task.jpTitle) : (task.jpTitle || task.title)) : '';
  const taskPart = task ? `Task ${task.id} ${taskName}` : (isEn() ? 'any domain' : '任意のドメイン');
  const l = isEn() ? 'en' : 'ja';
  return `${slot.index + 1}. ${taskPart} | ${isEn() ? 'item' : '項目'}: ${slot.item || '-'} | ${isEn() ? 'type' : '設問タイプ'}: ${slot.type[l]} | ${isEn() ? 'perspective' : '視点'}: ${slot.perspective[l]} | ${isEn() ? 'industry' : '業種'}: ${slot.industry[l]}`;
}

/**
 * Stage 1 prompt. One call for the whole exam; the response is a JSON array
 * with one row per slot.
 * @param {{ exam: object, blueprint: object[] }} opts
 * @returns {{ systemPrompt: string, userPrompt: string }}
 */
export function buildPlannerPrompt({ exam, blueprint }) {
  const code = exam?.code || '';
  const rows = blueprint.map(slotLabel).join('\n');
  if (isEn()) {
    return {
      systemPrompt:
        `You are the chief examiner designing a ${code} practice exam. You do NOT write questions yet; you design the exam plan so that every question tests something different.\n` +
        'Return ONLY a JSON array (no prose, no code fences). One object per slot, in slot order:\n' +
        '{"slot": <number>, "concept": "<the specific fact or decision the CORRECT answer tests, one sentence>", "scenario": "<one-sentence situation seed consistent with the slot\'s perspective and industry>", "distractors": ["<plausible wrong direction 1>", "<2>", "<3>"]}\n' +
        'Hard rules:\n' +
        '- Each "concept" must come from that slot\'s item and be answerable from official AWS material.\n' +
        '- Every concept must be DISTINCT across the whole plan: a concept (e.g. "set up a Center of Excellence") may be the correct answer of at most ONE question. Paraphrases count as the same concept.\n' +
        '- Spread concepts across the breadth of each item; prefer specific, less obvious points over the single most textbook answer.\n' +
        '- Distractors must be plausible for the scenario and must not be the correct concept of another slot.',
      userPrompt: `${PLAN_MARKER}\nDesign the plan for these ${blueprint.length} slots:\n${rows}`,
    };
  }
  return {
    systemPrompt:
      `あなたは ${code} 模擬試験を設計する主任試験官です。この段階では問題文を書かず、すべての問題が異なる内容を問うように「出題計画」を設計します。\n` +
      'JSON 配列のみを返してください（説明文・コードフェンス不要）。スロット順に 1 オブジェクトずつ:\n' +
      '{"slot": <番号>, "concept": "<正解が問う具体的な事実・判断を 1 文で>", "scenario": "<スロットの視点・業種に沿った状況設定を 1 文で>", "distractors": ["<もっともらしい誤答の方向性 1>", "<2>", "<3>"]}\n' +
      '厳守事項:\n' +
      '- 各 concept はそのスロットの「項目」に由来し、AWS 公式資料から答えられる内容にする。\n' +
      '- concept は計画全体で重複させない。ある概念（例:「Center of Excellence を設置する」）を正解にできるのは試験全体で最大 1 問。言い換えも同一概念とみなす。\n' +
      '- 各項目の幅を使い、最も教科書的な 1 つの答えではなく、具体的で意外性のある論点を優先する。\n' +
      '- distractors は状況に対してもっともらしく、かつ他スロットの正解概念と一致しないこと。',
    userPrompt: `${PLAN_MARKER}\n以下の ${blueprint.length} スロットの計画を設計してください:\n${rows}`,
  };
}

/**
 * Parse the planner response into an array indexed by slot (0-based). Missing
 * or malformed rows are null. Returns null when no JSON array is found.
 * @param {string} text
 * @param {number} count
 * @returns {Array<{ concept: string, scenario: string, distractors: string[] } | null> | null}
 */
export function parsePlan(text, count) {
  const raw = String(text ?? '').trim();
  const first = raw.indexOf('[');
  const last = raw.lastIndexOf(']');
  if (first === -1 || last <= first) return null;
  let arr;
  try {
    arr = JSON.parse(raw.slice(first, last + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(arr)) return null;
  const rows = Array(count).fill(null);
  arr.forEach((row, i) => {
    if (!row || typeof row !== 'object') return;
    const n = Number(row.slot);
    const idx = Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : i;
    if (idx < 0 || idx >= count || rows[idx]) return;
    const concept = String(row.concept || '').trim();
    if (!concept) return;
    rows[idx] = {
      concept,
      scenario: String(row.scenario || '').trim(),
      distractors: Array.isArray(row.distractors) ? row.distractors.map((d) => String(d).trim()).filter(Boolean).slice(0, 4) : [],
    };
  });
  return rows;
}

// ─── Similarity (used by stages 1 and 3) ───────────────────

function normalizeText(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/^\s*[a-d][.)、．]\s*/i, '') // choice label "A. "
    // Punctuation/whitespace become single spaces so Latin words stay separate tokens.
    .replace(/[\s\p{P}\p{S}]+/gu, ' ')
    .trim()
    // Japanese paraphrases mostly differ in the verb ending ("…推進する" /
    // "…推進します"): drop a trailing run of hiragana so they compare equal.
    .replace(/[\u3040-\u309f]+$/u, '')
    .trim();
}

/**
 * Shingles for similarity: Latin/digit runs are whole tokens (so "SQS" and
 * "SNS" differ), CJK text is split into character bigrams (no tokenizer needed).
 */
function shingles(s) {
  const set = new Set();
  const latin = /[a-z0-9]+/g;
  let m;
  while ((m = latin.exec(s)) !== null) set.add(`w:${m[0]}`);
  const cjk = s.replace(/[a-z0-9]+/g, ' ');
  for (const run of cjk.split(' ').filter(Boolean)) {
    if (run.length === 1) set.add(run);
    for (let i = 0; i < run.length - 1; i++) set.add(run.slice(i, i + 2));
  }
  return set;
}

/**
 * Jaccard similarity in [0, 1] over word tokens (Latin) and character bigrams
 * (CJK), after normalization; works for Japanese without a tokenizer.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function textSimilarity(a, b) {
  const A = shingles(normalizeText(a));
  const B = shingles(normalizeText(b));
  if (A.size === 0 && B.size === 0) return 1;
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

export const CONCEPT_DUPLICATE_THRESHOLD = 0.6;

/**
 * Stage 1 validation. Rows whose concept is a near-duplicate of an earlier
 * row are dropped (set to null) so the writer falls back to blueprint-only
 * guidance for that slot, with the duplicate concept banned.
 * @param {Array<object|null>} rows
 * @returns {{ rows: Array<object|null>, duplicates: number }}
 */
export function validatePlan(rows) {
  const out = [];
  const kept = [];
  let duplicates = 0;
  for (const row of rows || []) {
    if (!row) { out.push(null); continue; }
    const dup = kept.some((k) => textSimilarity(k.concept, row.concept) >= CONCEPT_DUPLICATE_THRESHOLD);
    if (dup) { duplicates++; out.push(null); continue; }
    kept.push(row);
    out.push(row);
  }
  return { rows: out, duplicates };
}

// ─── Stage 2: writer guidance ───────────────────────────────

const MAX_BANNED_IN_PROMPT = 40;

/**
 * Prompt suffix for one question: what exactly to test (blueprint + plan) and
 * which concepts are already taken.
 * @param {{ slot: object, plan?: object|null, banned?: string[] }} opts
 * @returns {string}
 */
export function buildSlotPromptSuffix({ slot, plan = null, banned = [] }) {
  const l = isEn() ? 'en' : 'ja';
  const lines = [];
  if (isEn()) {
    lines.push('\n\n[Question Design]');
    if (slot.item) lines.push(`- Knowledge/skill item to test: ${slot.item}`);
    lines.push(`- Question type: ${slot.type[l]}`);
    lines.push(`- Perspective: ${slot.perspective[l]}; industry: ${slot.industry[l]}`);
    if (plan?.concept) lines.push(`- The correct answer must test exactly this concept: ${plan.concept}`);
    if (plan?.scenario) lines.push(`- Scenario seed: ${plan.scenario}`);
    if (plan?.distractors?.length) lines.push(`- Distractor directions: ${plan.distractors.join(' / ')}`);
  } else {
    lines.push('\n\n【出題設計】');
    if (slot.item) lines.push(`- 問う知識・スキル項目: ${slot.item}`);
    lines.push(`- 設問タイプ: ${slot.type[l]}`);
    lines.push(`- 視点: ${slot.perspective[l]}／業種: ${slot.industry[l]}`);
    if (plan?.concept) lines.push(`- 正解が問う概念（これに限定する）: ${plan.concept}`);
    if (plan?.scenario) lines.push(`- シナリオの種: ${plan.scenario}`);
    if (plan?.distractors?.length) lines.push(`- 誤答の方向性: ${plan.distractors.join('／')}`);
  }
  const uniq = [...new Set((banned || []).map((b) => String(b || '').trim()).filter(Boolean))].slice(0, MAX_BANNED_IN_PROMPT);
  if (uniq.length) {
    lines.push(isEn()
      ? '\n[Already used — must NOT be the correct answer of this question]'
      : '\n【使用済み — この問題の正解にしてはいけない概念】');
    uniq.forEach((b) => lines.push(`- ${b}`));
  }
  return lines.join('\n');
}

/**
 * Prompt suffix for the one regeneration allowed when a question duplicated an
 * earlier one's answer (stage 3).
 * @param {string} duplicatedAnswer
 * @returns {string}
 */
export function buildDuplicateRetryHint(duplicatedAnswer) {
  const ans = String(duplicatedAnswer || '').trim();
  if (isEn()) {
    return `

[Regenerate] The previous question's correct answer ("${ans}") duplicates an earlier question in this exam. Write a question whose correct answer tests a DIFFERENT concept from the same item.`;
  }
  return `

【再生成】前回の問題の正解「${ans}」は、この試験の別の問題と重複しています。同じ項目の中で、別の概念を正解とする問題に作り直してください。`;
}

// ─── Stage 3: verification ──────────────────────────────────

/**
 * The text of a parsed question's correct choice, without the letter label.
 * @param {{ choices: string[], correctIndex: number }} q
 * @returns {string}
 */
export function correctChoiceText(q) {
  const c = q?.choices?.[q?.correctIndex];
  return String(c ?? '').replace(/^\s*[a-d][.)、．]\s*/i, '').trim();
}

// Correct answers often share scaffolding ("Use X with Y"), so the answer
// threshold is higher than the planner's concept threshold; a false positive
// only costs one bounded regeneration (the near-duplicate is kept as fallback).
export const DUPLICATE_ANSWER_THRESHOLD = 0.7;
export const DUPLICATE_QUESTION_THRESHOLD = 0.75;

/**
 * True when the candidate's correct choice (or question text) is a
 * near-duplicate of an already generated question's.
 * @param {object} candidate
 * @param {object[]} existing
 * @returns {boolean}
 */
export function isDuplicateQuestion(candidate, existing) {
  if (!candidate || !Array.isArray(existing) || existing.length === 0) return false;
  const ans = correctChoiceText(candidate);
  return existing.some((q) =>
    (ans && textSimilarity(ans, correctChoiceText(q)) >= DUPLICATE_ANSWER_THRESHOLD) ||
    textSimilarity(candidate.question, q.question) >= DUPLICATE_QUESTION_THRESHOLD);
}

/**
 * Diversity summary for logging / tests: clusters correct answers by
 * similarity and reports the largest cluster.
 * @param {object[]} questions
 * @returns {{ total: number, clusters: number, largestCluster: number, largestExample: string }}
 */
export function summarizeDiversity(questions) {
  const clusters = [];
  for (const q of questions || []) {
    const ans = correctChoiceText(q);
    const hit = clusters.find((c) => textSimilarity(c.example, ans) >= DUPLICATE_ANSWER_THRESHOLD);
    if (hit) hit.size++;
    else clusters.push({ example: ans, size: 1 });
  }
  const largest = clusters.reduce((m, c) => (c.size > m.size ? c : m), { size: 0, example: '' });
  return { total: (questions || []).length, clusters: clusters.length, largestCluster: largest.size, largestExample: largest.example };
}
