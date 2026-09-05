/**
 * Quiz engine — parses AI responses into interactive quizzes,
 * manages combo streaks, and scores answers.
 */

import { getLocale } from './i18n.js';

// ─── Quiz Parsing ───────────────────────────────────────────

/**
 * Try to parse the AI response as structured JSON quiz.
 * Expected shape: { question, choices: string[], correct: "A"|"B"|"C"|"D", explanation }
 * @param {string} text
 * @returns {{ question: string, choices: string[], correctIndex: number, explanation: string } | null}
 */
export function parseQuizJson(text) {
  if (text == null) return null;
  const trimmed = String(text).trim();
  if (!trimmed) return null;

  // 1) Strip markdown code fences that wrap JSON. Tolerate leading
  //    whitespace/newlines before the opening fence and any trailing content.
  const stripped = trimmed
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```[\s\S]*$/i, '')
    .trim();
  const direct = tryParseQuizJson(stripped);
  if (direct) return direct;

  // 2) Try to find a JSON block embedded in a markdown code fence,
  //    even when surrounded by prose before/after the fence.
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (jsonMatch) {
    const fenced = tryParseQuizJson(jsonMatch[1].trim());
    if (fenced) return fenced;
  }

  // 3) Fallback: extract the first balanced-looking JSON object by slicing
  //    from the first '{' to the last '}'. Handles leading/trailing prose and
  //    fences that are missing a closing ```.
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) {
    const candidate = tryParseQuizJson(trimmed.slice(first, last + 1));
    if (candidate) return candidate;
  }

  return null;
}

/**
 * Attempt JSON.parse + normalize, swallowing parse errors.
 * @param {string} candidate
 * @returns {{ question: string, choices: string[], correctIndex: number, explanation: string } | null}
 */
function tryParseQuizJson(candidate) {
  if (!candidate) return null;
  try {
    return normalizeQuizObject(JSON.parse(candidate));
  } catch {
    return null;
  }
}

function normalizeQuizObject(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const question = String(obj.question || '').trim();
  const choices = normalizeChoices(obj.choices);
  const explanation = String(obj.explanation || '').trim();

  if (!question || choices.length < 2) return null;

  const correctIndex = resolveCorrectIndex(obj.correct, choices);
  if (correctIndex < 0 || correctIndex >= choices.length) return null;

  return { question, choices, correctIndex, explanation };
}

/**
 * Normalize `choices` into an ordered array of trimmed strings.
 * Accepts an array, or an object keyed by A/B/C/D (converted to array order).
 * @param {unknown} rawChoices
 * @returns {string[]}
 */
function normalizeChoices(rawChoices) {
  if (Array.isArray(rawChoices)) {
    return rawChoices.map((c) => String(c ?? '').trim());
  }
  if (rawChoices && typeof rawChoices === 'object') {
    // Order by A, B, C, D... using the letter keys when present.
    const keys = Object.keys(rawChoices);
    const letterKeys = keys.filter((k) => /^[A-Z]$/i.test(k.trim()));
    const ordered = letterKeys.length
      ? letterKeys.sort((a, b) => a.trim().toUpperCase().localeCompare(b.trim().toUpperCase()))
      : keys;
    return ordered.map((k) => String(rawChoices[k] ?? '').trim());
  }
  return [];
}

/**
 * Resolve the index of the correct choice from a variety of `correct` shapes:
 *   - an A-D (case-insensitive) letter (e.g. "B")
 *   - a numeric index, preferring 1-based (1..n), falling back to 0-based (0..n-1)
 *   - a string that exactly matches one of the choices (mapped back to index)
 * @param {unknown} correct
 * @param {string[]} choices
 * @returns {number} index, or -1 when it cannot be resolved
 */
