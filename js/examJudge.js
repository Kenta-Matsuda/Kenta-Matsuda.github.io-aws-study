/**
 * Quality evaluation of generated questions (issue #225, design §8).
 *
 * Three layers, cheapest first:
 *   1. runDeterministicChecks  code only — structure, answer position, cue leaks
 *                              (longest choice is the key, "all of the above"),
 *                              citations outside the material given to the writer.
 *   2. Solver                  one model call that answers the question WITHOUT the
 *                              key or explanation; disagreement with the key is a
 *                              uniqueness/ambiguity signal.
 *   3. Judge                   one model call that scores the item on a rubric
 *                              (accuracy / uniqueness / distractors / fit / cues,
 *                              1–5 each) against the card or resource material,
 *                              and returns a verdict with concrete issues.
 * decideVerdict combines the three into pass / fix / reject; a "fix" gets ONE
 * Editor call (buildEditorPrompt) and is re-checked deterministically only, so
 * the per-question cost is bounded (writer + solver + judge [+ editor]).
 *
 * Pure module: no DOM / network / storage.
 */

import { usesJapanesePrompt, outputLanguageDirective } from './localeContent.js';
import { correctChoiceText } from './examPipeline.js';

export const JUDGE_MARKER = '[Judge]';
export const SOLVER_MARKER = '[Solver]';
export const EDITOR_MARKER = '[Editor]';

export const RUBRIC_AXES = ['accuracy', 'uniqueness', 'distractors', 'fit', 'cues'];
export const PASS_MIN_AXIS = 3;
export const PASS_MIN_TOTAL = 18; // 5 axes × 3.6 average

/** Flags that make an item unusable as-is regardless of the judge. */
export const HARD_FLAGS = new Set(['choice-count', 'duplicate-choices', 'all-of-the-above', 'missing-question']);

// English scaffolding for every locale except Japanese (issue #197); the
// editor additionally gets the output-language directive since it rewrites
// learner-facing text.
function isEn() {
  return !usesJapanesePrompt();
}

function stripLabel(s) {
  return String(s ?? '').replace(/^\s*[a-d][.)、．]\s*/i, '').trim();
}

const URL_RE = /https?:\/\/[^\s)\]」』"'<>]+/g;

/**
 * Layer 1: structural and cue checks that need no model.
 * @param {{ question: string, choices: string[], correctIndex: number, explanation?: string }} q
 * @param {{ expectedLetter?: string, allowedUrls?: string[] }} [opts]
 * @returns {string[]} flag codes (see HARD_FLAGS for the fatal ones)
 */
export function runDeterministicChecks(q, { expectedLetter, allowedUrls } = {}) {
  const flags = [];
  if (!q || !String(q.question || '').trim()) flags.push('missing-question');
  const choices = Array.isArray(q?.choices) ? q.choices.map(stripLabel) : [];
  if (choices.length !== 4) flags.push('choice-count');
  if (new Set(choices.map((c) => c.toLowerCase())).size !== choices.length) flags.push('duplicate-choices');
  if (choices.some((c) => /上記のすべて|上記すべて|いずれでもない|all of the above|none of the above/i.test(c))) flags.push('all-of-the-above');
  const ci = Number(q?.correctIndex);
  if (!Number.isInteger(ci) || ci < 0 || ci >= choices.length) flags.push('correct-index');
  else {
    const lens = choices.map((c) => c.length).sort((a, b) => b - a);
    const correctLen = choices[ci].length;
    // The key being clearly the longest choice is the classic cue leak.
    if (choices.length >= 3 && correctLen === lens[0] && correctLen >= 1.3 * lens[1]) flags.push('longest-is-correct');
    if (expectedLetter && 'ABCD'[ci] !== String(expectedLetter).toUpperCase()) flags.push('letter-mismatch');
  }
  if (!String(q?.explanation || '').trim()) flags.push('missing-explanation');
  if (Array.isArray(allowedUrls) && allowedUrls.length) {
    const allowed = new Set(allowedUrls.map((u) => String(u).replace(/\/+$/, '')));
    const cited = String(q?.explanation || '').match(URL_RE) || [];
    if (cited.some((u) => !allowed.has(u.replace(/[.,、。]+$/, '').replace(/\/+$/, '')))) flags.push('url-not-allowed');
  }
  return flags;
}

