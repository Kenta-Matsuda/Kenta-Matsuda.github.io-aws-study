/**
 * Quiz engine — parses AI responses into interactive quizzes,
 * manages combo streaks, and scores answers.
 */

// ─── Quiz Parsing ───────────────────────────────────────────

/**
 * Try to parse the AI response as structured JSON quiz.
 * Expected shape: { question, choices: string[], correct: "A"|"B"|"C"|"D", explanation }
 * @param {string} text
 * @returns {{ question: string, choices: string[], correctIndex: number, explanation: string } | null}
 */
export function parseQuizJson(text) {
  // Strip markdown code fences that wrap JSON
  const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  try {
    const obj = JSON.parse(stripped);
    return normalizeQuizObject(obj);
  } catch {
    // Try to find JSON embedded in markdown
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (jsonMatch) {
      try {
        return normalizeQuizObject(JSON.parse(jsonMatch[1].trim()));
      } catch { /* fall through */ }
    }
    return null;
  }
}

function normalizeQuizObject(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const question = String(obj.question || '').trim();
  const choices = Array.isArray(obj.choices) ? obj.choices.map((c) => String(c || '').trim()) : [];
  const correct = String(obj.correct || '').trim().toUpperCase();
  const explanation = String(obj.explanation || '').trim();

  if (!question || choices.length < 2) return null;

  const correctIndex = letterToIndex(correct);
  if (correctIndex < 0 || correctIndex >= choices.length) return null;

  return { question, choices, correctIndex, explanation };
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
  single: { questionCount: 1, timeLimitSec: 0, preGenerate: false, label: '1問チャレンジ' },
  quick5: { questionCount: 5, timeLimitSec: 0, preGenerate: false, label: '5問連続' },
  speed:  { questionCount: 10, timeLimitSec: 300, preGenerate: true, label: 'スピードチャレンジ' },  // 30s × 10
  mock:   { questionCount: 15, timeLimitSec: 1500, preGenerate: true, label: '本番模擬試験' },        // 25 min
};

/**
 * Create a new quiz session object.
 * @param {{ examId: string, domainId?: number, mode?: string }} opts
 */
export function createQuizSession(opts = {}) {
  const mode = opts.mode || 'single';
  const config = QUIZ_MODE_CONFIG[mode] || QUIZ_MODE_CONFIG.single;
  return {
    examId: opts.examId || '',
    domainId: opts.domainId ?? null,
    mode,
    questionCount: config.questionCount,
    timeLimitSec: config.timeLimitSec,
    preGenerate: config.preGenerate,
    questions: [],                      // parsed quiz objects
    answers: [],                        // user answer indices (-1 = unanswered/timed-out)
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
  return (
    `あなたはAWS認定試験のエキスパートです。${examCode}（${examShortLabel}）レベルの4択問題を1問作成してください。\n\n` +
    `必ず以下のJSON形式のみで出力してください（マークダウンやそれ以外のテキストは不要です）：\n` +
    '```json\n' +
    '{\n' +
    '  "question": "シナリオを含む問題文",\n' +
    '  "choices": ["A. 選択肢1", "B. 選択肢2", "C. 選択肢3", "D. 選択肢4"],\n' +
    '  "correct": "B",\n' +
    '  "explanation": "正解の理由と、他の選択肢が不正解である理由の簡潔な解説"\n' +
    '}\n' +
    '```\n' +
    '実践的なシナリオベースの問題を作成してください。'
  );
}

/**
 * Build the user prompt for quiz generation.
 */
export function buildQuizUserPrompt(taskTitle, taskContext) {
  let prompt = `タスク: 「${taskTitle}」に関連する、実践的なシナリオベースの選択問題を1問、指定のJSON形式で作成してください。`;
  if (taskContext) {
    prompt += `\n\n【タスク文脈】\n${taskContext}`;
  }
  return prompt;
}

/**
 * Check if the session is complete (all questions answered or limit reached).
 */
export function isSessionComplete(session) {
  if (!session) return true;
  const config = QUIZ_MODE_CONFIG[session.mode] || QUIZ_MODE_CONFIG.single;
  return session.currentIndex >= config.questionCount;
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