function resolveCorrectIndex(correct, choices) {
  if (correct == null) return -1;

  // Numeric index (or numeric-looking string).
  if (typeof correct === 'number' || (typeof correct === 'string' && /^\d+$/.test(correct.trim()))) {
    const num = Number(correct);
    if (Number.isInteger(num)) {
      // Choices are labeled A/B/C/D (1st/2nd/...), so prefer 1-based (1..n):
      // a positive numeric value denotes a 1-based position -> num - 1.
      if (num >= 1 && num <= choices.length) return num - 1;
      // Fall back to 0-based (0..n-1) for 0 or values that are not a valid
      // 1-based position.
      if (num >= 0 && num < choices.length) return num;
    }
    return -1;
  }

  const raw = String(correct).trim();
  if (!raw) return -1;

  // Single A-D letter.
  if (/^[A-Za-z]$/.test(raw)) {
    const letterIdx = letterToIndex(raw);
    if (letterIdx >= 0) return letterIdx;
  }

  // Exact match against a choice (with or without a leading "A. " label).
  const target = raw.toLowerCase();
  const exact = choices.findIndex((c) => c.toLowerCase() === target);
  if (exact >= 0) return exact;
  const stripLabel = (s) => s.replace(/^\s*[A-Za-z][\.\)、]\s*/, '').trim().toLowerCase();
  const byLabel = choices.findIndex((c) => stripLabel(c) === stripLabel(raw));
  if (byLabel >= 0) return byLabel;

  // Leading letter prefix like "B) ..." or "B."
  const leadingLetter = raw.match(/^\s*([A-Za-z])[\.\)、]/);
  if (leadingLetter) {
    const idx = letterToIndex(leadingLetter[1]);
    if (idx >= 0) return idx;
  }

  return -1;
}

/**
 * Fallback parser: extract question / choices / answer from the existing
 * markdown format used by the old quiz prompt.
 * @param {string} text
 * @returns {{ question: string, choices: string[], correctIndex: number, explanation: string } | null}
 */
export function parseQuizMarkdown(text) {
  if (!text) return null;

  // Extract question — between 【問題文】 and 【選択肢】
  const questionMatch = text.match(/【問題文】\s*([\s\S]*?)(?=【選択肢】)/);
  const question = questionMatch ? questionMatch[1].trim() : '';

  // Extract choices
  const choicesSection = text.match(/【選択肢】\s*([\s\S]*?)(?=【正解|$)/);
  const choices = [];
  if (choicesSection) {
    const lines = choicesSection[1].trim().split('\n');
    for (const line of lines) {
      const m = line.match(/^\s*([A-D])\.\s+(.+)/);
      if (m) choices.push(`${m[1]}. ${m[2].trim()}`);
    }
  }

  // Extract correct answer
  const correctMatch = text.match(/正解[:：]\s*([A-D])/i);
  const correctLetter = correctMatch ? correctMatch[1].toUpperCase() : '';
  const correctIndex = letterToIndex(correctLetter);

  // Extract explanation
  const explanationMatch = text.match(/解説[:：]\s*([\s\S]*?)$/);
  const explanation = explanationMatch ? explanationMatch[1].trim() : '';

  if (!question || choices.length < 2 || correctIndex < 0) return null;

  return { question, choices, correctIndex, explanation };
}

/**
 * Parse AI quiz response, trying JSON first then falling back to markdown.
 */
export function parseQuizResponse(text) {
  return parseQuizJson(text) || parseQuizMarkdown(text);
}

function letterToIndex(letter) {
  const map = { A: 0, B: 1, C: 2, D: 3 };
  return map[String(letter || '').toUpperCase()] ?? -1;
}

export function indexToLetter(index) {
  return ['A', 'B', 'C', 'D'][index] ?? '?';
}

// ─── Combo System ───────────────────────────────────────────

const COMBO_THRESHOLDS = [
  { streak: 10, multiplier: 3.0 },
  { streak: 5, multiplier: 2.0 },
  { streak: 3, multiplier: 1.5 },
];

/**
 * Get the XP multiplier for a given combo streak count.
 * @param {number} streak
 * @returns {number}
 */
export function getComboMultiplier(streak) {
  for (const t of COMBO_THRESHOLDS) {
    if (streak >= t.streak) return t.multiplier;
  }
  return 1.0;
}

/**
 * Get the combo tier label for display.
 */
export function getComboLabel(streak) {
  if (streak >= 10) return '🔥🔥🔥 UNSTOPPABLE';
  if (streak >= 5) return '🔥🔥 ON FIRE';
  if (streak >= 3) return '🔥 COMBO';
  return '';
}

// ─── Quiz Session State ─────────────────────────────────────