function renderQuestion(q) {
  const letters = 'ABCD';
  const choices = (q.choices || []).map((c, i) => `${letters[i]}. ${stripLabel(c)}`).join('\n');
  return `${q.question}\n\n${choices}`;
}

/**
 * Layer 2 prompt: answer the item cold, without key or explanation.
 * @param {{ question: string, choices: string[] }} q
 * @returns {{ systemPrompt: string, userPrompt: string }}
 */
export function buildSolverPrompt(q) {
  if (isEn()) {
    return {
      systemPrompt: 'You are an experienced AWS certification candidate. Answer the multiple-choice question. Return ONLY JSON: {"answer": "A|B|C|D", "confidence": 1-5, "reasoning": "<one or two sentences>"}.',
      userPrompt: `${SOLVER_MARKER}\n${renderQuestion(q)}`,
    };
  }
  return {
    systemPrompt: 'あなたは AWS 認定試験の経験豊富な受験者です。選択問題に解答してください。JSON のみを返してください: {"answer": "A|B|C|D", "confidence": 1-5, "reasoning": "<1〜2 文>"}',
    userPrompt: `${SOLVER_MARKER}\n${renderQuestion(q)}`,
  };
}

/**
 * Layer 3 prompt: rubric scoring against the material the writer was given.
 * @param {{ question: object, material?: string, design?: string, level?: string, solver?: { letter: string|null, agrees: boolean|null } }} opts
 * @returns {{ systemPrompt: string, userPrompt: string }}
 */
export function buildJudgePrompt({ question, material = '', design = '', level = '', solver = null }) {
  const key = 'ABCD'[question.correctIndex] || '?';
  const solverLine = solver && solver.letter
    ? (isEn()
      ? `An independent solver (without the key) answered ${solver.letter}; the key is ${key}.`
      : `独立した解答者（正解を知らない）は ${solver.letter} と答えました。正解キーは ${key} です。`)
    : '';
  const body = `${renderQuestion(question)}\n\n${isEn() ? 'Key' : '正解'}: ${key}\n${isEn() ? 'Explanation' : '解説'}: ${question.explanation || ''}`;
  if (isEn()) {
    return {
      systemPrompt:
        'You are a strict reviewer of AWS certification exam items. Score the item on five axes from 1 (bad) to 5 (excellent):\n' +
        '- accuracy: consistent with the reference material / official AWS facts; the key is actually correct.\n' +
        '- uniqueness: exactly one defensible correct answer; no other choice is arguably right.\n' +
        '- distractors: wrong choices are plausible, clearly wrong, and ideally reflect real misconceptions or rejected alternatives.\n' +
        '- fit: matches the requested item, question type and exam level.\n' +
        '- cues: no giveaways (key is not the only long/specific choice, no absolute words, no grammar mismatch).\n' +
        'Return ONLY JSON: {"accuracy":n,"uniqueness":n,"distractors":n,"fit":n,"cues":n,"verdict":"pass|fix|reject","issues":["<specific issue>"],"fix":"<how to fix in one or two sentences>"}\n' +
        'Use "reject" only when the key is wrong or the item cannot be repaired; use "fix" for repairable problems.',
      userPrompt: `${JUDGE_MARKER}\n${design ? `[Design]\n${design}\n\n` : ''}${material ? `[Reference material]\n${material}\n\n` : ''}${level ? `[Level] ${level}\n\n` : ''}[Item]\n${body}\n${solverLine ? `\n${solverLine}` : ''}`,
    };
  }
  return {
    systemPrompt:
      'あなたは AWS 認定試験の問題を厳しく査読するレビュアーです。次の 5 軸を 1（悪い）〜5（優れている）で採点してください:\n' +
      '- accuracy: 参照資料・AWS 公式の事実と矛盾せず、正解キーが実際に正しい。\n' +
      '- uniqueness: 正解が 1 つに決まり、他の選択肢が正解だと主張できない。\n' +
      '- distractors: 誤答がもっともらしく、かつ明確に誤りで、実際の誤解や不採用案を反映している。\n' +
      '- fit: 指定された項目・設問タイプ・試験レベルに合っている。\n' +
      '- cues: 手がかり漏れがない（正解だけが長い／具体的、「常に」「絶対」などの極端語、文法の不一致がない）。\n' +
      'JSON のみを返してください: {"accuracy":n,"uniqueness":n,"distractors":n,"fit":n,"cues":n,"verdict":"pass|fix|reject","issues":["<具体的な問題点>"],"fix":"<直し方を 1〜2 文で>"}\n' +
      '"reject" は正解キーが誤っている、または修復不能な場合のみ。修復できる問題は "fix"。',
    userPrompt: `${JUDGE_MARKER}\n${design ? `【出題設計】\n${design}\n\n` : ''}${material ? `【参照資料】\n${material}\n\n` : ''}${level ? `【レベル】${level}\n\n` : ''}【問題】\n${body}\n${solverLine ? `\n${solverLine}` : ''}`,
  };
}

