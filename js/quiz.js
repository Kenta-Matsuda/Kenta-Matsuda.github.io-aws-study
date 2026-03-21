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
  speed:  { questionCount: 10, timeLimitSec: 300, preGenerate: true, label: 'スピードチャレンジ' },
  mock:   { questionCount: 65, timeLimitSec: 7800, preGenerate: true, label: '本番模擬試験' },  // defaults; overridden per-exam
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
 * Build a system prompt for speed-run mode (short 1Q1A format, answerable in ~30s).
 */
export function buildSpeedQuizSystemPrompt(examCode, examShortLabel) {
  return (
    `あなたはAWS認定試験のエキスパートです。${examCode}（${examShortLabel}）レベルの短答式4択問題を1問作成してください。\n\n` +
    `【重要】スピードラン用の問題です：\n` +
    `- 問題文は1〜2文で簡潔に（シナリオは不要、知識を直接問う形式）\n` +
    `- 選択肢はサービス名や機能名など短いものにする\n` +
    `- 30秒以内に解答できるレベルの問題にする\n\n` +
    `必ず以下のJSON形式のみで出力してください（マークダウンやそれ以外のテキストは不要です）：\n` +
    '```json\n' +
    '{\n' +
    '  "question": "短い問題文（1〜2文）",\n' +
    '  "choices": ["A. 選択肢1", "B. 選択肢2", "C. 選択肢3", "D. 選択肢4"],\n' +
    '  "correct": "B",\n' +
    '  "explanation": "正解の理由の簡潔な解説（1〜2文）"\n' +
    '}\n' +
    '```'
  );
}

/**
 * Build a general user prompt for cross-domain quiz (dashboard mode).
 * When targetDomain is provided, the prompt is scoped to that domain's topics.
 */
export function buildGeneralQuizUserPrompt(examCode, targetDomain) {
  if (targetDomain) {
    const name = targetDomain.jpTitle || targetDomain.title;
    let prompt = `${examCode}試験のドメイン「${name}」の出題範囲から問題を1問、指定のJSON形式で作成してください。`;
    if (targetDomain.tasks && targetDomain.tasks.length > 0) {
      const taskNames = targetDomain.tasks.map(t => t.jpTitle || t.title).join('、');
      prompt += `\nこのドメインには以下のタスクがあります: ${taskNames}\nこの中からランダムに1つ選んで出題してください。`;
    }
    return prompt;
  }
  return `${examCode}試験の出題範囲から、ランダムなドメイン・トピックに関する問題を1問、指定のJSON形式で作成してください。毎回異なるドメインやトピックから出題してください。`;
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