/** Mode configuration: question count and time limits */
export const QUIZ_MODE_CONFIG = {
  single: { questionCount: 1, timeLimitSec: 0, preGenerate: false, label: '1問チャレンジ', labelEn: 'Single Question' },
  quick5: { questionCount: 5, timeLimitSec: 0, preGenerate: false, label: '5問連続', labelEn: '5 Questions' },
  speed:  { questionCount: 10, timeLimitSec: 300, preGenerate: true, label: 'スピードチャレンジ', labelEn: 'Speed Run' },
  mock:   { questionCount: 65, timeLimitSec: 7800, preGenerate: true, label: '本番模擬試験', labelEn: 'Practice Exam' },  // defaults; overridden per-exam
};

/**
 * Per-exam mock configuration matching real AWS certification exam parameters.
 */
export const EXAM_MOCK_CONFIG = {
  'clf-c02':  { questionCount: 65, timeLimitMin: 90,  level: 'Foundational' },
  'saa-c03':  { questionCount: 65, timeLimitMin: 130, level: 'Associate' },
  'dva-c02':  { questionCount: 65, timeLimitMin: 130, level: 'Associate' },
  'soa-c03':  { questionCount: 65, timeLimitMin: 130, level: 'Associate' },
  'sap-c02':  { questionCount: 75, timeLimitMin: 180, level: 'Professional' },
  'dop-c02':  { questionCount: 75, timeLimitMin: 180, level: 'Professional' },
  'ans-c01':  { questionCount: 65, timeLimitMin: 170, level: 'Specialty' },
  'scs-c03':  { questionCount: 65, timeLimitMin: 170, level: 'Specialty' },
  'mla-c01':  { questionCount: 65, timeLimitMin: 130, level: 'Associate' },
  'dea-c01':  { questionCount: 65, timeLimitMin: 130, level: 'Associate' },
  'aif-c01':  { questionCount: 65, timeLimitMin: 120, level: 'Foundational' },
  'aip-c01':  { questionCount: 65, timeLimitMin: 120, level: 'Associate' },
  'aib-c01':  { questionCount: 65, timeLimitMin: 130, level: 'Business' },
};

/**
 * Get the exam level from EXAM_MOCK_CONFIG.
 */
export function getExamLevel(examId) {
  return (EXAM_MOCK_CONFIG[examId] || {}).level || 'Associate';
}

/**
 * Create a new quiz session object.
 * @param {{ examId: string, domainId?: number, mode?: string }} opts
 */
export function createQuizSession(opts = {}) {
  const mode = opts.mode || 'single';
  const config = QUIZ_MODE_CONFIG[mode] || QUIZ_MODE_CONFIG.single;

  let questionCount = config.questionCount;
  let timeLimitSec = config.timeLimitSec;

  // For mock mode, use exam-specific configuration
  if (mode === 'mock' && opts.examId) {
    const mc = EXAM_MOCK_CONFIG[opts.examId];
    if (mc) {
      questionCount = mc.questionCount;
      timeLimitSec = mc.timeLimitMin * 60;
    }
  }

  return {
    examId: opts.examId || '',
    domainId: opts.domainId ?? null,
    mode,
    questionCount,
    timeLimitSec,
    preGenerate: config.preGenerate,
    questions: [],
    answers: [],
    currentIndex: 0,
    combo: 0,
    maxCombo: 0,
    totalXpEarned: 0,
    startedAt: null,
    finishedAt: null,
  };
}

/**
 * Record an answer in the session.
 * @returns {{ isCorrect: boolean, combo: number, multiplier: number, xpEarned: number }}
 */
export function recordAnswer(session, answerIndex, baseXp = 10) {
  const q = session.questions[session.currentIndex];
  if (!q) return { isCorrect: false, combo: 0, multiplier: 1, xpEarned: 0 };

  const isCorrect = answerIndex === q.correctIndex;
  session.answers[session.currentIndex] = answerIndex;

  if (isCorrect) {
    session.combo += 1;
    if (session.combo > session.maxCombo) session.maxCombo = session.combo;
  } else {
    session.combo = 0;
  }

  const multiplier = isCorrect ? getComboMultiplier(session.combo) : 1;
  const xpEarned = isCorrect ? Math.round(baseXp * multiplier) : 2; // incorrect still gives 2 XP

  session.totalXpEarned += xpEarned;

  return { isCorrect, combo: session.combo, multiplier, xpEarned };
}