/**
 * Editor prompt: repair the item according to the judge's issues, keeping the
 * JSON contract and the key position.
 * @param {{ question: object, issues: string[], fix?: string, material?: string }} opts
 * @returns {{ systemPrompt: string, userPrompt: string }}
 */
export function buildEditorPrompt({ question, issues = [], fix = '', material = '' }) {
  const key = 'ABCD'[question.correctIndex] || 'A';
  const payload = JSON.stringify({ question: question.question, choices: (question.choices || []).map((c, i) => `${'ABCD'[i]}. ${stripLabel(c)}`), correct: key, explanation: question.explanation || '' });
  const issueLines = issues.map((x) => `- ${x}`).join('\n');
  if (isEn()) {
    return {
      systemPrompt: 'You repair AWS certification exam items. Return ONLY one JSON object with the same contract: {"question","choices":["A. …","B. …","C. …","D. …"],"correct":"A|B|C|D","explanation"}. Keep the correct answer at the same letter unless an issue says the key is wrong. Do not change what the item tests.' + outputLanguageDirective(),
      userPrompt: `${EDITOR_MARKER}\n${material ? `[Reference material]\n${material}\n\n` : ''}[Issues]\n${issueLines}${fix ? `\n[Suggested fix] ${fix}` : ''}\n\n[Item]\n${payload}`,
    };
  }
  return {
    systemPrompt: 'あなたは AWS 認定試験の問題を修正する編集者です。同じ契約の JSON オブジェクトのみを返してください: {"question","choices":["A. …","B. …","C. …","D. …"],"correct":"A|B|C|D","explanation"}。正解キーが誤りだという指摘がない限り、正解は同じ記号に置いたままにしてください。問う内容は変えないこと。',
    userPrompt: `${EDITOR_MARKER}\n${material ? `【参照資料】\n${material}\n\n` : ''}【指摘】\n${issueLines}${fix ? `\n【修正案】${fix}` : ''}\n\n【問題】\n${payload}`,
  };
}

function extractJson(text) {
  const raw = String(text ?? '').trim();
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first === -1 || last <= first) return null;
  try { return JSON.parse(raw.slice(first, last + 1)); } catch { return null; }
}

/** @returns {{ letter: string|null, confidence: number|null }} */
export function parseSolverResponse(text) {
  const obj = extractJson(text);
  const raw = String(obj?.answer ?? '').trim().toUpperCase();
  const m = raw.match(/[ABCD]/);
  return { letter: m ? m[0] : null, confidence: Number.isFinite(Number(obj?.confidence)) ? Number(obj.confidence) : null };
}

/**
 * @returns {{ scores: Record<string, number>, total: number, verdict: 'pass'|'fix'|'reject'|null, issues: string[], fix: string } | null}
 */