/**
 * Calculate session summary stats.
 */
export function getSessionSummary(session) {
  const total = session.answers.length;
  const correct = session.answers.filter((a, i) => a === session.questions[i]?.correctIndex).length;
  return {
    total,
    correct,
    incorrect: total - correct,
    accuracy: total > 0 ? correct / total : 0,
    maxCombo: session.maxCombo,
    totalXp: session.totalXpEarned,
  };
}

// ─── Quiz System Prompt ─────────────────────────────────────

/**
 * Build a system prompt that asks the AI for JSON-formatted quiz output.
 */
export function buildQuizSystemPrompt(examCode, examShortLabel) {
  if (getLocale() === 'en') {
    return (
      `You are an AWS certification exam expert. Create 1 multiple-choice question at the ${examCode} (${examShortLabel}) level.\n\n` +
      `You MUST output ONLY the following JSON format (no markdown or other text):\n` +
      '```json\n' +
      '{\n' +
      '  "question": "Scenario-based question text",\n' +
      '  "choices": ["A. Choice 1", "B. Choice 2", "C. Choice 3", "D. Choice 4"],\n' +
      '  "correct": "B",\n' +
      '  "explanation": "Brief explanation of why the answer is correct and why others are incorrect"\n' +
      '}\n' +
      '```\n' +
      'Create a practical scenario-based question. Cover a different AWS service or topic each time — do not repeat the same service.'
    );
  }
  return (
    `あなたはAWS認定試験のエキスパートです。${examCode}（${examShortLabel}）レベルの4択問題を1問作成してください。\n\n` +
    `【信頼性ルール】\n` +
    `- AWS公式ドキュメントに記載がある内容のみに基づいて出題してください。\n` +
    `- 存在しないサービスや機能を問題に含めないでください。\n` +
    `- 解説には根拠となるAWS公式ドキュメントのURLを1件以上含めてください（形式: 参考: https://docs.aws.amazon.com/...）。\n\n` +
    `必ず以下のJSON形式のみで出力してください（マークダウンやそれ以外のテキストは不要です）：\n` +
    '```json\n' +
    '{\n' +
    '  "question": "シナリオを含む問題文",\n' +
    '  "choices": ["A. 選択肢1", "B. 選択肢2", "C. 選択肢3", "D. 選択肢4"],\n' +
    '  "correct": "B",\n' +
    '  "explanation": "正解の理由と、他の選択肢が不正解である理由の簡潔な解説。末尾に参考: AWS公式ドキュメントURL"\n' +
    '}\n' +
    '```\n' +
    '実践的なシナリオベースの問題を作成してください。毎回異なるAWSサービスやトピックを扱い、同じサービスを繰り返さないでください。'
  );
}

/**
 * Build the user prompt for quiz generation.
 */
export function buildQuizUserPrompt(taskTitle, taskContext) {
  if (getLocale() === 'en') {
    let prompt = `Task: Create 1 practical scenario-based multiple-choice question related to "${taskTitle}" in the specified JSON format.`;
    if (taskContext) {
      prompt += `\n\n[Task Context]\n${taskContext}`;
    }
    return prompt;
  }
  let prompt = `タスク: 「${taskTitle}」に関連する、実践的なシナリオベースの選択問題を1問、指定のJSON形式で作成してください。`;
  if (taskContext) {
    prompt += `\n\n【タスク文脈】\n${taskContext}`;
  }
  return prompt;
}

/**
 * Build a system prompt for speed-run mode (short 1Q1A format, answerable in ~30s).
 */
export function buildSpeedQuizSystemPrompt(examCode, examShortLabel) {
  if (getLocale() === 'en') {
    return (
      `You are an AWS certification exam expert. Create 1 short multiple-choice question at the ${examCode} (${examShortLabel}) level.\n\n` +
      `[IMPORTANT] This is a speed-run question:\n` +
      `- Question text should be 1-2 sentences (no scenario needed, directly test knowledge)\n` +
      `- Choices should be short (service names or feature names)\n` +
      `- Should be answerable within 30 seconds\n\n` +
      `You MUST output ONLY the following JSON format (no markdown or other text):\n` +
      '```json\n' +
      '{\n' +
      '  "question": "Short question (1-2 sentences)",\n' +
      '  "choices": ["A. Choice 1", "B. Choice 2", "C. Choice 3", "D. Choice 4"],\n' +
      '  "correct": "B",\n' +
      '  "explanation": "Brief explanation (1-2 sentences)"\n' +
      '}\n' +
      '```'
    );
  }
  return (
    `あなたはAWS認定試験のエキスパートです。${examCode}（${examShortLabel}）レベルの短答式4択問題を1問作成してください。\n\n` +
    `【重要】スピードラン用の問題です：\n` +
    `- 問題文は1〜2文で簡潔に（シナリオは不要、知識を直接問う形式）\n` +
    `- 選択肢はサービス名や機能名など短いものにする\n` +
    `- 30秒以内に解答できるレベルの問題にする\n` +
    `- AWS公式ドキュメントに記載がある内容のみ出題すること\n\n` +
    `必ず以下のJSON形式のみで出力してください（マークダウンやそれ以外のテキストは不要です）：\n` +
    '```json\n' +
    '{\n' +
    '  "question": "短い問題文（1〜2文）",\n' +
    '  "choices": ["A. 選択肢1", "B. 選択肢2", "C. 選択肢3", "D. 選択肢4"],\n' +
    '  "correct": "B",\n' +
    '  "explanation": "正解の理由の簡潔な解説（1〜2文）。参考: AWS公式ドキュメントURL"\n' +
    '}\n' +
    '```'
  );
}

/**
 * Build a general user prompt for cross-domain quiz (dashboard mode).
 * When targetDomain is provided, the prompt is scoped to that domain's topics.
 */
export function buildGeneralQuizUserPrompt(examCode, targetDomain) {
  if (getLocale() === 'en') {
    if (targetDomain) {
      const name = targetDomain.title || targetDomain.jpTitle;
      let prompt = `Create 1 question from the "${name}" domain of the ${examCode} exam in the specified JSON format. Use a different AWS service/topic than last time.`;
      if (targetDomain.tasks && targetDomain.tasks.length > 0) {
        const taskNames = targetDomain.tasks.map(t => t.title || t.jpTitle).join(', ');
        prompt += `\nThis domain covers these tasks: ${taskNames}\nPick one at random and create a question about it. Don't repeat the same task as last time.`;
      }
      return prompt;
    }
    return `Create 1 question from a random domain/topic of the ${examCode} exam in the specified JSON format. Cover a different domain, topic, and AWS service each time — do not repeat.`;
  }
  if (targetDomain) {
    const name = targetDomain.jpTitle || targetDomain.title;
    let prompt = `${examCode}試験のドメイン「${name}」の出題範囲から問題を1問、指定のJSON形式で作成してください。前回と異なるAWSサービス・トピックを扱ってください。`;
    if (targetDomain.tasks && targetDomain.tasks.length > 0) {
      const taskNames = targetDomain.tasks.map(t => t.jpTitle || t.title).join('、');
      prompt += `\nこのドメインには以下のタスクがあります: ${taskNames}\nこの中からランダムに1つ選んで出題してください。前の問題と同じタスクを選ばないでください。`;
    }
    return prompt;
  }
  return `${examCode}試験の出題範囲から、ランダムなドメイン・トピックに関する問題を1問、指定のJSON形式で作成してください。毎回異なるドメインやトピック・AWSサービスから出題し、同じサービスの問題を繰り返さないでください。`;
}

/**
 * Build a system prompt for mock exam mode — realistic exam-level questions
 * with detailed explanations and AWS documentation citations.
 */