export function parseJudgeResponse(text) {
  const obj = extractJson(text);
  if (!obj) return null;
  const scores = {};
  for (const axis of RUBRIC_AXES) {
    const n = Number(obj[axis]);
    if (!Number.isFinite(n)) return null;
    scores[axis] = Math.min(5, Math.max(1, Math.round(n)));
  }
  const verdictRaw = String(obj.verdict || '').toLowerCase();
  const verdict = ['pass', 'fix', 'reject'].includes(verdictRaw) ? verdictRaw : null;
  return {
    scores,
    total: RUBRIC_AXES.reduce((s, a) => s + scores[a], 0),
    verdict,
    issues: Array.isArray(obj.issues) ? obj.issues.map((x) => String(x)).filter(Boolean).slice(0, 6) : [],
    fix: String(obj.fix || '').trim(),
  };
}

/**
 * Combine the layers into one outcome.
 * @param {{ flags: string[], judge: object|null, solverLetter?: string|null, correctLetter: string }} opts
 * @returns {{ outcome: 'pass'|'fix'|'reject'|'unjudged', issues: string[], flags: string[], score: number|null, solverAgrees: boolean|null }}
 */
export function decideVerdict({ flags = [], judge = null, solverLetter = null, correctLetter }) {
  const issues = [];
  const allFlags = flags.slice();
  const solverAgrees = solverLetter ? solverLetter === correctLetter : null;
  if (solverAgrees === false) allFlags.push('solver-disagrees');

  const hard = allFlags.filter((f) => HARD_FLAGS.has(f));
  if (hard.length) issues.push(...hard.map((f) => `structural: ${f}`));

  if (!judge) {
    // No judge available: structural problems still need a fix; otherwise pass through.
    return { outcome: hard.length ? 'fix' : 'unjudged', issues, flags: allFlags, score: null, solverAgrees };
  }
  issues.push(...judge.issues);
  if (judge.verdict === 'reject' || judge.scores.accuracy <= 2) {
    return { outcome: 'reject', issues: issues.length ? issues : ['judge: reject'], flags: allFlags, score: judge.total, solverAgrees };
  }
  const lowAxis = RUBRIC_AXES.some((a) => judge.scores[a] < PASS_MIN_AXIS);
  const ambiguous = solverAgrees === false && judge.scores.uniqueness <= 3;
  if (ambiguous) issues.push(isEn() ? 'An independent solver chose a different answer; make the key unambiguous.' : '独立した解答者が別の選択肢を選びました。正解が一意になるようにしてください。');
  if (allFlags.includes('longest-is-correct')) issues.push(isEn() ? 'The key is clearly the longest choice; balance choice lengths.' : '正解だけが明らかに長い選択肢です。長さを揃えてください。');
  const needsFix = hard.length > 0 || judge.verdict === 'fix' || lowAxis || judge.total < PASS_MIN_TOTAL || ambiguous || allFlags.includes('longest-is-correct');
  return { outcome: needsFix ? 'fix' : 'pass', issues, flags: allFlags, score: judge.total, solverAgrees };
}

/**
 * Aggregate per-question judge results for metrics.
 * @param {Array<{ judge?: { outcome: string, score?: number|null } }>} questions
 * @returns {{ judged: number, passed: number, fixed: number, unjudged: number, avgScore: number|null }}
 */
export function summarizeJudging(questions) {
  let judged = 0; let passed = 0; let fixed = 0; let unjudged = 0; let scoreSum = 0; let scored = 0;
  for (const q of questions || []) {
    const j = q?.judge;
    if (!j) { unjudged++; continue; }
    if (j.outcome === 'unjudged') { unjudged++; continue; }
    judged++;
    if (j.outcome === 'pass') passed++;
    if (j.fixed) fixed++;
    if (Number.isFinite(j.score)) { scoreSum += j.score; scored++; }
  }
  return { judged, passed, fixed, unjudged, avgScore: scored ? Math.round((scoreSum / scored) * 10) / 10 : null };
}

/** The correct choice text, for logs and diversity reports. */
export { correctChoiceText };