export function buildMockQuizSystemPrompt(examCode, examShortLabel, examLevel) {
  const levelGuide = {
    'Foundational': {
      questionDesc: '基礎的なAWSクラウドの知識を幅広く問う問題',
      questionLength: '問題文は2〜4文で、基本的な状況設定を含む',
      choiceLength: '選択肢はそれぞれ1文（サービス名や基本概念を問う形式）',
      difficultyNote: 'AWS初学者が6ヶ月程度の学習で解答できるレベル',
    },
    'Business': {
      questionDesc: 'AIの導入判断・ガバナンス・ビジネス価値を問うシナリオ問題（技術実装の詳細は問わない）',
      questionLength: '問題文は2〜4文で、ビジネス上の状況設定を含む',
      choiceLength: '選択肢はそれぞれ1〜2文（戦略・判断・ガバナンスの選択肢）',
      difficultyNote: 'AIの技術実装ではなくビジネス判断を問うレベル（AI/ML/生成AIの基礎用語の理解を前提とする）',
    },
    'Associate': {
      questionDesc: '実務で直面するシナリオベースの問題',
      questionLength: '問題文は3〜5文の具体的なビジネスシナリオ（要件・制約を含む）',
      choiceLength: '選択肢はそれぞれ1〜2文の具体的なソリューション提案',
      difficultyNote: 'AWS実務経験1年以上を想定した中級レベル',
    },
    'Professional': {
      questionDesc: '複雑なマルチサービス・マルチアカウント環境のアーキテクチャ判断を問う問題',
      questionLength: '問題文は5〜8文の複雑なシナリオ（複数の要件・制約・既存環境の記述を含む）',
      choiceLength: '選択肢はそれぞれ2〜3文で、具体的なアーキテクチャ戦略や手順を記述',
      difficultyNote: 'AWS実務経験2年以上を想定した上級レベル。トレードオフの判断力を問う',
    },
    'Specialty': {
      questionDesc: '専門領域の深い技術知識とベストプラクティスを問うシナリオ問題',
      questionLength: '問題文は4〜7文の専門的なシナリオ（技術的な制約や要件を詳述）',
      choiceLength: '選択肢はそれぞれ1〜3文で、技術的に異なるアプローチを提案',
      difficultyNote: '当該専門分野でのAWS実務経験2〜5年を想定した高度なレベル',
    },
  };

  const guide = levelGuide[examLevel] || levelGuide['Associate'];

  if (getLocale() === 'en') {
    const enLevelGuide = {
      'Foundational': {
        questionDesc: 'Questions testing broad foundational AWS cloud knowledge',
        questionLength: 'Question text is 2-4 sentences with basic situational context',
        choiceLength: 'Each choice is 1 sentence (testing service names or basic concepts)',
        difficultyNote: 'Level suitable for someone with ~6 months of AWS study',
      },
      'Business': {
        questionDesc: 'Scenario questions about AI adoption decisions, governance, and business value (not technical implementation details)',
        questionLength: 'Question text is 2-4 sentences with a business situational context',
        choiceLength: 'Each choice is 1-2 sentences (strategy, judgment, or governance options)',
        difficultyNote: 'Level testing business judgment rather than technical implementation (assumes command of foundational AI/ML/GenAI terminology)',
      },
      'Associate': {
        questionDesc: 'Scenario-based questions reflecting real-world situations',
        questionLength: 'Question text is 3-5 sentences with specific business scenarios (including requirements and constraints)',
        choiceLength: 'Each choice is 1-2 sentences proposing specific solutions',
        difficultyNote: 'Intermediate level assuming 1+ years of AWS hands-on experience',
      },
      'Professional': {
        questionDesc: 'Questions about complex multi-service, multi-account architecture decisions',
        questionLength: 'Question text is 5-8 sentences with complex scenarios (multiple requirements, constraints, existing infrastructure)',
        choiceLength: 'Each choice is 2-3 sentences describing specific architecture strategies or procedures',
        difficultyNote: 'Advanced level assuming 2+ years of AWS experience. Tests trade-off judgment',
      },
      'Specialty': {
        questionDesc: 'Scenario-based questions testing deep technical knowledge and best practices in specialized domains',
        questionLength: 'Question text is 4-7 sentences with specialized scenarios (detailed technical constraints and requirements)',
        choiceLength: 'Each choice is 1-3 sentences proposing technically different approaches',
        difficultyNote: 'Advanced level assuming 2-5 years of AWS experience in the specialty domain',
      },
    };
    const enGuide = enLevelGuide[examLevel] || enLevelGuide['Associate'];
    return (
      `You are an expert AWS certification exam question author. Create 1 multiple-choice question of identical quality to the real ${examCode} (${examShortLabel}) exam.\n\n` +
      `[Exam Level] ${examLevel}\n` +
      `[Question Format] ${enGuide.questionDesc}\n` +
      `[Question Length] ${enGuide.questionLength}\n` +
      `[Choice Length] ${enGuide.choiceLength}\n` +
      `[Difficulty] ${enGuide.difficultyNote}\n\n` +
      `[Explanation Requirements — IMPORTANT]\n` +
      `Create a detailed explanation with the following structure:\n` +
      `1. Explain specifically why the correct choice is right\n` +
      `2. Explain why each incorrect choice (A/B/C/D) is inappropriate in 1-2 sentences each\n` +
      `3. Reference relevant AWS best practices or Well-Architected Framework principles\n` +
      `4. Cite 1-2 relevant AWS official documentation URLs (format: Reference: https://docs.aws.amazon.com/...)\n\n` +
      `You MUST output ONLY the following JSON format (no markdown or other text):\n` +
      '```json\n' +
      '{\n' +
      '  "question": "Exam-equivalent scenario question text",\n' +
      '  "choices": ["A. Choice 1", "B. Choice 2", "C. Choice 3", "D. Choice 4"],\n' +
      '  "correct": "B",\n' +
      '  "explanation": "Detailed explanation (correct reason → each incorrect reason → best practices → AWS documentation URLs)"\n' +
      '}\n' +
      '```'
    );
  }

  return (
    `あなたはAWS認定試験のエキスパート問題作成者です。${examCode}（${examShortLabel}）の本番試験とまったく同等品質の4択問題を1問作成してください。\n\n` +
    `【試験レベル】${examLevel}\n` +
    `【出題形式】${guide.questionDesc}\n` +
    `【問題文の長さ】${guide.questionLength}\n` +
    `【選択肢の長さ】${guide.choiceLength}\n` +
    `【難易度】${guide.difficultyNote}\n\n` +
    `【解説の要件 — 重要】\n` +
    `以下の構成で詳細な解説を作成してください：\n` +
    `1. 正解の選択肢が正しい理由を具体的に説明\n` +
    `2. 不正解の各選択肢（A/B/C/D）がなぜ不適切かを個別に1〜2文で説明\n` +
    `3. 関連するAWSのベストプラクティスやWell-Architectedフレームワークの原則に言及\n` +
    `4. 根拠として関連するAWS公式ドキュメントのURLを1〜2件引用（形式: 参考: https://docs.aws.amazon.com/...）\n\n` +
    `必ず以下のJSON形式のみで出力してください（マークダウンやそれ以外のテキストは不要です）：\n` +
    '```json\n' +
    '{\n' +
    '  "question": "本番同等のシナリオ問題文",\n' +
    '  "choices": ["A. 選択肢1", "B. 選択肢2", "C. 選択肢3", "D. 選択肢4"],\n' +
    '  "correct": "B",\n' +
    '  "explanation": "詳細な解説（正解理由 → 各不正解理由 → ベストプラクティス → AWS公式ドキュメントURL）"\n' +
    '}\n' +
    '```'
  );
}

/**
 * Distribute questions across exam domains based on weight proportions.
 * Returns an array of domain objects, one per question, shuffled.
 */
export function assignDomainTargets(domains, questionCount) {
  if (!domains || domains.length === 0) return Array(questionCount).fill(null);

  const totalWeight = domains.reduce((sum, d) => sum + (d.weight || 0), 0);
  if (totalWeight === 0) return Array(questionCount).fill(null);

  const allocations = domains.map(d => ({
    domain: d,
    exact: questionCount * (d.weight || 0) / totalWeight,
    count: Math.floor(questionCount * (d.weight || 0) / totalWeight),
  }));

  const targets = [];
  for (const a of allocations) {
    for (let i = 0; i < a.count; i++) targets.push(a.domain);
  }

  // Fill remaining slots by highest fractional part
  const byFraction = [...allocations].sort(
    (a, b) => (b.exact - b.count) - (a.exact - a.count)
  );
  for (const a of byFraction) {
    if (targets.length >= questionCount) break;
    targets.push(a.domain);
  }

  // Fisher-Yates shuffle
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [targets[i], targets[j]] = [targets[j], targets[i]];
  }

  return targets;
}

/**
 * Check if the session is complete (all questions answered or limit reached).
 */
export function isSessionComplete(session) {
  if (!session) return true;
  return session.currentIndex >= session.questionCount;
}

/**
 * Format seconds into M:SS display string.
 */
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${m}:${ss}`;
}
