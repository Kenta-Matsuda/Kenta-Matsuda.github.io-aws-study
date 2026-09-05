import { callAi, callAiStream, callAiBatch, getActiveProviderLabel, isAiBatchEligible, markAiBatchUnavailable } from './ai.js';
import { EXAM_ID_TO_HASH, EXAM_CATEGORIES } from './exams.js';
import { COMMON_STEPS, COMMON_STEP_TITLES } from './data/common-steps.js';
import { applyResourceGroupDefaults } from './data/common-defaults.js';
import {
  getApiKey,
  saveApiKeyFromInput,
  clearApiKey,
  getOpenAiApiKey,
  saveOpenAiApiKey,
  clearOpenAiApiKey,
  getAiProvider,
  setAiProvider,
  resetAppStorage,
  getUserName,
  setUserName,
  addXp,
  getXpSummary,
  getStreakInfo,
  getStudyReminderEnabled,
  setStudyReminderEnabled,
  getCelebratedStreakMilestone,
  setCelebratedStreakMilestone,
  addQuizResult,
  getQuizHistory,
  getQuizAnalytics,
  exportQuizHistory,
  getTheme,
  setTheme,
  getEffectiveTheme,
  getSmartReviewCombined,
  addReviewSchedule,
} from './storage.js';
import { clearVote, getExistingVote, submitVote } from './votes.js';
import { escapeHtml, escapeRegExp } from './utils.js';
import {
  parseQuizResponse,
  indexToLetter,
  getComboMultiplier,
  getComboLabel,
  createQuizSession,
  recordAnswer,
  getSessionSummary,
  buildQuizSystemPrompt,
  buildQuizUserPrompt,
  buildSpeedQuizSystemPrompt,
  buildMockQuizSystemPrompt,
  buildGeneralQuizUserPrompt,
  assignDomainTargets,
  getExamLevel,
  QUIZ_MODE_CONFIG,
  EXAM_MOCK_CONFIG,
  isSessionComplete,
  formatTime,
} from './quiz.js';
import { initChat, resetChat } from './chat.js';
import { getDailyChallengeQuestions } from './data/daily-challenge.js';
import { getOfflineExamQuestions, getOfflineExamPoolSize } from './data/offline-exam-bank.js';
import { t, getLocale, setLocale, onLocaleChange, translateStaticElements, getLocalizedUrl } from './i18n.js';

/**
 * Return locale-aware title: jpTitle for 'ja', title (English) for 'en'.
 * Falls back to whichever is available.
 */
function localizedTitle(obj) {
  if (!obj) return '';
  if (getLocale() === 'ja') return obj.jpTitle || obj.title || '';
  return obj.title || obj.jpTitle || '';
}

/**
 * Return locale-aware description lines.
 * Uses descriptionEn (if available) for 'en', description for 'ja'.
 */
function localizedDescription(obj) {
  if (!obj) return [];
  if (getLocale() === 'en' && obj.descriptionEn) return obj.descriptionEn;
  return obj.description || [];
}

/**
 * Return locale-aware knowledge array.
 * Uses knowledgeEn (if available) for 'en', knowledge for 'ja'.
 */
function localizedKnowledge(obj) {
  if (!obj) return [];
  if (getLocale() === 'en' && obj.knowledgeEn) return obj.knowledgeEn;
  return obj.knowledge || [];
}

/**
 * Return locale-aware subtitle.
 */
function localizedSubtitle(exam) {
  if (!exam) return '';
  if (getLocale() === 'en') return exam.subtitleEn || t('header.subtitle');
  return exam.subtitle || '';
}

/**
 * Return locale-aware resource label.
 */
function localizedResourceLabel(section) {
  if (!section) return '';
  if (getLocale() === 'en' && section.labelEn) return section.labelEn;
  return section.label || '';
}

/**
 * Return locale-aware resource item title.
 */
function localizedResourceTitle(item) {
  if (!item) return '';
  if (getLocale() === 'en' && item.titleEn) return item.titleEn;
  return item.title || '';
}

/**
 * Return locale-aware resource item note.
 */
function localizedResourceNote(item) {
  if (!item) return '';
  if (getLocale() === 'en' && item.noteEn) return item.noteEn;
  return item.note || '';
}

/**
 * Return locale-aware resource item technical level (issue #137).
 * AWS numeric levels (e.g. 'Level 200') are language-neutral, so most items
 * only set `level`; `levelEn` is optional for cases needing different phrasing.
 */
function localizedResourceLevel(item) {
  if (!item) return '';
  if (getLocale() === 'en' && item.levelEn) return item.levelEn;
  return item.level || '';
}

/**
 * Return locale-aware domain description.
 */
function localizedDomainDescription(domain) {
  if (!domain) return '';
  if (getLocale() === 'en' && domain.descriptionEn) return domain.descriptionEn;
  return domain.description || '';
}

/**
 * Return locale-aware quiz mode label from config.
 */
function localizedModeLabel(config) {
  if (!config) return '';
  if (getLocale() === 'en' && config.labelEn) return config.labelEn;
  return config.label || '';
}

let chartInstance = null;

const XP_RULES = {
  link: 2,
  explain: 5,
  quiz: 10,
  feedback: 5, // XP for submitting text feedback (once per day, see FEEDBACK_XP_DAY_KEY guard)
};

// localStorage key used to record the last day feedback XP was awarded, so
// repeated feedback submissions cannot farm unbounded XP. This guard only
// gates the XP award; it never blocks the feedback submission itself.
const FEEDBACK_XP_DAY_KEY = 'asn_feedback_xp_day';

// localStorage key used to record the last day Daily Challenge XP was awarded.
// The Daily Challenge (issue #34) is deterministic, free, and replayable, so
// without a guard a user could re-enter the same five questions and farm the
// base `quiz` XP without limit (reason 'quiz' only caps the once-daily 2x
// bonus, never the base award). This guard mirrors FEEDBACK_XP_DAY_KEY: it
// gates only the XP award to once per local day; play stays unlimited.
const DAILY_CHALLENGE_XP_DAY_KEY = 'asn_daily_challenge_xp_day';

// localStorage key recording the last state of the lightweight feedback nudge
// (issue #100). Stored value is one of: 'dismissed' (user closed/declined the
// nudge) or 'opened' (user acted on it). Either way the nudge is not shown
// again, so it stays gentle and non-repetitive. This only affects the optional
// nudge; the feedback button/modal are always available regardless.
const FEEDBACK_NUDGE_KEY = 'asn_feedback_nudge_v1';

// How many questions a visitor must answer before the feedback nudge appears,
// so it only surfaces after some genuine engagement (never on first load).
const FEEDBACK_NUDGE_MIN_QUESTIONS = 5;

/** Local YYYY-MM-DD day string, matching storage.js's getLocalDayString(). */
function feedbackLocalDayString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function initApp({ exams, getExamById, defaultExamId }) {
  const els = getElements();

  /**
   * True only when `examId` maps to a real exam in the exams catalog. Guards
   * against pseudo-exam sentinels like '__beginner__' (which are truthy but
   * have no exam record) leaking into result/XP tagging.
   * @param {string | undefined | null} examId
   * @returns {boolean}
   */
  function isRealExamId(examId) {
    if (!examId) return false;
    try {
      return Boolean(getExamById(examId));
    } catch {
      return false;
    }
  }

  // Session id of the Daily Challenge session that first claimed today's XP
  // award. Only that session keeps awarding base XP for its questions; later
  // replays on the same local day award nothing (see DAILY_CHALLENGE_XP_DAY_KEY).
  let dailyXpAwardedSessionId = '';

  /** @type {null | { type: 'explain', examId: string, term: string, taskContext: string } | { type: 'quiz', examId: string, taskId: string, taskTitle: string, taskContext: string }} */
  let lastAiRequest = null;

  const VOTE_SELECTED_CLASSES = ['bg-gray-900', 'text-white', 'border-gray-900', 'hover:bg-gray-800'];
  const VOTE_NORMAL_CLASSES = ['bg-white', 'text-gray-700', 'border-gray-200', 'hover:bg-gray-100'];

  function setVoteButtonState(btn, { selected, disabled }) {
    if (!btn) return;
    btn.disabled = Boolean(disabled);
    btn.classList.toggle('opacity-60', Boolean(disabled));
    btn.classList.toggle('cursor-not-allowed', Boolean(disabled));

    const add = selected ? VOTE_SELECTED_CLASSES : VOTE_NORMAL_CLASSES;
    const remove = selected ? VOTE_NORMAL_CLASSES : VOTE_SELECTED_CLASSES;
    btn.classList.add(...add);
    btn.classList.remove(...remove);
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
  }

  function applyVoteGroupStyles(groupEl, selectedValue, { disabled } = {}) {
    if (!groupEl) return;
    groupEl.querySelectorAll('button[data-action="vote"]').forEach((b) => {
      const v = String(b.dataset.vote || '').trim();
      setVoteButtonState(b, { selected: v && v === selectedValue, disabled });
    });
  }

  function buildAiVoteTargetId(req) {
    if (!req) return '';
    const examId = String(req.examId || '');
    if (req.type === 'explain') {
      return `explain|${examId}|${String(req.term || '').trim()}`;
    }
    if (req.type === 'quiz') {
      const taskId = String(req.taskId || '').trim();
      return taskId ? `quiz|${examId}|${taskId}` : `quiz|${examId}|${String(req.taskTitle || '').trim()}`;
    }
    return '';
  }

  function applyBinaryVoteStyles({ goodBtn, badBtn, value, disabled }) {
    setVoteButtonState(goodBtn, { selected: value === 'good', disabled });
    setVoteButtonState(badBtn, { selected: value === 'bad', disabled });
  }

  function reflectAiVoteUi() {
    const targetId = buildAiVoteTargetId(lastAiRequest);
    const existing = targetId ? getExistingVote({ targetType: 'ai', targetId }) : null;
    applyBinaryVoteStyles({
      goodBtn: els.aiVoteGoodBtn,
      badBtn: els.aiVoteBadBtn,
      value: existing,
      disabled: !targetId,
    });
  }

  function voteAi(value) {
    const targetId = buildAiVoteTargetId(lastAiRequest);
    if (!targetId) return { ok: false, reason: 'missing_ai_request' };
    const examId = String(lastAiRequest?.examId || '');
    const kind = String(lastAiRequest?.type || '');

    const existing = getExistingVote({ targetType: 'ai', targetId });
    if (existing === value) {
      return clearVote({
        targetType: 'ai',
        targetId,
        meta: {
          exam_id: examId,
          ai_kind: kind,
          ai_term: kind === 'explain' ? String(lastAiRequest?.term || '') : undefined,
          ai_task_id: kind === 'quiz' ? String(lastAiRequest?.taskId || '') : undefined,
          ai_task_title: kind === 'quiz' ? String(lastAiRequest?.taskTitle || '') : undefined,
        },
      });
    }

    return submitVote({
      targetType: 'ai',
      targetId,
      value,
      meta: {
        exam_id: examId,
        ai_kind: kind,
        ai_term: kind === 'explain' ? String(lastAiRequest?.term || '') : undefined,
        ai_task_id: kind === 'quiz' ? String(lastAiRequest?.taskId || '') : undefined,
        ai_task_title: kind === 'quiz' ? String(lastAiRequest?.taskTitle || '') : undefined,
      },
    });
  }

  function updateAiRetryButton({ visible, disabled } = {}) {
    if (!els.aiRetryBtn) return;
    const isVisible = visible ?? Boolean(lastAiRequest);
    els.aiRetryBtn.classList.toggle('hidden', !isVisible);
    els.aiRetryBtn.disabled = disabled ?? false;
    els.aiRetryBtn.classList.toggle('opacity-60', els.aiRetryBtn.disabled);
    els.aiRetryBtn.classList.toggle('cursor-not-allowed', els.aiRetryBtn.disabled);
  }

  /** Active quiz session (null when not in quiz mode) */
  let quizSession = null;

  /** Background batch state (Gemini 3 mock generation) */
  let batchInProgress = false;
  let pendingBatchSession = null; // session ready to start when user clicks "クイズを開始する"
  let pendingBatchRequest = null;

  /** Helper to get/set current parsed quiz (shared between initApp scope and module-level renderInteractiveQuiz) */
  function getCurrentParsedQuiz() {
    return window.__currentParsedQuiz || null;
  }
  function setCurrentParsedQuiz(q) {
    window.__currentParsedQuiz = q;
  }

  async function runAiRequest(req) {
    const exam = getExamById(req.examId);
    updateAiRetryButton({ visible: true, disabled: true });
    if (req.type === 'explain') {
      const ok = await explainTerm({ els, exam, examId: req.examId, term: req.term, taskContext: req.taskContext });
      if (ok) {
        const result = addXp({ amount: XP_RULES.explain, reason: 'explain' });
        if (result?.unlocked?.length) {
          showMilestoneToast({ els, unlocked: result.unlocked });
        }
        renderXpDashboard({ els, exam: getExamById(req.examId), state });
        renderLearningStatus({ els, exam: getExamById(req.examId), state });
      }
      return;
    }
    // Quiz: generate but do NOT award XP yet — wait for user answer
    const ok = await generateQuiz({
      els,
      exam,
      examId: req.examId,
      taskTitle: req.taskTitle,
      taskContext: req.taskContext,
      session: quizSession,
      isDashboardQuiz: req.isDashboardQuiz,
      domainId: typeof state.currentDomainId === 'number' ? state.currentDomainId : null,
    });
    if (ok && quizSession) {
      updateQuizProgress();
    }
    // XP is awarded in handleQuizAnswer after user picks a choice
  }

  els.aiRetryBtn?.addEventListener('click', async () => {
    if (!lastAiRequest) return;
    await runAiRequest(lastAiRequest);
  });

  // Quiz: "Next question" button
  els.quizNextBtn?.addEventListener('click', async () => {
    if (!lastAiRequest || lastAiRequest.type !== 'quiz') return;
    if (!quizSession) return;

    if (isSessionComplete(quizSession)) {
      showQuizSummary({ els, session: quizSession });
      return;
    }

    // For pre-generated modes, show next cached question
    if (quizSession.preGenerate && quizSession.questions[quizSession.currentIndex]) {
      // Resume timer if paused (and not expired)
      if (quizSession.timeLimitSec > 0 && !quizTimerExpired) {
        resumeQuizTimer();
      }
      renderInteractiveQuiz({ els, quiz: quizSession.questions[quizSession.currentIndex] });
      updateQuizProgress();
      return;
    }

    // Otherwise generate next question
    await runAiRequest(lastAiRequest);
  });

  // --- Quiz Mode Selection ---
  let selectedQuizMode = 'quick5';

  // Mode card selection
  els.quizModeCards?.addEventListener('click', (e) => {
    const card = e.target.closest('.quiz-mode-card');
    if (!card) return;
    els.quizModeCards.querySelectorAll('.quiz-mode-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedQuizMode = card.dataset.quizMode || 'quick5';
  });

  // Start button
  els.quizModeStartBtn?.addEventListener('click', async () => {
    if (!lastAiRequest || lastAiRequest.type !== 'quiz') return;

    const mode = selectedQuizMode;
    const config = QUIZ_MODE_CONFIG[mode] || QUIZ_MODE_CONFIG.single;

    // ── Smart Review path ──
    if (mode === 'smartReview') {
      const reviewQuestions = getSmartReviewCombined(lastAiRequest.examId);
      if (reviewQuestions.length === 0) {
        alert(getLocale() === 'ja'
          ? '復習対象の問題がまだありません。まずはクイズに挑戦しましょう！'
          : 'No questions to review yet. Try a quiz first!');
        return;
      }
      closeModal(els.quizModeModal);

      quizSession = createQuizSession({ examId: lastAiRequest.examId, mode: 'quick5' });
      quizSession.sessionId = 'qs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      quizSession.questionCount = reviewQuestions.length;
      quizSession.questions = reviewQuestions.map(h => ({
        question: h.question,
        choices: h.choices,
        correctIndex: h.correctIndex,
        explanation: h.explanation,
        domainId: h.domainId ?? null,
      }));
      quizSession.preGenerate = true;
      quizSession.startedAt = Date.now();
      quizSession._isSmartReview = true;

      const exam = getExamById(lastAiRequest.examId);
      showAiModal(els, getLocale() === 'ja' ? `スマート復習（${reviewQuestions.length}問）` : `Smart Review (${reviewQuestions.length} questions)`, true);
      if (els.modalContent) els.modalContent.innerHTML = '';
      if (els.modalLoading) els.modalLoading.classList.add('hidden');
      resetQuizUi(els);
      if (els.quizArea) els.quizArea.classList.remove('hidden');

      renderInteractiveQuiz({ els, quiz: quizSession.questions[0] });
      updateQuizProgress();
      if (els.quizComboBar) els.quizComboBar.classList.remove('hidden');
      if (els.quizQuestion) els.quizQuestion.classList.remove('hidden');
      if (els.quizChoices) els.quizChoices.classList.remove('hidden');
      return;
    }

    // ── Background Batch path ──
    // 「本番形式の模擬問題（mock）」かつ Gemini 3 系モデル利用時は、
    // Batch API で非同期生成し、完了をトーストで通知する。
    if (mode === 'mock' && isAiBatchEligible()) {
      // 進行中のバッチがあれば二重起動を防ぐ
      if (batchInProgress) {
        alert(getLocale() === 'ja'
          ? '既にバッチ生成が進行中です。完了するまでお待ちください。'
          : t('batch.alreadyInProgress'));
        return;
      }
      const ok = window.confirm(
        getLocale() === 'ja'
          ? '本番模擬試験を「Gemini Batch API」で生成します。\n\n' +
            '⚠️ 注意事項\n' +
            '・完了まで数分〜最大数十分かかる場合があります\n' +
            '・このタブ／ブラウザを閉じると生成は中断されます\n' +
            '・完了したら画面右下に通知が表示されます\n\n' +
            '続行しますか？'
          : t('batch.confirmStart')
      );
      if (!ok) return;
      closeModal(els.quizModeModal);

      // Create session (questions will be filled later)
      const session = createQuizSession({ examId: lastAiRequest.examId, mode });
      session.sessionId = 'qs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
      // Don't set startedAt yet — start when user clicks "クイズを開始する"
      startMockBatchInBackground({ els, session, request: lastAiRequest, config });
      return;
    }

    closeModal(els.quizModeModal);

    // Create session
    quizSession = createQuizSession({ examId: lastAiRequest.examId, mode });
    quizSession.sessionId = 'qs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    quizSession.startedAt = Date.now();

    if (config.preGenerate) {
      // Pre-generate all questions, then start
      await preGenerateQuestions({ els, session: quizSession, request: lastAiRequest, config });
    } else {
      // Generate first question immediately
      await runAiRequest(lastAiRequest);
    }
  });

  // --- Dashboard Quiz Button ---
  // Shared cross-domain quiz launcher used by both the carousel #dashboardQuizBtn
  // and the prominent top-screen #mainStudyCtaBtn (issue #40), so behavior is identical.
  function startDashboardStudySession() {
    const exam = getExamById(state.examId);
    lastAiRequest = {
      type: 'quiz',
      examId: state.examId,
      taskId: '',
      taskTitle: getLocale() === 'ja' ? `${exam.code} 全ドメイン横断` : `${exam.code} All Domains`,
      taskContext: '',
      isDashboardQuiz: true,
    };
    reflectAiVoteUi();
    if (els.quizModeTaskLabel) els.quizModeTaskLabel.textContent = getLocale() === 'ja'
      ? `${exam.code}（${exam.shortLabel}）全ドメイン横断クイズ`
      : `${exam.code} (${exam.shortLabel}) Cross-Domain Quiz`;
    // Update smart review count
    if (els.smartReviewCount) {
      const reviewQ = getSmartReviewCombined(state.examId);
      els.smartReviewCount.textContent = reviewQ.length > 0
        ? (getLocale() === 'ja' ? `📊 ${reviewQ.length}問の復習対象あり` : `📊 ${reviewQ.length} questions to review`)
        : (getLocale() === 'ja' ? '📊 復習対象なし（まずクイズに挑戦！）' : '📊 No questions to review (try a quiz first!)');
    }
    openModal(els.quizModeModal);
  }

  els.dashboardQuizBtn?.addEventListener('click', startDashboardStudySession);
  els.mainStudyCtaBtn?.addEventListener('click', startDashboardStudySession);

  // --- Daily Challenge Button (API-key-free, issue #34) ---
  // 事前用意した静的問題プールから、その日の5問を決定的に出題する。
  // AIプロバイダー/APIキーは一切使わないため、キー未設定でも遊べる。
  els.dailyChallengeBtn?.addEventListener('click', () => {
    // Fall back to a real exam id whenever the current selection is not a real
    // exam (e.g. the '__beginner__' pseudo-mode, which is truthy so a plain
    // `|| 'clf-c02'` would never fire). Tagging results/XP to a non-exam id
    // would break per-exam history and getExamById lookups downstream.
    const dailyExamId = isRealExamId(state.examId) ? state.examId : 'clf-c02';
    const questions = getDailyChallengeQuestions(5, new Date(), getLocale());
    if (!questions.length) return;

    quizSession = createQuizSession({ examId: dailyExamId, mode: 'quick5' });
    quizSession.sessionId = 'qs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    quizSession.questionCount = questions.length;
    quizSession.questions = questions.map(q => ({
      question: q.question,
      choices: q.choices,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      domainId: null,
    }));
    quizSession.preGenerate = true;
    quizSession.startedAt = Date.now();
    quizSession._isDailyChallenge = true;

    const dailyTitle = getLocale() === 'ja'
      ? `デイリーチャレンジ（${questions.length}問）`
      : `Daily Challenge (${questions.length} questions)`;

    lastAiRequest = {
      type: 'quiz',
      examId: dailyExamId,
      taskId: '',
      taskTitle: getLocale() === 'ja' ? 'デイリーチャレンジ' : 'Daily Challenge',
      taskContext: '',
      isDashboardQuiz: true,
    };

    showAiModal(els, dailyTitle, true);
    if (els.modalContent) els.modalContent.innerHTML = '';
    if (els.modalLoading) els.modalLoading.classList.add('hidden');
    resetQuizUi(els);
    if (els.quizArea) els.quizArea.classList.remove('hidden');

    renderInteractiveQuiz({ els, quiz: quizSession.questions[0] });
    updateQuizProgress();
    if (els.quizComboBar) els.quizComboBar.classList.remove('hidden');
    if (els.quizQuestion) els.quizQuestion.classList.remove('hidden');
    if (els.quizChoices) els.quizChoices.classList.remove('hidden');
  });

  // --- Offline Production-Format Exam Button (API-key-free, issue #124) ---
  // 本番形式（模擬試験・65問・時間制限あり）を、事前用意した静的問題バンクから
  // 決定的に組み立てて出題する。AIプロバイダー/APIキーは一切使わないため、キー未設定でも
  // 本番レベルの学習ができる。#124 のメンテナー確認（APIキー不要にすべき対象は
  // デイリーチャレンジ5問ではなく65問の本番形式）に対応するための入口。
  //
  // 注意: この経路は getApiKey/getOpenAiApiKey/callAi/callAiStream/onRequireApiKey を
  // 一切呼ばない。AI生成の模擬試験（quizModeStartBtn の mock 経路）は従来どおりキーが必要。
  els.offlineExamBtn?.addEventListener('click', () => {
    // 実在の試験IDにフォールバック（'__beginner__' などの擬似モード対策）。
    const offlineExamId = isRealExamId(state.examId) ? state.examId : 'clf-c02';
    const poolSize = getOfflineExamPoolSize(offlineExamId);
    // mock セッションを作り、本番形式（時間制限・65問枠）の枠組みを適用する。
    quizSession = createQuizSession({ examId: offlineExamId, mode: 'mock' });
    quizSession.sessionId = 'qs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    // 静的プールのサイズで出題数をクランプ（多くの試験で65、プールが小さい試験は最大数）。
    const targetCount = Math.min(quizSession.questionCount || 65, poolSize);
    const questions = getOfflineExamQuestions(offlineExamId, targetCount, { locale: getLocale() });
    if (!questions.length) return;

    quizSession.questionCount = questions.length;
    quizSession.questions = questions.map(q => ({
      question: q.question,
      choices: q.choices,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      domainId: null,
    }));
    quizSession.preGenerate = true;
    quizSession.startedAt = Date.now();
    quizSession._isOfflineExam = true;

    const exam = getExamById(offlineExamId);
    const offlineTitle = getLocale() === 'ja'
      ? `本番形式（APIキー不要）: ${exam?.code || offlineExamId}（${questions.length}問）`
      : `Practice Exam (no API key): ${exam?.code || offlineExamId} (${questions.length} questions)`;

    lastAiRequest = {
      type: 'quiz',
      examId: offlineExamId,
      taskId: '',
      taskTitle: getLocale() === 'ja' ? '本番形式（APIキー不要）' : 'Practice Exam (no API key)',
      taskContext: '',
      isDashboardQuiz: true,
    };

    showAiModal(els, offlineTitle, true);
    if (els.modalContent) els.modalContent.innerHTML = '';
    if (els.modalLoading) els.modalLoading.classList.add('hidden');
    resetQuizUi(els);
    if (els.quizArea) els.quizArea.classList.remove('hidden');

    // 本番形式なので、mock セッションの時間制限があればタイマーを開始する。
    if (quizSession.timeLimitSec > 0) {
      startQuizTimer(quizSession.timeLimitSec);
    }

    renderInteractiveQuiz({ els, quiz: quizSession.questions[0] });
    updateQuizProgress();
    if (els.quizComboBar) els.quizComboBar.classList.remove('hidden');
    if (els.quizQuestion) els.quizQuestion.classList.remove('hidden');
    if (els.quizChoices) els.quizChoices.classList.remove('hidden');
  });

  // --- Dashboard Quiz History Review Button ---
  els.dashboardReviewBtn?.addEventListener('click', () => {
    reviewState.selectedExamId = state.examId;
    reviewState.currentSessionId = null;
    renderQuizHistoryModal({ els, examId: state.examId, exams, getExamById });
    openModal(els.quizHistoryModal);
  });

  // Review modal state (exposed to module-level render functions)
  const reviewState = { selectedExamId: '', currentSessionId: null };
  window.__reviewState = reviewState;

  // Tab click delegation
  els.quizHistoryTabs?.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-exam-tab]');
    if (!tab) return;
    reviewState.selectedExamId = tab.dataset.examTab;
    reviewState.currentSessionId = null;
    renderQuizHistoryContent({ els, exams, getExamById });
  });

  // Session card / back button click delegation
  els.quizHistoryList?.addEventListener('click', (e) => {
    const sessionCard = e.target.closest('[data-session-id]');
    if (sessionCard) {
      reviewState.currentSessionId = sessionCard.dataset.sessionId;
      renderQuizHistoryContent({ els, exams, getExamById });
      return;
    }
  });

  els.quizHistoryBreadcrumb?.addEventListener('click', (e) => {
    const backBtn = e.target.closest('[data-action="back-to-sessions"]');
    if (backBtn) {
      reviewState.currentSessionId = null;
      renderQuizHistoryContent({ els, exams, getExamById });
    }
  });

  // Retry wrong questions
  els.quizHistoryActions?.addEventListener('click', (e) => {
    const retryBtn = e.target.closest('[data-action="retry-wrong"]');
    if (!retryBtn) return;

    const examId = reviewState.selectedExamId || undefined;
    const history = getQuizHistory(examId);
    const wrongEntries = history.filter(h => h.question && !h.isCorrect);
    if (wrongEntries.length === 0) return;

    // Deduplicate by question text
    const seen = new Set();
    const unique = wrongEntries.filter(h => {
      if (seen.has(h.question)) return false;
      seen.add(h.question);
      return true;
    });

    // Close review modal, open AI modal with pre-loaded questions
    closeModal(els.quizHistoryModal);

    const retryExamId = examId || unique[0].examId;
    quizSession = createQuizSession({ examId: retryExamId, mode: 'quick5' });
    quizSession.sessionId = 'qs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    quizSession.questionCount = unique.length;
    quizSession.questions = unique.map(h => ({
      question: h.question,
      choices: h.choices,
      correctIndex: h.correctIndex,
      explanation: h.explanation,
      domainId: h.domainId ?? null,
    }));
    quizSession.preGenerate = true;
    quizSession.startedAt = Date.now();

    const exam = getExamById(retryExamId);
    showAiModal(els, getLocale() === 'ja' ? `間違えた問題の解き直し（${unique.length}問）` : `Retry Incorrect Questions (${unique.length})`, true);
    if (els.modalContent) els.modalContent.innerHTML = '';
    if (els.modalLoading) els.modalLoading.classList.add('hidden');
    resetQuizUi(els);
    if (els.quizArea) els.quizArea.classList.remove('hidden');

    lastAiRequest = {
      type: 'quiz',
      examId: retryExamId,
      taskId: '',
      taskTitle: getLocale() === 'ja' ? '間違えた問題の解き直し' : 'Retry incorrect questions',
      taskContext: '',
      isDashboardQuiz: true,
    };

    renderInteractiveQuiz({ els, quiz: quizSession.questions[0] });
    updateQuizProgress();
    if (els.quizComboBar) els.quizComboBar.classList.remove('hidden');
    if (els.quizQuestion) els.quizQuestion.classList.remove('hidden');
    if (els.quizChoices) els.quizChoices.classList.remove('hidden');
  });

  // Export button
  els.quizHistoryExportBtn?.addEventListener('click', () => {
    const examId = reviewState.selectedExamId || undefined;
    const md = exportQuizHistory(examId);
    if (!md) return;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-history${examId ? '-' + examId : ''}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // --- Schedule Review Button ---
  els.scheduleReviewBtn?.addEventListener('click', () => {
    if (!quizSession) return;
    const wrongQuestions = quizSession.questions.filter((q, i) => q && quizSession.answers[i] !== q.correctIndex);
    if (wrongQuestions.length === 0) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    addReviewSchedule({
      examId: quizSession.examId,
      questionKeys: wrongQuestions.map(q => q.question.trim().slice(0, 100)),
      scheduledFor: tomorrow.toISOString(),
    });

    if (els.scheduleReviewBtn) {
      els.scheduleReviewBtn.disabled = true;
      els.scheduleReviewBtn.classList.add('opacity-60', 'cursor-not-allowed');
      els.scheduleReviewBtn.innerHTML = getLocale() === 'ja'
        ? '<i class="fas fa-check"></i> 復習スケジュールに登録しました'
        : '<i class="fas fa-check"></i> Added to review schedule';
    }
    if (els.scheduleReviewMsg) {
      els.scheduleReviewMsg.textContent = getLocale() === 'ja'
        ? `${wrongQuestions.length}問を明日の復習に登録しました`
        : `${wrongQuestions.length} questions scheduled for tomorrow's review`;
      els.scheduleReviewMsg.classList.remove('hidden');
    }
  });

  // --- Share Score Button (issue #33: viral boost for a strong practice-exam result) ---
  // Gated behind an explicit user click so the X intent tab opens on a user gesture
  // (no auto-popup). Reuses the same intent-URL builder + window.open pattern as tweetBtn.
  els.shareScoreBtn?.addEventListener('click', () => {
    if (!quizSession) return;
    const summary = getSessionSummary(quizSession);
    const exam = getExamById(quizSession.examId);
    const name = getUserName() || (getLocale() === 'ja' ? '名無し' : 'Anonymous');
    const text = buildTweetScoreText({
      userName: name,
      examCode: exam ? exam.code : quizSession.examId,
      accuracy: summary.accuracy,
      correct: summary.correct,
      total: summary.total,
    });
    const siteUrl = 'https://kenta-matsuda.github.io/Kenta-Matsuda.github.io-aws-study/';
    const intentUrl = buildTweetIntentUrl({ text, url: siteUrl });
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
  });

  // --- Timer ---
  let quizTimerInterval = null;
  let quizTimerRemaining = 0;
  let quizTimerPaused = false;
  let quizTimerExpired = false;

  function startQuizTimer(totalSec) {
    quizTimerRemaining = totalSec;
    quizTimerPaused = false;
    quizTimerExpired = false;
    if (els.quizTimerDisplay) els.quizTimerDisplay.classList.remove('hidden');
    if (els.quizTimerValue) {
      els.quizTimerValue.textContent = formatTime(quizTimerRemaining);
      els.quizTimerValue.classList.remove('quiz-timer-warning', 'quiz-timer-overtime');
    }

    quizTimerInterval = setInterval(() => {
      if (quizTimerPaused) return;
      quizTimerRemaining -= 1;
      if (els.quizTimerValue) {
        els.quizTimerValue.textContent = formatTime(quizTimerRemaining);
        if (quizTimerRemaining <= 60 && quizTimerRemaining > 0) {
          els.quizTimerValue.classList.add('quiz-timer-warning');
        }
      }
      if (quizTimerRemaining <= 0) {
        stopQuizTimer();
        onQuizTimeUp();
      }
    }, 1000);
  }

  function pauseQuizTimer() {
    quizTimerPaused = true;
  }

  function resumeQuizTimer() {
    quizTimerPaused = false;
  }

  function stopQuizTimer() {
    if (quizTimerInterval) {
      clearInterval(quizTimerInterval);
      quizTimerInterval = null;
    }
  }

  function onQuizTimeUp() {
    if (!quizSession) return;
    // Overtime mode: don't auto-end, let user continue
    quizTimerExpired = true;
    if (els.quizTimerValue) {
      els.quizTimerValue.textContent = `0:00${t('quiz.timerOvertime')}`;
      els.quizTimerValue.classList.remove('quiz-timer-warning');
      els.quizTimerValue.classList.add('quiz-timer-overtime');
    }
  }

  // --- Progress ---
  function updateQuizProgress() {
    if (!quizSession) return;
    const config = QUIZ_MODE_CONFIG[quizSession.mode] || QUIZ_MODE_CONFIG.single;
    const total = quizSession.questionCount;
    const current = quizSession.currentIndex;

    if (els.quizSessionProgress) {
      els.quizSessionProgress.textContent = `${current + 1} / ${total}`;
    }
    if (els.quizModeLabel) {
      els.quizModeLabel.textContent = localizedModeLabel(config);
    }
    if (total > 1) {
      if (els.quizProgressBar) els.quizProgressBar.classList.remove('hidden');
      if (els.quizProgressFill) {
        els.quizProgressFill.style.width = `${((current) / total) * 100}%`;
      }
    }
  }

  // --- Pre-generation ---
  async function preGenerateQuestions({ els, session, request, config }) {
    const exam = getExamById(request.examId);
    const total = session.questionCount;

    // Open AI modal and show pre-generation overlay
    showAiModal(els, `${localizedModeLabel(config)}: ${request.taskTitle}`, true);
    // Clear any previous content (e.g. old explanation)
    if (els.modalContent) els.modalContent.innerHTML = '';
    if (els.modalLoading) els.modalLoading.classList.add('hidden');
    resetQuizUi(els);
    if (els.quizArea) els.quizArea.classList.remove('hidden');
    if (els.quizPregenOverlay) els.quizPregenOverlay.classList.remove('hidden');
    if (els.quizPregenStatus) els.quizPregenStatus.textContent = getLocale() === 'ja' ? `0 / ${total} 問` : `0 / ${total}`;
    if (els.quizPregenFill) els.quizPregenFill.style.width = '0%';

    // Hide other quiz elements during pre-gen
    if (els.quizComboBar) els.quizComboBar.classList.add('hidden');
    if (els.quizQuestion) els.quizQuestion.classList.add('hidden');
    if (els.quizChoices) els.quizChoices.classList.add('hidden');

    const systemPrompt = session.mode === 'speed'
      ? buildSpeedQuizSystemPrompt(exam.code, exam.shortLabel)
      : session.mode === 'mock'
        ? buildMockQuizSystemPrompt(exam.code, exam.shortLabel, getExamLevel(request.examId))
        : buildQuizSystemPrompt(exam.code, exam.shortLabel);

    // For dashboard quiz, distribute questions across domains by weight
    const domainTargets = request.isDashboardQuiz
      ? assignDomainTargets(exam.domains, total)
      : [];

    // Strictly bound the number of generation attempts per question slot so a
    // 65-question flow cannot blow up in time: one initial attempt plus at most
    // one extra regeneration when the response fails to parse.
    const MAX_ATTEMPTS_PER_QUESTION = 2;

    const generated = [];
    let errorCount = 0;      // slots whose generation threw (callAi fallback also failed)
    let parseFailCount = 0;  // slots where every attempt returned an unparseable response
    for (let i = 0; i < total; i++) {
      // Build dedup hint: list topics/services already covered to avoid repetition
      const recentTopics = generated.slice(-5).map((q, idx) => `問${idx + 1}: ${q.question.slice(0, 80)}`).join('\n');
      const targetDomain = domainTargets[i] || null;
      const dedupSuffix = recentTopics
        ? `\n\n【重要】以下の問題とは異なるAWSサービス・トピックで出題してください（同じサービスの繰り返しは禁止）:\n${recentTopics}`
        : '';
      const userPrompt = (request.isDashboardQuiz
        ? buildGeneralQuizUserPrompt(exam.code, targetDomain)
        : buildQuizUserPrompt(request.taskTitle, request.taskContext))
        + dedupSuffix;

      let parsed = null;
      let slotErrored = false;
      for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_QUESTION && !parsed; attempt++) {
        // On regeneration attempts, nudge the model to emit strictly valid JSON so
        // the retry can recover a previous parse failure rather than re-rolling the
        // byte-identical prompt (which only helps under non-deterministic sampling).
        const attemptPrompt = attempt === 0
          ? userPrompt
          : `${userPrompt}\n\n【重要】前回の応答は解析できませんでした。有効なJSONオブジェクトのみを返してください（コードフェンスや説明文は不要です）。/ The previous response could not be parsed. Return only a single valid JSON object (no code fences or prose).`;
        let response = '';
        try {
          response = await callAiStream({
            userPrompt: attemptPrompt,
            systemPrompt,
            onRequireApiKey: () => openSettingsModal(els),
            onTextDelta: () => {},  // silent during pre-gen
          });

          if (String(response || '').includes('ストリーミングに対応していない環境')) {
            response = await callAi({
              userPrompt: attemptPrompt,
              systemPrompt,
              onRequireApiKey: () => openSettingsModal(els),
            });
          }
          slotErrored = false;
        } catch (err) {
          // retry once on error via the non-streaming path
          try {
            response = await callAi({
              userPrompt: attemptPrompt,
              systemPrompt,
              onRequireApiKey: () => openSettingsModal(els),
            });
            slotErrored = false;
          } catch {
            slotErrored = true;
            continue; // try the next bounded attempt (if any)
          }
        }

        parsed = parseQuizResponse(response);
      }

      if (parsed) {
        parsed.domainId = targetDomain?.id ?? null;
        generated.push(parsed);
        session.questions[generated.length - 1] = parsed;
      } else if (slotErrored) {
        errorCount++;
      } else {
        parseFailCount++;
      }

      // Update progress
      const done = generated.length;
      if (els.quizPregenStatus) els.quizPregenStatus.textContent = getLocale() === 'ja' ? `${done} / ${total} 問` : `${done} / ${total}`;
      if (els.quizPregenFill) els.quizPregenFill.style.width = `${(done / total) * 100}%`;
    }

    // If we couldn't generate anything, surface the total-failure message.
    if (generated.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(`[pregen] generated 0/${total} questions (errors: ${errorCount}, parse failures: ${parseFailCount})`);
      updateAiModalContent(els, t('errors.cannotGenerate'));
      return;
    }

    // Partial success: fewer questions were produced than requested. Let the user
    // know how many were generated while still starting the quiz.
    const isPartial = generated.length < total;
    if (isPartial) {
      // eslint-disable-next-line no-console
      console.warn(`[pregen] partial generation ${generated.length}/${total} (errors: ${errorCount}, parse failures: ${parseFailCount})`);
    }
    session.questionCount = generated.length;

    // Hide pre-gen overlay, show quiz
    if (els.quizPregenOverlay) els.quizPregenOverlay.classList.add('hidden');

    // Surface the partial-generation notice on a durable banner that lives in the
    // quiz area (not inside the pregen overlay, which is hidden above), so the user
    // actually sees how many of the requested questions were produced.
    if (isPartial && els.quizPartialNotice && els.quizPartialNoticeText) {
      const startingNote = getLocale() === 'ja'
        ? '生成できた問題でクイズを開始します。'
        : 'Starting the quiz with the questions that were created.';
      els.quizPartialNoticeText.textContent = `${t('errors.partialGenerate', { count: generated.length, total })}${getLocale() === 'ja' ? '' : ' '}${startingNote}`;
      els.quizPartialNotice.classList.remove('hidden');
    } else if (els.quizPartialNotice) {
      els.quizPartialNotice.classList.add('hidden');
    }

    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification(
        getLocale() === 'ja' ? '問題の準備ができました！' : 'Questions are ready!',
        { body: getLocale() === 'ja' ? `${generated.length}問のクイズを開始できます` : `${generated.length} quiz questions ready to start`, icon: 'assets/og/favicon.ico' }
      );
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') new Notification(
          getLocale() === 'ja' ? '問題の準備ができました！' : 'Questions are ready!',
          { body: getLocale() === 'ja' ? `${generated.length}問のクイズを開始できます` : `${generated.length} quiz questions ready to start`, icon: 'assets/og/favicon.ico' }
        );
      });
    }

    // Start timer
    if (session.timeLimitSec > 0) {
      startQuizTimer(session.timeLimitSec);
    }

    // Show first question
    session.startedAt = Date.now();
    renderInteractiveQuiz({ els, quiz: session.questions[0] });
    updateQuizProgress();

    // Show combo bar and question/choices areas
    const comboBar = els.quizArea?.querySelector('#quizComboBar');
    if (comboBar) comboBar.classList.remove('hidden');
    if (els.quizQuestion) els.quizQuestion.classList.remove('hidden');
    if (els.quizChoices) els.quizChoices.classList.remove('hidden');
  }

  // --- Background Batch (Gemini 3 mock) ---
  function setBatchToastState(state, message) {
    if (!els.batchProgressToast) return;
    els.batchProgressToast.classList.remove('hidden');
    if (els.batchProgressStatus && message) els.batchProgressStatus.textContent = message;

    if (state === 'ready') {
      if (els.batchProgressTitle) els.batchProgressTitle.textContent = getLocale() === 'ja' ? '本番模擬試験の準備ができました' : t('batch.ready');
      if (els.batchProgressIcon) {
        els.batchProgressIcon.className =
          'w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0';
        els.batchProgressIcon.innerHTML = '<i class="fas fa-check"></i>';
      }
      if (els.batchProgressNote) els.batchProgressNote.classList.add('hidden');
      if (els.batchProgressStartBtn) els.batchProgressStartBtn.classList.remove('hidden');
    } else if (state === 'error') {
      if (els.batchProgressTitle) els.batchProgressTitle.textContent = getLocale() === 'ja' ? '生成に失敗しました' : t('batch.failed');
      if (els.batchProgressIcon) {
        els.batchProgressIcon.className =
          'w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0';
        els.batchProgressIcon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
      }
      if (els.batchProgressNote) els.batchProgressNote.classList.add('hidden');
      if (els.batchProgressStartBtn) els.batchProgressStartBtn.classList.add('hidden');
    } else {
      // running
      if (els.batchProgressTitle) els.batchProgressTitle.textContent = getLocale() === 'ja' ? '本番模擬試験を生成中' : t('batch.generating');
      if (els.batchProgressIcon) {
        els.batchProgressIcon.className =
          'w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0';
        els.batchProgressIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      }
      if (els.batchProgressNote) els.batchProgressNote.classList.remove('hidden');
      if (els.batchProgressStartBtn) els.batchProgressStartBtn.classList.add('hidden');
    }
  }

  function hideBatchToast() {
    els.batchProgressToast?.classList?.add('hidden');
  }

  function notifyBrowser(title, body) {
    try {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: 'assets/og/favicon.ico' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((p) => {
          if (p === 'granted') new Notification(title, { body, icon: 'assets/og/favicon.ico' });
        });
      }
    } catch { /* ignore */ }
  }

  async function startMockBatchInBackground({ els, session, request, config }) {
    const exam = getExamById(request.examId);
    const total = session.questionCount;

    // Pre-request notification permission so the completion notice can fire
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch { /* ignore */ }

    setBatchToastState('running', getLocale() === 'ja' ? `バッチAPIにリクエスト中… (0 / ${total} 問)` : `${t('batch.requesting')} (0 / ${total})`);
    batchInProgress = true;
    pendingBatchSession = null;
    pendingBatchRequest = null;

    const systemPrompt = buildMockQuizSystemPrompt(
      exam.code, exam.shortLabel, getExamLevel(request.examId)
    );
    const domainTargets = request.isDashboardQuiz
      ? assignDomainTargets(exam.domains, total)
      : [];

    const batchRequests = [];
    for (let i = 0; i < total; i++) {
      const targetDomain = domainTargets[i] || null;
      const userPrompt = request.isDashboardQuiz
        ? buildGeneralQuizUserPrompt(exam.code, targetDomain)
        : buildQuizUserPrompt(request.taskTitle, request.taskContext);
      batchRequests.push({ userPrompt, systemPrompt });
    }

    const stateLabelOf = (s) => {
      const isJa = getLocale() === 'ja';
      switch (s) {
        case 'JOB_STATE_PENDING':
        case 'BATCH_STATE_PENDING':
          return isJa ? '待機中' : t('batch.stateWaiting');
        case 'JOB_STATE_RUNNING':
        case 'BATCH_STATE_RUNNING':
          return isJa ? '生成中' : t('batch.stateGenerating');
        case 'JOB_STATE_SUCCEEDED':
        case 'BATCH_STATE_SUCCEEDED':
          return isJa ? '完了' : t('batch.stateComplete');
        default:
          return s || (isJa ? '実行中' : 'Running');
      }
    };

    let result = null;
    try {
      result = await callAiBatch({
        requests: batchRequests,
        displayName: `mock-${request.examId}-${Date.now()}`,
        onRequireApiKey: () => openSettingsModal(els),
        onProgress: ({ state, done, total: t, failed }) => {
          const denom = t || total;
          setBatchToastState(
            'running',
            getLocale() === 'ja'
              ? `${stateLabelOf(state)}… ${done} / ${denom} 問` + (failed ? `（失敗 ${failed}）` : '')
              : `${stateLabelOf(state)}… ${done} / ${denom}` + (failed ? ` (failed: ${failed})` : '')
          );
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[batch] failed:', err);
      batchInProgress = false;

      // Detect "Batch API not available for this API key" (typical for free-tier keys).
      const msg = String(err?.message || '');
      const isPreconditionFail = /precondition check failed/i.test(msg)
        || /FAILED_PRECONDITION/i.test(msg)
        || err?.status === 400 && /batch/i.test(msg);

      if (isPreconditionFail) {
        // Persist this finding so we don't bother the user with the Batch confirm next time.
        markAiBatchUnavailable();
        // Hide the batch toast and fall back to the regular blocking pre-gen flow,
        // which already shows its own progress modal.
        hideBatchToast();
        try {
          quizSession = session;
          quizSession.startedAt = Date.now();
          await preGenerateQuestions({ els, session: quizSession, request, config });
        } catch (e2) {
          // eslint-disable-next-line no-console
          console.error('[batch->fallback] also failed:', e2);
          setBatchToastState('error', `通常モードでの生成も失敗しました: ${e2?.message || '不明なエラー'}`);
        }
        return;
      }

      setBatchToastState(
        'error',
        `バッチAPIでの生成に失敗しました: ${msg || '不明なエラー'}`
      );
      notifyBrowser('生成に失敗しました', '本番模擬試験のバッチ生成でエラーが発生しました');
      return;
    }

    batchInProgress = false;

    if (!result || !Array.isArray(result.texts)) {
      setBatchToastState('error', 'バッチAPIから結果を取得できませんでした');
      return;
    }

    // Parse results
    const generated = [];
    for (let i = 0; i < result.texts.length; i++) {
      const text = result.texts[i];
      if (!text) continue;
      const parsed = parseQuizResponse(text);
      if (parsed) {
        parsed.domainId = domainTargets[i]?.id ?? null;
        generated.push(parsed);
      }
    }
    if (generated.length === 0) {
      setBatchToastState('error', '生成された問題を解析できませんでした');
      notifyBrowser('生成に失敗しました', '本番模擬試験のレスポンスを解析できませんでした');
      return;
    }

    session.questions = generated;
    session.questionCount = generated.length;
    pendingBatchSession = session;
    pendingBatchRequest = request;

    const requested = result.texts.length;
    const isPartial = generated.length < requested;
    const modelLabel = result.model || 'gemini-3';
    const isJa = getLocale() === 'ja';
    const modelSuffix = isJa ? `（モデル: ${modelLabel}）` : ` (model: ${modelLabel})`;
    const readyMessage = isPartial
      ? `${t('errors.partialGenerate', { count: generated.length, total: requested })}${modelSuffix}`
      : (isJa
        ? `${generated.length} 問の準備が完了しました${modelSuffix}`
        : `${generated.length} questions ready${modelSuffix}`);
    setBatchToastState('ready', readyMessage);
    notifyBrowser(
      isJa ? '問題の準備ができました！' : 'Questions are ready!',
      isPartial
        ? (isJa
          ? `${requested}問中${generated.length}問のクイズを開始できます`
          : `${generated.length} of ${requested} quiz questions ready to start`)
        : (isJa
          ? `${generated.length} 問のクイズを開始できます`
          : `${generated.length} quiz questions ready to start`)
    );
  }

  function startReadyMockSession() {
    if (!pendingBatchSession || !pendingBatchRequest) return;

    const session = pendingBatchSession;
    const request = pendingBatchRequest;
    pendingBatchSession = null;
    pendingBatchRequest = null;

    quizSession = session;
    lastAiRequest = request;

    const exam = getExamById(request.examId);
    const config = QUIZ_MODE_CONFIG[session.mode] || QUIZ_MODE_CONFIG.mock;

    // Open the AI modal and prepare the quiz UI (mirrors preGenerateQuestions tail).
    showAiModal(els, `${localizedModeLabel(config)}: ${request.taskTitle}`, true);
    if (els.modalContent) els.modalContent.innerHTML = '';
    if (els.modalLoading) els.modalLoading.classList.add('hidden');
    resetQuizUi(els);
    if (els.quizArea) els.quizArea.classList.remove('hidden');
    if (els.quizPregenOverlay) els.quizPregenOverlay.classList.add('hidden');

    if (session.timeLimitSec > 0) {
      startQuizTimer(session.timeLimitSec);
    }

    session.startedAt = Date.now();
    renderInteractiveQuiz({ els, quiz: session.questions[0] });
    updateQuizProgress();

    const comboBar = els.quizArea?.querySelector('#quizComboBar');
    if (comboBar) comboBar.classList.remove('hidden');
    if (els.quizQuestion) els.quizQuestion.classList.remove('hidden');
    if (els.quizChoices) els.quizChoices.classList.remove('hidden');

    hideBatchToast();
  }

  // Wire toast buttons
  els.batchProgressStartBtn?.addEventListener('click', () => {
    startReadyMockSession();
  });
  els.batchProgressCloseBtn?.addEventListener('click', () => {
    if (batchInProgress) {
      const ok = window.confirm(
        'バッチ生成中です。閉じても生成は続行されますが、通知トーストは非表示になります。\n本当に閉じますか？'
      );
      if (!ok) return;
    }
    hideBatchToast();
  });

  // Warn before closing the tab while batch is in progress
  window.addEventListener('beforeunload', (e) => {
    if (!batchInProgress) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });

  // Clean up timer when AI modal is closed
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-close-modal="aiModal"]');
    if (!btn) return;
    stopQuizTimer();
    quizTimerExpired = false;
    quizSession = null;
  });

  // Explanation review toggle in quiz summary
  els.quizSumExplanationsToggle?.addEventListener('click', () => {
    const list = els.quizSumExplanationsList;
    const arrow = els.quizSumExplanationsArrow;
    if (!list) return;
    const isHidden = list.classList.contains('hidden');
    list.classList.toggle('hidden', !isHidden);
    if (arrow) arrow.style.transform = isHidden ? 'rotate(180deg)' : '';
  });

  // Quiz: choice button click (event delegation on quizChoices)
  els.quizChoices?.addEventListener('click', (e) => {
    const btn = e.target.closest('.quiz-choice-btn');
    if (!btn || btn.disabled) return;
    const answerIndex = parseInt(btn.dataset.choiceIndex, 10);
    if (Number.isNaN(answerIndex)) return;
    handleQuizAnswer({ els, answerIndex, exam: getExamById(state.examId), state });
  });

  function handleQuizAnswer({ els, answerIndex, exam, state: appState }) {
    const quiz = getCurrentParsedQuiz();
    if (!quiz) return;
    const isCorrect = answerIndex === quiz.correctIndex;

    // Track in session
    if (!quizSession) {
      quizSession = createQuizSession({ examId: appState.examId });
      quizSession.sessionId = 'qs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    }
    quizSession.questions[quizSession.currentIndex] = quiz;
    const result = recordAnswer(quizSession, answerIndex, XP_RULES.quiz);

    // Pause timer during explanation display
    if (quizSession.timeLimitSec > 0 && !quizTimerExpired) {
      pauseQuizTimer();
    }

    // Disable all choice buttons
    const btns = els.quizChoices.querySelectorAll('.quiz-choice-btn');
    btns.forEach((btn) => {
      btn.disabled = true;
      const idx = parseInt(btn.dataset.choiceIndex, 10);
      if (idx === answerIndex) {
        // Mark the choice the user actually picked, regardless of correctness,
        // so it stays clearly visible against the correct/incorrect backgrounds
        // (dark mode contrast, see issue #122).
        btn.classList.add('quiz-choice-selected');
      }
      if (idx === quiz.correctIndex) {
        btn.classList.add('quiz-choice-correct');
      }
      if (idx === answerIndex && !isCorrect) {
        btn.classList.add('quiz-choice-incorrect');
        btn.classList.add('quiz-anim-incorrect');
      }
      if (idx === answerIndex && isCorrect) {
        btn.classList.add('quiz-anim-correct');
      }
    });

    // Update combo display
    if (result.combo >= 3) {
      els.quizComboDisplay?.classList.remove('hidden');
      if (els.quizComboCount) els.quizComboCount.textContent = String(result.combo);
      if (els.quizComboMultiplier) els.quizComboMultiplier.textContent = `×${result.multiplier}`;
    }

    // Show result banner
    els.quizResult?.classList.remove('hidden');
    if (els.quizResultBanner) {
      els.quizResultBanner.className = isCorrect
        ? 'rounded-lg p-4 mb-3 bg-green-50 border border-green-200'
        : 'rounded-lg p-4 mb-3 bg-red-50 border border-red-200';
    }
    if (els.quizResultIcon) els.quizResultIcon.textContent = isCorrect ? '✅' : '❌';
    if (els.quizResultText) {
      els.quizResultText.textContent = isCorrect
        ? t('quiz.correctFeedback', { combo: getComboLabel(result.combo) })
        : t('quiz.incorrectFeedback', { letter: indexToLetter(quiz.correctIndex) });
      els.quizResultText.className = isCorrect
        ? 'font-bold text-sm text-green-800'
        : 'font-bold text-sm text-red-800';
    }
    if (els.quizResultXp) {
      els.quizResultXp.textContent = `+${result.xpEarned} XP`;
      els.quizResultXp.className = 'ml-auto text-xs font-mono font-bold ' + (isCorrect ? 'text-green-700' : 'text-red-600');
    }

    // Show explanation
    if (els.quizExplanation && quiz.explanation) {
      const { html, usedMarkdown } = renderMarkdownToSafeHtml(quiz.explanation);
      if (usedMarkdown) {
        els.quizExplanation.innerHTML = html;
        // Harden links (mirror updateAiModalContent): open safely in a new tab.
        els.quizExplanation.querySelectorAll('a').forEach((a) => {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        });
      } else {
        els.quizExplanation.textContent = quiz.explanation;
      }
      // Surface AWS official documentation citations as a distinct "Sources"
      // block so they are not buried in the explanation prose (issue #109).
      renderQuizSources(els.quizExplanation, quiz.explanation);
    }

    // Award XP. The Daily Challenge (issue #34) is deterministic, free, and
    // replayable, so its base `quiz` XP is gated to at most once per local day
    // (mirroring the FEEDBACK_XP_DAY_KEY guard). Normal AI quizzes are never
    // affected — each session is unique and API-gated. Play stays unlimited;
    // only the XP award is capped.
    let awardDailyXp = true;
    if (quizSession?._isDailyChallenge) {
      const today = feedbackLocalDayString();
      let lastAwardedDay = '';
      try {
        lastAwardedDay = localStorage.getItem(DAILY_CHALLENGE_XP_DAY_KEY) || '';
      } catch {
        lastAwardedDay = '';
      }
      // Allow every question of the FIRST session to run each day to award XP,
      // but block XP once a different day-stamped session has already claimed
      // today. The session that first claims today keeps awarding for all its
      // questions; any later replay on the same day awards nothing.
      if (lastAwardedDay === today && dailyXpAwardedSessionId !== quizSession.sessionId) {
        awardDailyXp = false;
      } else if (lastAwardedDay !== today) {
        dailyXpAwardedSessionId = quizSession.sessionId;
        try {
          localStorage.setItem(DAILY_CHALLENGE_XP_DAY_KEY, today);
        } catch {
          // ignore storage write failures — still award XP this session
        }
      }
    }
    if (awardDailyXp) {
      const xpResult = addXp({ amount: result.xpEarned, reason: 'quiz' });
      if (xpResult?.unlocked?.length) {
        showMilestoneToast({ els, unlocked: xpResult.unlocked });
      }
    }

    // Store quiz result
    const elapsedMs = window.__questionShownAt ? Date.now() - window.__questionShownAt : null;
    window.__questionShownAt = 0;
    // Determine domainId: from pre-generated question, or from current domain tab
    const quizDomainId = quiz.domainId
      ?? (typeof appState.currentDomainId === 'number' ? appState.currentDomainId : null);
    // Tag results to a real exam id. For the Daily Challenge the session already
    // resolved a real exam id (falling back to clf-c02 for pseudo-modes like
    // '__beginner__'), so prefer it over the possibly-pseudo appState.examId.
    const resultExamId = (quizSession?._isDailyChallenge || quizSession?._isOfflineExam) && quizSession.examId
      ? quizSession.examId
      : appState.examId;
    addQuizResult({
      examId: resultExamId,
      domainId: quizDomainId,
      taskId: lastAiRequest?.taskId || '',
      isCorrect,
      xpEarned: result.xpEarned,
      answeredAt: new Date().toISOString(),
      question: quiz.question,
      choices: quiz.choices,
      correctIndex: quiz.correctIndex,
      explanation: quiz.explanation,
      userAnswer: answerIndex,
      sessionId: quizSession?.sessionId || '',
      mode: quizSession?.mode || '',
      elapsedMs,
    });

    renderXpDashboard({ els, exam, state: appState });
    renderLearningStatus({ els, exam, state: appState });

    // Once the user has answered enough questions, surface the gentle feedback
    // nudge (issue #100). Shown at most once (storage-guarded).
    maybeShowFeedbackNudge({ els });

    // Advance session index for next question
    quizSession.currentIndex += 1;
    setCurrentParsedQuiz(null);

    // Update progress bar
    if (quizSession.questionCount > 1) {
      if (els.quizProgressFill) {
        els.quizProgressFill.style.width = `${(quizSession.currentIndex / quizSession.questionCount) * 100}%`;
      }
      if (els.quizSessionProgress) {
        const remaining = quizSession.questionCount - quizSession.currentIndex;
        els.quizSessionProgress.textContent = remaining > 0
          ? `${quizSession.currentIndex} / ${quizSession.questionCount}`
          : `${quizSession.questionCount} / ${quizSession.questionCount}`;
      }
    }

    // Determine next action
    const sessionDone = isSessionComplete(quizSession);

    if (sessionDone) {
      // Session complete — show summary after brief delay
      quizSession.finishedAt = Date.now();
      stopQuizTimer();
      if (els.quizNextBtn) {
        els.quizNextBtn.innerHTML = '<i class="fas fa-chart-bar"></i> 結果を見る';
        els.quizNextBtn.classList.remove('hidden');
      }
      if (els.aiRetryBtn) els.aiRetryBtn.classList.add('hidden');
    } else if (quizSession.preGenerate) {
      // Pre-generated mode (speed/mock): show "次の問題" button
      if (els.quizNextBtn) {
        els.quizNextBtn.innerHTML = '<i class="fas fa-arrow-right"></i> 次の問題';
        els.quizNextBtn.classList.remove('hidden');
      }
      if (els.aiRetryBtn) els.aiRetryBtn.classList.add('hidden');
    } else {
      // Sequential mode (single/quick5): show "次の問題" button
      if (els.quizNextBtn) {
        els.quizNextBtn.innerHTML = quizSession.mode === 'single'
          ? '<i class="fas fa-redo"></i> もう1問'
          : '<i class="fas fa-arrow-right"></i> 次の問題';
        els.quizNextBtn.classList.remove('hidden');
      }
      if (els.aiRetryBtn) els.aiRetryBtn.classList.add('hidden');
    }
  }

  els.aiVoteGoodBtn?.addEventListener('click', () => {
    voteAi('good');
    reflectAiVoteUi();
  });

  els.aiVoteBadBtn?.addEventListener('click', () => {
    voteAi('bad');
    reflectAiVoteUi();
  });

  els.aiCopyBtn?.addEventListener('click', async () => {
    const text = getAiCopyText(els);
    if (!text) return;

    const ok = await copyTextToClipboard(text);
    if (ok) {
      flashAiCopyButton(els, t('common.copied'));
    } else {
      flashAiCopyButton(els, t('common.copyFailed'));
    }
  });

  const state = {
    examId: defaultExamId,
    currentDomainId: null,
  };

  wireGlobalUiHandlers({ els, state });

  // Apply theme on boot
  applyTheme();
  wireThemeSwitch(els);
  reflectThemeToggleIcon(els);

  wireProfileHandlers({ els, state, getExamById });
  wireToastHandlers({ els });

  // Initialize chat widget
  initChat({
    els,
    getExamById,
    getState: () => state,
    openSettingsModal: () => openSettingsModal(els),
  });

  // ── Exam Sidebar ──
  renderExamSidebar({ els, exams, state, onSelect: (id) => setExam(id) });

  // Sidebar toggle (mobile)
  els.sidebarToggleBtn?.addEventListener('click', () => {
    els.examSidebar?.classList.add('open');
    els.sidebarBackdrop?.classList.remove('hidden');
  });
  const closeSidebar = () => {
    els.examSidebar?.classList.remove('open');
    els.sidebarBackdrop?.classList.add('hidden');
  };
  els.sidebarCloseBtn?.addEventListener('click', closeSidebar);
  els.sidebarBackdrop?.addEventListener('click', closeSidebar);

  // ── Settings Modal: Language & Theme Switches ──
  wireSettingsModalSwitches({ els });

  // ── Settings Modal: opt-in local study reminder ──
  wireStudyReminder(els);

  // 初期表示
  setExam(defaultExamId);

  // Boot marker for non-JS/module failure detection
  window.__APP_READY__ = true;

  // Re-render dashboard when locale changes
  onLocaleChange(() => {
    translateStaticElements();

    // Special: if on beginner guide, just re-render that
    if (state.examId === '__beginner__') {
      renderExamSidebar({ els, exams, state, onSelect: (id) => setExam(id) });
      // Re-apply beginner title in new locale
      if (els.siteTitle) els.siteTitle.textContent = getLocale() === 'ja' ? '初めてAWS認定を受験する' : 'First-time AWS Certification';
      if (els.siteSubtitle) els.siteSubtitle.textContent = getLocale() === 'ja' ? 'AWS認定試験の基本情報と共通の学習リソース' : 'Basic information and common learning resources for AWS certifications';
      renderContent({ els, exam: { domains: [], steps: [] }, state });
      return;
    }

    const exam = getExamById(state.examId);
    renderExamMeta({ els, exam });
    renderExamSidebar({ els, exams, state, onSelect: (id) => setExam(id) });
    renderXpDashboard({ els, exam, state });
    renderLearningStatus({ els, exam, state });
    renderDailyHighlight({ els, exam, state });
    renderChart({ els, exam, onDomainSelect: (domainId) => switchDomain(domainId) });
    renderTabs({ els, exam, state, onDomainSelect: (domainId) => switchDomain(domainId) });
    renderContent({ els, exam, state });
  });

  function setExam(examId) {
    // Special: Beginner guide (not a real exam)
    if (examId === '__beginner__') {
      state.examId = '__beginner__';
      state.currentDomainId = null;

      // Update URL hash
      const newHash = '#beginner';
      if (location.hash !== newHash) {
        history.replaceState(null, '', newHash);
      }

      // Update header
      if (els.siteTitle) els.siteTitle.textContent = getLocale() === 'ja' ? '初めてAWS認定を受験する' : 'First-time AWS Certification';
      if (els.siteSubtitle) els.siteSubtitle.textContent = getLocale() === 'ja' ? 'AWS認定試験の基本情報と共通の学習リソース' : 'Basic information and common learning resources for AWS certifications';

      // Hide left aside (chart), learning status, XP dashboard, domain tabs
      const chartAside = els.examWeightChart?.closest('aside');
      if (chartAside) chartAside.classList.add('hidden');
      if (els.learningStatusPanel) els.learningStatusPanel.classList.add('hidden');
      if (els.xpDashboard) els.xpDashboard.classList.add('hidden');
      if (els.domainTabs) els.domainTabs.innerHTML = '';

      renderContent({ els, exam: { domains: [], steps: [] }, state });

      // Update sidebar active state
      updateSidebarActiveState({ els, examId });
      return;
    }

    const exam = getExamById(examId);

    state.examId = examId;
    const hasExamSteps = Array.isArray(exam.steps) && exam.steps.length > 0;
    state.currentDomainId = hasExamSteps ? 'all' : (exam.domains?.[0]?.id ?? null);

    // Update URL hash (without triggering hashchange re-entry)
    const hashCode = EXAM_ID_TO_HASH[examId] || examId;
    const newHash = '#' + hashCode;
    if (location.hash !== newHash) {
      history.replaceState(null, '', newHash);
    }

    // Restore chart visibility if hidden by beginner guide
    const chartAside = els.examWeightChart?.closest('aside');
    if (chartAside) chartAside.classList.remove('hidden');
    if (els.learningStatusPanel) els.learningStatusPanel.classList.remove('hidden');
    if (els.xpDashboard) els.xpDashboard.classList.remove('hidden');

    renderExamMeta({ els, exam });
    renderExamSwitcher({ els, exams, state, onSelect: setExam });
    renderChart({ els, exam, onDomainSelect: (domainId) => switchDomain(domainId) });
    renderXpDashboard({ els, exam, state });
    renderLearningStatus({ els, exam, state });
    renderTabs({ els, exam, state, onDomainSelect: (domainId) => switchDomain(domainId) });
    renderContent({ els, exam, state });

    // Reset chat on exam change & update badge
    resetChat();
    if (els.chatExamBadge) els.chatExamBadge.textContent = exam?.code || '';

    // Update sidebar active state
    updateSidebarActiveState({ els, examId });
  }

  function switchDomain(domainId) {
    state.currentDomainId = domainId;

    const exam = getExamById(state.examId);
    renderTabs({ els, exam, state, onDomainSelect: (id) => switchDomain(id) });
    renderContent({ els, exam, state });
  }

  // First visit: require username
  enforceUserNameIfNeeded({ els });

  // AI vote buttons are enabled only when an AI result exists
  reflectAiVoteUi();

  // Gentle feedback nudge (issue #100): only appears for returning users who
  // have already answered enough questions, and only once (see storage guard).
  maybeShowFeedbackNudge({ els });

  // Content actions (event delegation)
  els.contentArea.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const exam = getExamById(state.examId);
    const taskContext = btn.dataset.taskContext || '';
    const examId = state.examId;

    if (action === 'vote') {
      const value = String(btn.dataset.vote || '').trim();
      const targetType = String(btn.dataset.voteTargetType || '').trim();
      const targetId = String(btn.dataset.voteTargetId || '').trim();
      if (!targetType || !targetId) return;

      const meta = {
        exam_id: String(btn.dataset.examId || state.examId || ''),
        domain_id: String(btn.dataset.domainId || ''),
        task_id: String(btn.dataset.taskId || ''),
        task_title: String(btn.dataset.taskTitle || ''),
        resource_section: String(btn.dataset.resourceSection || ''),
        resource_title: String(btn.dataset.resourceTitle || ''),
        resource_url: String(btn.dataset.resourceUrl || ''),
      };

      const before = getExistingVote({ targetType, targetId });
      if (before === value) {
        clearVote({ targetType, targetId, meta });
      } else {
        submitVote({ targetType, targetId, value, meta });
      }

      // reflect immediately (no reload)
      const group = btn.closest('[data-vote-group]');
      const existing = getExistingVote({ targetType, targetId });
      if (group) {
        applyVoteGroupStyles(group, existing);
      } else {
        setVoteButtonState(btn, { selected: String(btn.dataset.vote || '') === existing, disabled: false });
      }
      return;
    }

    if (action === 'quiz') {
      lastAiRequest = { type: 'quiz', examId, taskId: btn.dataset.taskId || '', taskTitle: btn.dataset.taskTitle || '', taskContext };
      reflectAiVoteUi();
      // Task-level quiz: direct single-question generation (no mode modal)
      quizSession = createQuizSession({ examId, mode: 'single' });
      quizSession.startedAt = Date.now();
      await runAiRequest(lastAiRequest);
      return;
    }

    if (action === 'explain') {
      lastAiRequest = { type: 'explain', examId, term: btn.dataset.term || '', taskContext };
      reflectAiVoteUi();
      await runAiRequest(lastAiRequest);
      return;
    }
  });

  wireXpLinkHandlers({ els, state, getExamById });

  // Return public API for external callers (e.g. hashchange routing)
  return { setExam };
}

function renderExamSidebar({ els, exams, state, onSelect }) {
  const container = els.examSidebarContent;
  if (!container) return;

  const locale = getLocale();
  container.innerHTML = '';

  // Special: Beginner guide item
  const beginnerItem = document.createElement('div');
  beginnerItem.className = 'exam-sidebar-item beginner-guide-item' + (state.examId === '__beginner__' ? ' active' : '');
  beginnerItem.dataset.examId = '__beginner__';
  beginnerItem.innerHTML = `<i class="fas fa-hand-holding-heart text-pink-500 text-sm"></i><span class="truncate">${t('sidebar.beginnerGuide')}</span>`;
  beginnerItem.addEventListener('click', () => {
    onSelect('__beginner__');
    els.examSidebar?.classList.remove('open');
    els.sidebarBackdrop?.classList.add('hidden');
  });
  container.appendChild(beginnerItem);

  // Separator
  const sep = document.createElement('hr');
  sep.className = 'my-3 border-gray-200';
  container.appendChild(sep);

  for (const category of EXAM_CATEGORIES) {
    const categoryExams = category.examIds
      .map(id => exams.find(e => e.id === id))
      .filter(Boolean);
    if (categoryExams.length === 0) continue;

    const section = document.createElement('div');
    section.className = 'exam-sidebar-category';

    const label = document.createElement('div');
    label.className = 'exam-sidebar-category-label';
    label.innerHTML = `<i class="${category.icon} text-xs"></i> ${locale === 'ja' ? category.labelJa : category.labelEn}`;
    section.appendChild(label);

    for (const exam of categoryExams) {
      const item = document.createElement('div');
      item.className = 'exam-sidebar-item' + (exam.id === state.examId ? ' active' : '');
      item.dataset.examId = exam.id;
      item.innerHTML = `<span class="exam-code">${exam.code}</span><span class="truncate">${exam.shortLabel}</span>`;
      item.addEventListener('click', () => {
        onSelect(exam.id);
        // Close sidebar
        els.examSidebar?.classList.remove('open');
        els.sidebarBackdrop?.classList.add('hidden');
      });
      section.appendChild(item);
    }

    container.appendChild(section);
  }
}

function updateSidebarActiveState({ els, examId }) {
  const container = els.examSidebarContent;
  if (!container) return;
  container.querySelectorAll('.exam-sidebar-item').forEach(item => {
    item.classList.toggle('active', item.dataset.examId === examId);
  });
}

function wireSettingsModalSwitches({ els }) {
  // Language switch
  if (els.langSwitch) {
    const updateLangBtns = () => {
      const current = getLocale();
      els.langSwitch.querySelectorAll('button[data-lang]').forEach(btn => {
        btn.classList.toggle('settings-switch-btn', true);
        btn.classList.toggle('active', btn.dataset.lang === current);
      });
    };
    updateLangBtns();
    els.langSwitch.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-lang]');
      if (!btn) return;
      const lang = btn.dataset.lang;
      if (lang && lang !== getLocale()) {
        setLocale(lang);
      }
      updateLangBtns();
    });
    // Listen for locale changes from other sources
    onLocaleChange(() => updateLangBtns());
  }

  // Theme switch
  if (els.themeSwitch) {
    const updateThemeBtns = () => {
      const current = getTheme() || 'system';
      els.themeSwitch.querySelectorAll('button[data-theme]').forEach(btn => {
        btn.classList.toggle('settings-switch-btn', true);
        btn.classList.toggle('active', btn.dataset.theme === current);
      });
    };
    updateThemeBtns();
    els.themeSwitch.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-theme]');
      if (!btn) return;
      const theme = btn.dataset.theme;
      if (!theme) return;
      setTheme(theme);
      applyTheme();
      updateThemeBtns();
    });
  }
}

function wireXpLinkHandlers({ els, state, getExamById }) {
  const award = (href) => {
    const result = addXp({ amount: XP_RULES.link, reason: 'link', url: href });
    if (result?.unlocked?.length) {
      showMilestoneToast({ els, unlocked: result.unlocked });
    }
    renderXpDashboard({ els, exam: getExamById(state.examId), state });
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-xp-link]');
    if (!a || !a.getAttribute('href')) return;
    award(a.href);
  });

  document.addEventListener('auxclick', (e) => {
    const a = e.target.closest('a[data-xp-link]');
    if (!a || !a.getAttribute('href')) return;
    award(a.href);
  });
}

function getElements() {
  return {
    siteTitle: document.getElementById('siteTitle'),
    siteSubtitle: document.getElementById('siteSubtitle'),
    examCodeBadge: document.getElementById('examCodeBadge'),
    examSwitcher: document.getElementById('examSwitcher'),
    examMenuBtn: document.getElementById('examMenuBtn'),
    examMenu: document.getElementById('examMenu'),
    examWeightChart: document.getElementById('examWeightChart'),
    domainLegend: document.getElementById('domainLegend'),
    domainTabs: document.getElementById('domainTabs'),
    contentArea: document.getElementById('contentArea'),

    // XP Dashboard
    xpDashboard: document.getElementById('xpDashboard'),

    // Learning Status Panel
    learningStatusPanel: document.getElementById('learningStatusPanel'),
    statusExamBadge: document.getElementById('statusExamBadge'),
    statusProgress: document.getElementById('statusProgress'),
    statusAccuracy: document.getElementById('statusAccuracy'),
    statusProgressBar: document.getElementById('statusProgressBar'),
    nextActionPanel: document.getElementById('nextActionPanel'),
    nextActionText: document.getElementById('nextActionText'),
    mainStudyCtaBtn: document.getElementById('mainStudyCtaBtn'),
    mainStudyCtaLabel: document.getElementById('mainStudyCtaLabel'),

    xpUserLine: document.getElementById('xpUserLine'),
    xpTotal: document.getElementById('xpTotal'),
    xpRecentActions: document.getElementById('xpRecentActions'),
    xpWeek: document.getElementById('xpWeek'),
    xpTitleBadge: document.getElementById('xpTitleBadge'),
    xpNextTitle: document.getElementById('xpNextTitle'),
    xpRemaining: document.getElementById('xpRemaining'),
    xpProgressBar: document.getElementById('xpProgressBar'),
    xpWalker: document.getElementById('xpWalker'),
    xpMotivation: document.getElementById('xpMotivation'),
    editUserNameBtn: document.getElementById('editUserNameBtn'),
    tweetBtn: document.getElementById('tweetBtn'),

    // modals
    aiModal: document.getElementById('aiModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalContent: document.getElementById('modalContent'),
    modalLoading: document.getElementById('modalLoading'),
    aiCopyBtn: document.getElementById('aiCopyBtn'),
    aiVoteGoodBtn: document.getElementById('aiVoteGoodBtn'),
    aiVoteBadBtn: document.getElementById('aiVoteBadBtn'),
    aiRetryBtn: document.getElementById('aiRetryBtn'),

    userModal: document.getElementById('userModal'),
    userModalCloseBtn: document.getElementById('userModalCloseBtn'),
    userNameInput: document.getElementById('userNameInput'),
    userNameSaveBtn: document.getElementById('userNameSaveBtn'),
    userMessage: document.getElementById('userMessage'),

    milestoneToast: document.getElementById('milestoneToast'),
    milestoneToastText: document.getElementById('milestoneToastText'),
    milestoneToastCloseBtn: document.getElementById('milestoneToastCloseBtn'),

    streakMilestoneToast: document.getElementById('streakMilestoneToast'),
    streakMilestoneToastText: document.getElementById('streakMilestoneToastText'),
    streakMilestoneToastCloseBtn: document.getElementById('streakMilestoneToastCloseBtn'),

    batchProgressToast: document.getElementById('batchProgressToast'),
    batchProgressIcon: document.getElementById('batchProgressIcon'),
    batchProgressTitle: document.getElementById('batchProgressTitle'),
    batchProgressStatus: document.getElementById('batchProgressStatus'),
    batchProgressNote: document.getElementById('batchProgressNote'),
    batchProgressStartBtn: document.getElementById('batchProgressStartBtn'),
    batchProgressCloseBtn: document.getElementById('batchProgressCloseBtn'),

    settingsModal: document.getElementById('settingsModal'),
    settingsBtn: document.getElementById('settingsBtn'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    settingsMessage: document.getElementById('settingsMessage'),
    apiKeySaveBtn: document.getElementById('apiKeySaveBtn'),
    apiKeyClearBtn: document.getElementById('apiKeyClearBtn'),
    resetLocalBtn: document.getElementById('resetLocalBtn'),

    // Feedback
    feedbackBtn: document.getElementById('feedbackBtn'),
    feedbackModal: document.getElementById('feedbackModal'),
    feedbackCategorySelect: document.getElementById('feedbackCategorySelect'),
    feedbackTextarea: document.getElementById('feedbackTextarea'),
    feedbackCharCount: document.getElementById('feedbackCharCount'),
    feedbackMessage: document.getElementById('feedbackMessage'),
    feedbackSubmitBtn: document.getElementById('feedbackSubmitBtn'),
    feedbackImageInput: document.getElementById('feedbackImageInput'),
    feedbackImageTrigger: document.getElementById('feedbackImageTrigger'),
    feedbackImagePreview: document.getElementById('feedbackImagePreview'),
    feedbackCopyBtn: document.getElementById('feedbackCopyBtn'),
    // Feedback nudge (issue #100)
    feedbackNudge: document.getElementById('feedbackNudge'),
    feedbackNudgeOpenBtn: document.getElementById('feedbackNudgeOpenBtn'),
    feedbackNudgeDismissBtn: document.getElementById('feedbackNudgeDismissBtn'),
    feedbackNudgeCloseBtn: document.getElementById('feedbackNudgeCloseBtn'),
    // OpenAI / Provider
    openaiKeyInput: document.getElementById('openaiKeyInput'),
    openaiKeyClearBtn: document.getElementById('openaiKeyClearBtn'),
    aiProviderSwitch: document.getElementById('aiProviderSwitch'),
    geminiKeySection: document.getElementById('geminiKeySection'),
    openaiKeySection: document.getElementById('openaiKeySection'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeToggleIcon: document.getElementById('themeToggleIcon'),

    // Exam Sidebar
    examSidebar: document.getElementById('examSidebar'),
    examSidebarContent: document.getElementById('examSidebarContent'),
    sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
    sidebarCloseBtn: document.getElementById('sidebarCloseBtn'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),

    // Settings modal: language & theme switches
    langSwitch: document.getElementById('langSwitch'),
    themeSwitch: document.getElementById('themeSwitch'),

    // Quiz interactive
    quizArea: document.getElementById('quizArea'),
    quizComboBar: document.getElementById('quizComboBar'),
    quizSessionProgress: document.getElementById('quizSessionProgress'),
    quizComboDisplay: document.getElementById('quizComboDisplay'),
    quizComboCount: document.getElementById('quizComboCount'),
    quizComboMultiplier: document.getElementById('quizComboMultiplier'),
    quizQuestion: document.getElementById('quizQuestion'),
    quizChoices: document.getElementById('quizChoices'),
    quizResult: document.getElementById('quizResult'),
    quizResultBanner: document.getElementById('quizResultBanner'),
    quizResultIcon: document.getElementById('quizResultIcon'),
    quizResultText: document.getElementById('quizResultText'),
    quizResultXp: document.getElementById('quizResultXp'),
    quizExplanation: document.getElementById('quizExplanation'),
    quizNextBtn: document.getElementById('quizNextBtn'),

    // Quiz mode modal
    quizModeModal: document.getElementById('quizModeModal'),
    quizModeCards: document.getElementById('quizModeCards'),
    quizModeStartBtn: document.getElementById('quizModeStartBtn'),
    quizModeTaskLabel: document.getElementById('quizModeTaskLabel'),

    // Quiz timer / progress / pregen / summary
    quizModeLabel: document.getElementById('quizModeLabel'),
    quizTimerDisplay: document.getElementById('quizTimerDisplay'),
    quizTimerValue: document.getElementById('quizTimerValue'),
    quizProgressBar: document.getElementById('quizProgressBar'),
    quizProgressFill: document.getElementById('quizProgressFill'),
    quizPregenOverlay: document.getElementById('quizPregenOverlay'),
    quizPregenStatus: document.getElementById('quizPregenStatus'),
    quizPregenFill: document.getElementById('quizPregenFill'),
    quizPartialNotice: document.getElementById('quizPartialNotice'),
    quizPartialNoticeText: document.getElementById('quizPartialNoticeText'),
    quizSummary: document.getElementById('quizSummary'),
    quizSummaryEmoji: document.getElementById('quizSummaryEmoji'),
    quizSummaryTitle: document.getElementById('quizSummaryTitle'),
    quizSummarySubtitle: document.getElementById('quizSummarySubtitle'),
    quizSumCorrect: document.getElementById('quizSumCorrect'),
    quizSumTotal: document.getElementById('quizSumTotal'),
    quizSumAccuracy: document.getElementById('quizSumAccuracy'),
    quizSumXp: document.getElementById('quizSumXp'),
    quizSumCombo: document.getElementById('quizSumCombo'),
    quizSumTime: document.getElementById('quizSumTime'),
    quizSumTimeValue: document.getElementById('quizSumTimeValue'),
    quizSumExplanations: document.getElementById('quizSumExplanations'),
    quizSumExplanationsToggle: document.getElementById('quizSumExplanationsToggle'),
    quizSumExplanationsArrow: document.getElementById('quizSumExplanationsArrow'),
    quizSumExplanationsList: document.getElementById('quizSumExplanationsList'),
    quizSumScheduleReview: document.getElementById('quizSumScheduleReview'),
    scheduleReviewBtn: document.getElementById('scheduleReviewBtn'),
    scheduleReviewMsg: document.getElementById('scheduleReviewMsg'),
    quizSumShareScore: document.getElementById('quizSumShareScore'),
    shareScoreBtn: document.getElementById('shareScoreBtn'),
    smartReviewCount: document.getElementById('smartReviewCount'),

    // Dashboard carousel
    dashboardCarousel: document.getElementById('dashboardCarousel'),
    carouselTrack: document.getElementById('carouselTrack'),
    carouselDots: document.getElementById('carouselDots'),
    carouselPrev: document.getElementById('carouselPrev'),
    carouselNext: document.getElementById('carouselNext'),
    dashboardQuizBtn: document.getElementById('dashboardQuizBtn'),
    dashboardReviewBtn: document.getElementById('dashboardReviewBtn'),
    dailyChallengeBtn: document.getElementById('dailyChallengeBtn'),
    offlineExamBtn: document.getElementById('offlineExamBtn'),

    // Quiz history review modal
    quizHistoryModal: document.getElementById('quizHistoryModal'),
    quizHistoryTabs: document.getElementById('quizHistoryTabs'),
    quizHistoryActions: document.getElementById('quizHistoryActions'),
    quizHistoryBreadcrumb: document.getElementById('quizHistoryBreadcrumb'),
    quizHistoryList: document.getElementById('quizHistoryList'),
    quizHistoryEmpty: document.getElementById('quizHistoryEmpty'),
    quizHistoryExportBtn: document.getElementById('quizHistoryExportBtn'),

    // Streak
    streakCount: document.getElementById('streakCount'),
    streakWeekDots: document.getElementById('streakWeekDots'),
    streakMessage: document.getElementById('streakMessage'),
    streakNudge: document.getElementById('streakNudge'),
    streakNudgeText: document.getElementById('streakNudgeText'),
    streakNudgeCloseBtn: document.getElementById('streakNudgeCloseBtn'),

    // Study reminder (opt-in local notification)
    studyReminderToggle: document.getElementById('studyReminderToggle'),
    studyReminderStatus: document.getElementById('studyReminderStatus'),

    // Daily Highlight (narrative)
    dailyHighlight: document.getElementById('dailyHighlight'),
    highlightEmoji: document.getElementById('highlightEmoji'),
    highlightText: document.getElementById('highlightText'),
    confettiCanvas: document.getElementById('confettiCanvas'),

    // Skill Radar Chart
    skillRadarChart: document.getElementById('skillRadarChart'),
    skillRadarChartContainer: document.getElementById('skillRadarChartContainer'),
    skillRadarEmpty: document.getElementById('skillRadarEmpty'),
    skillRadarLegend: document.getElementById('skillRadarLegend'),

    // Chat
    chatFab: document.getElementById('chatFab'),
    chatPanel: document.getElementById('chatPanel'),
    chatCloseBtn: document.getElementById('chatCloseBtn'),
    chatClearBtn: document.getElementById('chatClearBtn'),
    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    chatSendBtn: document.getElementById('chatSendBtn'),
    chatSuggestions: document.getElementById('chatSuggestions'),
    chatExamBadge: document.getElementById('chatExamBadge'),
  };
}

function getAiCopyText(els) {
  const fromDataset = els.modalContent?.dataset?.aiCopyText;
  if (fromDataset && String(fromDataset).trim()) return String(fromDataset);
  const fromText = els.modalContent?.textContent;
  if (fromText && String(fromText).trim()) return String(fromText);
  return '';
}

function setAiCopyButtonEnabled(els, enabled) {
  if (!els.aiCopyBtn) return;
  const isEnabled = Boolean(enabled);
  els.aiCopyBtn.disabled = !isEnabled;
  els.aiCopyBtn.classList.toggle('opacity-60', !isEnabled);
  els.aiCopyBtn.classList.toggle('cursor-not-allowed', !isEnabled);
}

function setAiCopyButtonLabel(els, label) {
  if (!els.aiCopyBtn) return;
  const span = els.aiCopyBtn.querySelector('[data-ai-copy-label]');
  if (span) {
    span.textContent = String(label ?? t('common.copy'));
  } else {
    els.aiCopyBtn.textContent = String(label ?? t('common.copy'));
  }
}

function clearAiCopyFlashTimer(els) {
  if (!els.aiCopyBtn) return;
  if (els.aiCopyBtn.__aiCopyTimer) {
    clearTimeout(els.aiCopyBtn.__aiCopyTimer);
  }
  els.aiCopyBtn.__aiCopyTimer = null;
}

function resetAiCopyButton(els) {
  clearAiCopyFlashTimer(els);
  setAiCopyButtonLabel(els, t('common.copy'));
  setAiCopyButtonEnabled(els, false);
}

function flashAiCopyButton(els, message, ms = 1400) {
  if (!els.aiCopyBtn) return;
  clearAiCopyFlashTimer(els);
  setAiCopyButtonLabel(els, message);
  els.aiCopyBtn.__aiCopyTimer = setTimeout(() => {
    setAiCopyButtonLabel(els, t('common.copy'));
    els.aiCopyBtn.__aiCopyTimer = null;
  }, ms);
}

async function copyTextToClipboard(text) {
  const t = String(text ?? '');
  if (!t) return false;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(t);
      return true;
    }
  } catch {
    // fall through to legacy copy
  }

  // Fallback for non-secure contexts / older browsers.
  try {
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.left = '-1000px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange?.(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return Boolean(ok);
  } catch {
    return false;
  }
}

function wireGlobalUiHandlers({ els }) {
  let pointerDownOnBackdrop = false;

  // Exam dropdown
  els.examMenuBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    // 1つしか試験がない等で無効化されている場合は何もしない
    if (els.examMenuBtn.disabled || els.examMenuBtn.getAttribute('aria-disabled') === 'true') {
      return;
    }
    toggleExamMenu(els);
  });

  // Settings
  els.settingsBtn.addEventListener('click', () => openSettingsModal(els));

  // Feedback
  wireFeedbackHandlers({ els });

  els.apiKeySaveBtn.addEventListener('click', () => {
    const provider = getAiProvider();
    if (provider === 'openai') {
      saveOpenAiApiKey({
        inputEl: els.openaiKeyInput,
        messageEl: els.settingsMessage,
        onSuccess: () => setTimeout(() => closeModal(els.settingsModal), 800),
      });
    } else {
      saveApiKeyFromInput({
        inputEl: els.apiKeyInput,
        messageEl: els.settingsMessage,
        onSuccess: () => setTimeout(() => closeModal(els.settingsModal), 800),
      });
    }
  });

  els.apiKeyClearBtn.addEventListener('click', () => {
    clearApiKey({ inputEl: els.apiKeyInput, messageEl: els.settingsMessage });
  });

  els.openaiKeyClearBtn?.addEventListener('click', () => {
    clearOpenAiApiKey({ inputEl: els.openaiKeyInput, messageEl: els.settingsMessage });
  });

  // AI Provider toggle
  wireAiProviderSwitch(els);

  els.resetLocalBtn?.addEventListener('click', () => {
    const ok = window.confirm(t('settings.resetConfirm'));
    if (!ok) return;
    resetAppStorage();
    closeModal(els.settingsModal);
    // Ensure UI + in-memory state is consistent
    window.location.reload();
  });

  // Close modal buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-close-modal]');
    if (!btn) return;
    const modalId = btn.getAttribute('data-close-modal');
    const modalEl = document.getElementById(modalId);
    if (!modalEl) return;
    if (modalEl.getAttribute('data-locked') === 'true') return;
    closeModal(modalEl);
  });

  // Close exam menu when clicking outside
  document.addEventListener('click', (e) => {
    const clickedInside = e.target.closest('#examMenu') || e.target.closest('#examMenuBtn');
    if (clickedInside) return;
    closeExamMenu(els);
  });

  // Click outside to close
  window.addEventListener('pointerdown', (event) => {
    const isBackdrop = Boolean(event.target?.classList?.contains?.('modal'));
    const canBackdropClose = event.target?.getAttribute?.('data-backdrop-close') === 'true';
    pointerDownOnBackdrop = isBackdrop && canBackdropClose;
  });

  window.addEventListener('click', (event) => {
    if (!event.target?.classList?.contains?.('modal')) return;
    if (!pointerDownOnBackdrop) return;
    if (event.target.getAttribute?.('data-backdrop-close') !== 'true') return;
    if (event.target.getAttribute?.('data-locked') === 'true') return;
    const selection = window.getSelection?.()?.toString?.() || '';
    if (selection) return;
    closeModal(event.target);
  });
}

function wireProfileHandlers({ els, state, getExamById }) {
  if (!els.userModal || !els.userNameInput || !els.userNameSaveBtn) return;

  const afterProfileSaved = () => {
    els.userModal.setAttribute('data-locked', 'false');
    closeModal(els.userModal);
    renderXpDashboard({ els, exam: getExamById(state.examId), state });
    smoothReturnToDashboard({ els });
  };

  const saveFromModal = () => {
    const name = String(els.userNameInput.value || '').trim();
    if (!name) {
      showInlineMessage(els.userMessage, t('userModal.validationEmpty'), 'text-red-600');
      return;
    }
    if (name.length > 30) {
      showInlineMessage(els.userMessage, t('userModal.validationLength'), 'text-red-600');
      return;
    }

    setUserName(name);
    els.userMessage?.classList?.add('hidden');
    afterProfileSaved();
  };

  els.editUserNameBtn?.addEventListener('click', () => {
    openUserModal({ els, locked: false });
  });

  els.userNameSaveBtn.addEventListener('click', () => saveFromModal());

  els.userNameInput.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key !== 'Enter') return;
    e.preventDefault();
    saveFromModal();
  });

  els.tweetBtn?.addEventListener('click', () => {
    const exam = getExamById(state.examId);
    const summary = getXpSummary();
    const name = getUserName() || '名無し';
    const text = buildTweetText({
      userName: name,
      examCode: exam.code,
      totalXp: summary.totalXp,
      weekXp: summary.weekXp,
      title: summary.title,
    });

    // SNS投稿はシンプルに「サイトURLのみ」を埋め込む（画像カード等は狙わない）
    const siteUrl = 'https://kenta-matsuda.github.io/Kenta-Matsuda.github.io-aws-study/';
    const intentUrl = buildTweetIntentUrl({ text, url: siteUrl });
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
  });
}

function wireToastHandlers({ els }) {
  els.milestoneToastCloseBtn?.addEventListener('click', () => hideMilestoneToast({ els }));
  els.streakMilestoneToastCloseBtn?.addEventListener('click', () => hideStreakMilestoneToast({ els }));

  // Feedback nudge (issue #100): opening the modal counts as "acted on"; the
  // close/"Not now" buttons count as "dismissed". Either outcome persists so
  // the gentle prompt is never shown again.
  els.feedbackNudgeOpenBtn?.addEventListener('click', () => {
    markFeedbackNudge('opened');
    hideFeedbackNudge({ els });
    openFeedbackModal(els);
  });
  els.feedbackNudgeDismissBtn?.addEventListener('click', () => {
    markFeedbackNudge('dismissed');
    hideFeedbackNudge({ els });
  });
  els.feedbackNudgeCloseBtn?.addEventListener('click', () => {
    markFeedbackNudge('dismissed');
    hideFeedbackNudge({ els });
  });
}

// Read the persisted feedback-nudge state ('opened' | 'dismissed' | '').
function getFeedbackNudgeState() {
  try {
    return localStorage.getItem(FEEDBACK_NUDGE_KEY) || '';
  } catch {
    return '';
  }
}

// Persist the feedback-nudge outcome so it is not shown again. Best-effort:
// a storage write failure must never break the UI.
function markFeedbackNudge(state) {
  try {
    localStorage.setItem(FEEDBACK_NUDGE_KEY, String(state || 'dismissed'));
  } catch {
    // ignore storage write failures
  }
}

// Show the gentle feedback nudge once, only after real engagement and only if
// the user has neither dismissed nor acted on it before. Never auto-opens the
// modal; the feedback button/modal remain available independently.
function maybeShowFeedbackNudge({ els }) {
  if (!els.feedbackNudge) return;
  if (getFeedbackNudgeState()) return; // already opened or dismissed

  let answered = 0;
  try {
    answered = getQuizHistory().length;
  } catch {
    answered = 0;
  }
  if (answered < FEEDBACK_NUDGE_MIN_QUESTIONS) return;

  els.feedbackNudge.classList.remove('hidden');
}

function hideFeedbackNudge({ els }) {
  els.feedbackNudge?.classList?.add('hidden');
}

function enforceUserNameIfNeeded({ els }) {
  const current = getUserName();
  if (current) return;
  openUserModal({ els, locked: true });
}

function openUserModal({ els, locked }) {
  if (!els.userModal) return;

  const current = getUserName();
  if (els.userNameInput) {
    els.userNameInput.value = current || '';
    setTimeout(() => els.userNameInput.focus(), 0);
  }
  els.userMessage?.classList?.add('hidden');
  els.userModal.setAttribute('data-locked', locked ? 'true' : 'false');
  if (els.userModalCloseBtn) {
    els.userModalCloseBtn.classList.toggle('hidden', Boolean(locked));
  }
  openModal(els.userModal);
}

function showInlineMessage(messageEl, text, colorClass) {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.className = `text-sm mb-4 ${colorClass}`;
  messageEl.classList.remove('hidden');
}

function buildTweetText({ userName, examCode, totalXp, weekXp, title }) {
  const name = String(userName || (getLocale() === 'ja' ? '名無し' : 'Anonymous'));
  const code = String(examCode || '');
  const total = Number(totalXp || 0);
  const week = Number(weekXp || 0);
  const tpl = t('tweet.template', { name, code, title: String(title || ''), total, week });
  return [tpl, t('tweet.cta') + ' ' + t('tweet.hashtag')].filter(Boolean).join('\n');
}

// Build enriched tweet text for a strong practice-exam result (issue #33 viral boost).
// NOTE: leaderboard triggers (#32), server-generated custom OGP images and
// user-uploadable avatars/character icons are intentionally NOT handled here —
// they require a backend/DB and are 要人間対応 (out of scope for this static client).
function buildTweetScoreText({ userName, examCode, accuracy, correct, total }) {
  const name = String(userName || (getLocale() === 'ja' ? '名無し' : 'Anonymous'));
  const code = String(examCode || '');
  const pct = Math.round(Number(accuracy || 0) * 100);
  const tpl = t('tweet.scoreTemplate', {
    name,
    code,
    accuracy: pct,
    correct: Number(correct || 0),
    total: Number(total || 0),
  });
  return [tpl, t('tweet.cta') + ' ' + t('tweet.hashtag')].filter(Boolean).join('\n');
}

function buildTweetIntentUrl({ text, url }) {
  // X current endpoint (twitter.com still works, but this reduces redirects)
  const base = 'https://x.com/intent/post';
  const params = new URLSearchParams();
  params.set('text', String(text || '').slice(0, 800));
  if (url) params.set('url', String(url));
  return `${base}?${params.toString()}`;
}

// Build GitHub's tokenless prefilled new-issue URL. URLSearchParams url-encodes
// the values, so title/body/labels are safely escaped. `labels` may be an array
// or comma-separated string; empty entries are dropped.
function buildGitHubIssueUrl({ title, body, labels }) {
  const base = 'https://github.com/Kenta-Matsuda/Kenta-Matsuda.github.io-aws-study/issues/new';
  const params = new URLSearchParams();
  params.set('title', String(title || ''));
  params.set('body', String(body || ''));
  const labelList = Array.isArray(labels)
    ? labels
    : String(labels || '').split(',');
  const cleaned = labelList.map((l) => String(l || '').trim()).filter(Boolean);
  if (cleaned.length) params.set('labels', cleaned.join(','));
  return `${base}?${params.toString()}`;
}

function showMilestoneToast({ els, unlocked }) {
  if (!els.milestoneToast || !els.milestoneToastText) return;
  const latest = unlocked?.[unlocked.length - 1];
  if (!latest) return;
  const localTitle = t(`milestones.${latest.id}`) !== `milestones.${latest.id}` ? t(`milestones.${latest.id}`) : latest.title;
  els.milestoneToastText.textContent = t('milestones.toastText', { title: localTitle, xp: latest.xp });
  els.milestoneToast.classList.remove('hidden');

  // Launch confetti celebration!
  launchConfetti(els.confettiCanvas);

  window.clearTimeout?.(els.__milestoneToastTimer);
  els.__milestoneToastTimer = window.setTimeout(() => {
    hideMilestoneToast({ els });
  }, 4500);
}

function hideMilestoneToast({ els }) {
  els.milestoneToast?.classList?.add('hidden');
}

function computeNextAction({ exam, analytics, streakInfo }) {
  if (!analytics || analytics.total === 0) {
    if (getLocale() === 'ja') return `${exam.code} の学習を始めましょう`;
    return `Let's start studying for ${exam.code}`;
  }

  // Find weakest domain
  const domains = exam.domains || [];
  let weakestDomain = null;
  let weakestAccuracy = 1;
  for (const d of domains) {
    const domainStats = analytics.byDomain[d.id];
    if (domainStats && domainStats.total >= 3 && domainStats.accuracy < weakestAccuracy) {
      weakestAccuracy = domainStats.accuracy;
      weakestDomain = d;
    }
  }

  // Check recent trend (last 10)
  const recent10 = analytics.recentTrend.slice(-10);
  const recentCorrect = recent10.filter(Boolean).length;
  const recentAccuracy = recent10.length > 0 ? recentCorrect / recent10.length : 0;

  if (recentAccuracy >= 0.8 && analytics.accuracy >= 0.7) {
    if (getLocale() === 'ja') return '好調です！新しいドメインに挑戦しましょう';
    return 'You\'re on a roll! Try a new domain';
  }

  if (weakestDomain && weakestAccuracy < 0.5) {
    const name = localizedTitle(weakestDomain) || weakestDomain.shortName || `Domain ${weakestDomain.id}`;
    if (getLocale() === 'ja') return `苦手な「${name}」を重点復習しましょう`;
    return `Focus on your weak area: "${name}"`;
  }

  if (!streakInfo.hadActivityToday) {
    if (getLocale() === 'ja') return '今日の学習をスタートしましょう！';
    return 'Start today\'s study session!';
  }

  if (analytics.total < 20) {
    if (getLocale() === 'ja') return 'まずは20問を目標に挑戦しましょう';
    return 'Aim for 20 questions to build a foundation';
  }

  if (weakestDomain) {
    const name = localizedTitle(weakestDomain) || weakestDomain.shortName || `Domain ${weakestDomain.id}`;
    if (getLocale() === 'ja') return `「${name}」の理解を深めましょう`;
    return `Deepen your understanding of "${name}"`;
  }

  if (getLocale() === 'ja') return '全ドメイン横断でチャレンジしましょう';
  return 'Challenge yourself across all domains';
}

function renderLearningStatus({ els, exam, state }) {
  if (!els.learningStatusPanel) return;

  const analytics = getQuizAnalytics(exam.id);
  const streakInfo = getStreakInfo();

  // Update exam badge
  if (els.statusExamBadge) {
    els.statusExamBadge.textContent = exam.code;
  }

  // Calculate progress: based on total questions answered vs a target (e.g., 100 questions per exam)
  const TARGET_QUESTIONS = 100;
  const progressPct = Math.min(100, Math.round((analytics.total / TARGET_QUESTIONS) * 100));
  if (els.statusProgress) {
    els.statusProgress.textContent = `${progressPct}%`;
  }
  if (els.statusProgressBar) {
    els.statusProgressBar.style.width = `${progressPct}%`;
  }

  // Accuracy
  if (els.statusAccuracy) {
    if (analytics.total > 0) {
      els.statusAccuracy.textContent = `${Math.round(analytics.accuracy * 100)}%`;
    } else {
      els.statusAccuracy.textContent = '-%';
    }
  }

  // Next action recommendation
  const nextAction = computeNextAction({ exam, analytics, streakInfo });
  if (els.nextActionText) {
    els.nextActionText.textContent = nextAction;
  }

  // Main CTA label: start vs resume today's study (issue #40)
  if (els.mainStudyCtaLabel) {
    els.mainStudyCtaLabel.textContent = streakInfo.hadActivityToday
      ? t('dashboard.mainCta.resume')
      : t('dashboard.mainCta.start');
  }
}

function renderXpDashboard({ els, exam, state }) {
  if (!els.xpDashboard) return;

  const name = getUserName();
  const summary = getXpSummary();

  if (els.xpUserLine) {
    els.xpUserLine.textContent = buildDashboardHeadline({ userName: name });
  }

  if (els.xpTotal) els.xpTotal.textContent = String(summary.totalXp);
  if (els.xpRecentActions) {
    els.xpRecentActions.innerHTML = renderRecentXpActionsHtml(summary.recentActions);
  }
  if (els.xpWeek) {
    const week = Number(summary.weekXp || 0);
    els.xpWeek.textContent = `+${week}`;
  }
  if (els.xpTitleBadge) els.xpTitleBadge.textContent = summary.title || '-';
  if (els.xpNextTitle) els.xpNextTitle.textContent = summary.nextTitle ? String(summary.nextTitle) : '-';
  if (els.xpRemaining) els.xpRemaining.textContent = summary.nextTitle ? `${summary.remainingXp} XP` : '-';
  const xpPct = Math.max(0, Math.min(1, Number(summary.progress01 || 0))) * 100;
  if (els.xpProgressBar) {
    els.xpProgressBar.style.width = `${xpPct.toFixed(1)}%`;
    const track = els.xpProgressBar.parentElement;
    if (track && track.getAttribute('role') === 'progressbar') {
      track.setAttribute('aria-valuenow', String(Math.round(xpPct)));
    }
  }
  // RPG walker tracks the same clamped progress position along the bar
  if (els.xpWalker) {
    els.xpWalker.style.left = `${xpPct.toFixed(1)}%`;
  }

  // Streak display
  renderStreakDisplay(els);

  // Opt-in local study reminder: only act when the user has enabled it.
  // No permission is requested here unless the user opted in (see wireStudyReminder).
  maybeFireStudyReminder(els);

  // Initialize carousel (only once)
  initDashboardCarousel(els);

  // Update skill radar chart
  renderSkillRadarChart({ els, exam, state });

  // Render daily highlight (narrative)
  renderDailyHighlight({ els, exam, state });
}

let carouselInitialized = false;

function initDashboardCarousel(els) {
  if (carouselInitialized) return;
  const track = els.carouselTrack;
  const dotsContainer = els.carouselDots;
  const prevBtn = els.carouselPrev;
  const nextBtn = els.carouselNext;
  if (!track || !dotsContainer) return;

  const slides = track.querySelectorAll('.dashboard-carousel-slide');
  if (slides.length === 0) return;

  carouselInitialized = true;
  let currentIndex = 0;

  // Determine visible slides based on viewport
  function getVisibleCount() {
    const w = window.innerWidth;
    if (w >= 768) return 2;
    return 1;
  }

  function getMaxIndex() {
    return Math.max(0, slides.length - getVisibleCount());
  }

  function update() {
    const visibleCount = getVisibleCount();
    const pct = (100 / visibleCount) * currentIndex;
    track.style.transform = `translateX(-${pct}%)`;

    // Update dots
    const maxIdx = getMaxIndex();
    dotsContainer.innerHTML = '';
    for (let i = 0; i <= maxIdx; i++) {
      const dot = document.createElement('button');
      dot.className = 'dashboard-carousel-dot' + (i === currentIndex ? ' active' : '');
      dot.setAttribute('aria-label', `スライド ${i + 1}`);
      dot.addEventListener('click', () => { currentIndex = i; update(); resetAutoSlide(); });
      dotsContainer.appendChild(dot);
    }

    // Show/hide nav buttons
    if (prevBtn) prevBtn.style.display = currentIndex <= 0 ? 'none' : '';
    if (nextBtn) nextBtn.style.display = currentIndex >= maxIdx ? 'none' : '';
  }

  prevBtn?.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; update(); resetAutoSlide(); } });
  nextBtn?.addEventListener('click', () => { if (currentIndex < getMaxIndex()) { currentIndex++; update(); resetAutoSlide(); } });

  // Auto-slide every 5 seconds
  let autoSlideTimer = setInterval(advance, 5000);
  function advance() {
    currentIndex = currentIndex < getMaxIndex() ? currentIndex + 1 : 0;
    update();
  }
  function resetAutoSlide() {
    clearInterval(autoSlideTimer);
    autoSlideTimer = setInterval(advance, 5000);
  }

  // Re-calculate on resize
  window.addEventListener('resize', () => {
    if (currentIndex > getMaxIndex()) currentIndex = getMaxIndex();
    update();
  });

  update();
}

// Streak milestones (in days) that trigger an intrinsic-motivation celebration.
const STREAK_MILESTONES = [7, 14, 30, 60, 100];

function highestReachedStreakMilestone(current) {
  let reached = 0;
  for (const m of STREAK_MILESTONES) {
    if (current >= m) reached = m;
  }
  return reached;
}

function renderStreakDisplay(els) {
  const streak = getStreakInfo();
  if (els.streakCount) {
    els.streakCount.textContent = String(streak.current);
  }
  if (els.streakMessage) {
    if (streak.hadActivityToday) {
      els.streakMessage.textContent = streak.current >= 7
        ? t('dashboard.streak.weekAchieved')
        : streak.current >= 3
          ? t('dashboard.streak.ongoing', { count: streak.current })
          : t('dashboard.streak.todayActive');
    } else {
      els.streakMessage.textContent = streak.current > 0
        ? t('dashboard.streak.atRisk')
        : t('dashboard.streak.startNew');
    }
  }

  // Intrinsic-motivation celebration: when the user crosses a new streak
  // milestone (7/14/30/...), celebrate once with a toast + confetti.
  maybeCelebrateStreakMilestone(els, streak);
  if (els.streakWeekDots) {
    const days = [t('days.mon'), t('days.tue'), t('days.wed'), t('days.thu'), t('days.fri'), t('days.sat'), t('days.sun')];
    const today = new Date().getDay(); // 0=Sun
    const dayLabels = [];
    for (let i = 6; i >= 0; i--) {
      const d = (today - i + 7) % 7;
      dayLabels.push(days[d === 0 ? 6 : d - 1]);
    }
    // Get activity from getXpSummary's weekXp or reconstruct
    // Simple approach: use the streak info + hadActivityToday
    const xpSummary = getXpSummary();
    const state = typeof window !== 'undefined' && window.__studyState ? window.__studyState : null;

    els.streakWeekDots.innerHTML = dayLabels.map((label, i) => {
      // For now, show today as active if hadActivityToday, and fill based on streak
      const daysAgo = 6 - i;
      const isActive = streak.hadActivityToday
        ? daysAgo < streak.current || (daysAgo === 0)
        : daysAgo > 0 && daysAgo <= streak.current;
      return `
        <div class="flex flex-col items-center gap-0.5">
          <div class="w-5 h-5 rounded-full ${isActive ? 'bg-orange-400' : 'bg-gray-200'} flex items-center justify-center">
            ${isActive ? '<span class="text-white text-[9px]">✓</span>' : ''}
          </div>
          <span class="text-[9px] text-gray-400">${label}</span>
        </div>
      `.trim();
    }).join('');
  }
}

// Celebrate crossing a new streak milestone once (intrinsic motivation).
// Reuses the milestone toast + confetti pattern already used for XP milestones.
function maybeCelebrateStreakMilestone(els, streak) {
  if (!streak || !streak.hadActivityToday) return;
  const reached = highestReachedStreakMilestone(streak.current);
  if (reached <= 0) return;

  const alreadyCelebrated = getCelebratedStreakMilestone();
  if (reached <= alreadyCelebrated) return;

  setCelebratedStreakMilestone(reached);

  showStreakMilestoneToast({ els, days: reached });
}

// Streak-milestone toast uses its OWN element + timer (distinct from the XP
// milestone toast) so a single quiz answer that crosses both an XP title and a
// streak milestone shows both celebrations instead of one clobbering the other.
function showStreakMilestoneToast({ els, days }) {
  if (!els.streakMilestoneToast || !els.streakMilestoneToastText) return;
  els.streakMilestoneToastText.textContent = t('dashboard.streak.milestoneToast', { days });
  els.streakMilestoneToast.classList.remove('hidden');
  launchConfetti(els.confettiCanvas);
  window.clearTimeout?.(els.__streakMilestoneToastTimer);
  els.__streakMilestoneToastTimer = window.setTimeout(() => {
    hideStreakMilestoneToast({ els });
  }, 4500);
}

function hideStreakMilestoneToast({ els }) {
  els.streakMilestoneToast?.classList?.add('hidden');
}

// ─── Study Reminder (opt-in local notification) ─────────────

// Show the in-app streak nudge banner (client-side only, no network).
function showStreakNudge(els, message) {
  if (!els.streakNudge) return;
  if (els.streakNudgeText) els.streakNudgeText.textContent = message;
  els.streakNudge.classList.remove('hidden');
}

function hideStreakNudge(els) {
  els.streakNudge?.classList?.add('hidden');
}

// Fire a local (client-side) study reminder when the streak is at risk and the
// user has opted in. Feature-detects the Notification API and degrades to an
// in-app nudge; never throws when Notification is unavailable or denied.
function maybeFireStudyReminder(els) {
  if (!getStudyReminderEnabled()) return;

  const streak = getStreakInfo();
  // "At risk" = the user has an active streak but has not studied today yet.
  if (streak.hadActivityToday || streak.current <= 0) return;

  const title = t('dashboard.streak.reminderTitle');
  const body = t('dashboard.streak.reminderBody', { count: streak.current });

  // In-app nudge always shows as graceful degradation.
  showStreakNudge(els, body);

  // Local OS notification (best effort, feature-detected).
  // NOTE: we intentionally reference the SVG icon here. Some platforms ignore
  // SVG notification icons (falling back to a default glyph), but the raster
  // PNG app icons only exist on the #97 branch and are not present on this
  // branch, so pointing at a PNG now would be a dead asset reference. Once #97
  // merges to main, switch this to a raster PNG (e.g. assets/icon-192.png).
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'assets/icon.svg' });
    }
  } catch { /* ignore: notifications are optional */ }
}

// Wire the opt-in study reminder toggle in the settings modal.
function wireStudyReminder(els) {
  const toggle = els.studyReminderToggle;
  const statusEl = els.studyReminderStatus;
  const supported = typeof window !== 'undefined' && 'Notification' in window;

  const reflect = () => {
    const enabled = getStudyReminderEnabled();
    if (toggle) toggle.checked = enabled;
    if (!statusEl) return;
    if (!supported) {
      statusEl.textContent = t('dashboard.streak.reminderUnsupported');
      return;
    }
    if (!enabled) {
      statusEl.textContent = t('dashboard.streak.reminderOff');
      return;
    }
    // Enabled: reflect the underlying permission state.
    const perm = (typeof Notification !== 'undefined' && Notification.permission) || 'default';
    if (perm === 'denied') {
      statusEl.textContent = t('dashboard.streak.reminderDenied');
    } else if (perm === 'granted') {
      statusEl.textContent = t('dashboard.streak.reminderOn');
    } else {
      statusEl.textContent = t('dashboard.streak.reminderInApp');
    }
  };

  if (toggle && !supported) {
    toggle.disabled = true;
  }

  reflect();

  els.streakNudgeCloseBtn?.addEventListener('click', () => hideStreakNudge(els));

  toggle?.addEventListener('change', () => {
    const wantOn = Boolean(toggle.checked);
    setStudyReminderEnabled(wantOn);

    // Request OS notification permission on opt-in (feature-detected, guarded).
    if (wantOn && supported) {
      try {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(() => reflect()).catch(() => reflect());
        }
      } catch { /* ignore */ }
    }
    reflect();
  });
}

// ─── Daily Highlight (物語化) ────────────────────────────────

function generateDailyHighlight({ exam, analytics, streakInfo, xpSummary }) {
  const highlights = [];
  const isJa = getLocale() === 'ja';

  // Check streak milestones
  if (streakInfo.current >= 7) {
    highlights.push({ emoji: '🔥', text: isJa
      ? `${streakInfo.current}日連続学習中！素晴らしい継続力です。この習慣があなたの合格を支えています。`
      : `${streakInfo.current}-day study streak! Your consistency is paving the way to success.` });
  } else if (streakInfo.current >= 3) {
    highlights.push({ emoji: '💪', text: isJa
      ? `${streakInfo.current}日連続で学習を続けています。着実に力がついてきています！`
      : `${streakInfo.current} days in a row! You're steadily building your skills.` });
  }

  // Check if there are good domains
  if (analytics && analytics.total > 0) {
    const domains = exam?.domains || [];
    let bestDomain = null;
    let bestAcc = 0;
    let worstDomain = null;
    let worstAcc = 1;

    for (const d of domains) {
      const stats = analytics.byDomain[d.id];
      if (!stats || stats.total < 3) continue;
      if (stats.accuracy > bestAcc) { bestAcc = stats.accuracy; bestDomain = d; }
      if (stats.accuracy < worstAcc) { worstAcc = stats.accuracy; worstDomain = d; }
    }

    if (bestDomain && bestAcc >= 0.8) {
      const name = localizedTitle(bestDomain) || bestDomain.shortName || '';
      if (isJa) {
        highlights.push({ emoji: '🌟', text: `「${name}」の正答率は${Math.round(bestAcc * 100)}%！しっかり理解できていますね。` });
      } else {
        highlights.push({ emoji: '🌟', text: `${Math.round(bestAcc * 100)}% accuracy in "${name}" — great understanding!` });
      }
    }

    if (worstDomain && worstAcc < 0.5 && bestDomain) {
      const name = localizedTitle(worstDomain) || worstDomain.shortName || '';
      if (isJa) {
        highlights.push({ emoji: '📈', text: `「${name}」を重点復習すれば、合格がぐっと近づきます。あと少しです！` });
      } else {
        highlights.push({ emoji: '📈', text: `Focus on "${name}" to improve your pass chances. Almost there!` });
      }
    }

    // Overall progress
    const accuracy = analytics.accuracy;
    if (accuracy >= 0.8) {
      highlights.push({ emoji: '🏆', text: isJa
        ? `全体正答率${Math.round(accuracy * 100)}%！合格圏内の実力です。自信を持ってください！`
        : `${Math.round(accuracy * 100)}% overall accuracy! You're in the passing zone. Be confident!` });
    } else if (accuracy >= 0.6) {
      highlights.push({ emoji: '✨', text: isJa
        ? `正答率${Math.round(accuracy * 100)}%まで到達。合格ラインまであと一歩です！`
        : `You've reached ${Math.round(accuracy * 100)}% accuracy. One more step to the passing line!` });
    }

    // Total questions milestone
    if (analytics.total >= 100) {
      highlights.push({ emoji: '🎯', text: isJa
        ? `累計${analytics.total}問に回答！膨大な演習量が本番での自信になります。`
        : `${analytics.total} questions answered! This practice will boost your exam confidence.` });
    } else if (analytics.total >= 50) {
      highlights.push({ emoji: '📚', text: isJa
        ? `もう${analytics.total}問もこなしました。着実に知識が積み上がっています。`
        : `You've completed ${analytics.total} questions. Knowledge is building up steadily.` });
    }
  }

  // XP milestone
  if (xpSummary.totalXp >= 500) {
    highlights.push({ emoji: '⭐', text: isJa
      ? `累計${xpSummary.totalXp} XPを獲得！学習者としての成長が数字に表れています。`
      : `${xpSummary.totalXp} XP earned! Your growth as a learner is showing in the numbers.` });
  }

  // Default if nothing to highlight
  if (highlights.length === 0) {
    if (streakInfo.hadActivityToday) {
      return { emoji: '👍', text: isJa
        ? '今日もアクセスありがとうございます。一歩ずつ前進していきましょう！'
        : 'Thanks for showing up today. Keep moving forward, one step at a time!' };
    }
    return { emoji: '🌅', text: isJa
      ? '今日の学習で、未来の自分に投資しましょう。小さな一歩が大きな成果につながります。'
      : 'Invest in your future self with today\'s study. Small steps lead to big results.' };
  }

  // Pick the most relevant one (random from top highlights for variety)
  const idx = Math.floor(Math.random() * Math.min(highlights.length, 2));
  return highlights[idx];
}

function renderDailyHighlight({ els, exam, state }) {
  if (!els.dailyHighlight) return;

  const analytics = getQuizAnalytics(exam.id);
  const streakInfo = getStreakInfo();
  const xpSummary = getXpSummary();

  const highlight = generateDailyHighlight({ exam, analytics, streakInfo, xpSummary });

  if (highlight) {
    els.dailyHighlight.classList.remove('hidden');
    if (els.highlightEmoji) els.highlightEmoji.textContent = highlight.emoji;
    if (els.highlightText) els.highlightText.textContent = highlight.text;
  }
}

// ─── Confetti Animation ─────────────────────────────────────

function launchConfetti(canvasEl) {
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;

  canvasEl.width = window.innerWidth;
  canvasEl.height = window.innerHeight;

  const particles = [];
  const colors = ['#6366f1', '#a855f7', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#ec4899'];

  for (let i = 0; i < 120; i++) {
    particles.push({
      x: Math.random() * canvasEl.width,
      y: Math.random() * canvasEl.height - canvasEl.height,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 3 + 2,
      size: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    });
  }

  let frame = 0;
  const maxFrames = 150;

  function animate() {
    frame++;
    if (frame > maxFrames) {
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      return;
    }

    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    for (const p of particles) {
      p.x += p.vx;
      p.vy += 0.1;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - (frame / maxFrames));

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }

    requestAnimationFrame(animate);
  }

  animate();
}

// ─── Skill Radar Chart ──────────────────────────────────────

let skillRadarChartInstance = null;

function renderSkillRadarChart({ els, exam, state }) {
  if (!els.skillRadarChart || !exam?.domains?.length) return;

  const analytics = getQuizAnalytics(state.examId);
  const byDomain = analytics.byDomain || {};

  // Check if there's any quiz data
  const hasData = Object.keys(byDomain).length > 0;

  // Always show the chart container; show empty message overlay when no data
  if (els.skillRadarEmpty) {
    els.skillRadarEmpty.classList.toggle('hidden', hasData);
  }

  // Use short labels (D1, D2...) to fit within carousel
  const labels = exam.domains.map((d) => `D${d.id}`);
  const fullNames = exam.domains.map((d) => localizedTitle(d));
  const dataValues = exam.domains.map((d) => {
    const domainData = byDomain[d.id];
    return domainData ? Math.round(domainData.accuracy * 100) : 0;
  });
  const totalCounts = exam.domains.map((d) => {
    const domainData = byDomain[d.id];
    return domainData ? domainData.total : 0;
  });
  const borderColors = exam.domains.map((d) => d.color || '#6366f1');
  const bgColors = exam.domains.map((d) => {
    // Convert hex to rgba with 0.2 alpha
    const hex = d.color || '#6366f1';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, 0.2)`;
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: '正答率 (%)',
        data: dataValues,
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderColor: '#6366f1',
        borderWidth: 2,
        pointBackgroundColor: borderColors,
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => {
            const idx = items[0]?.dataIndex;
            return idx != null ? fullNames[idx] : '';
          },
          label: (ctx) => {
            const idx = ctx.dataIndex;
            const count = totalCounts[idx] || 0;
            return `正答率: ${ctx.raw}%（${count}問回答）`;
          },
        },
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        min: 0,
        ticks: {
          stepSize: 25,
          font: { size: 9 },
          backdropColor: 'transparent',
        },
        pointLabels: {
          font: { size: 11, weight: '700' },
          color: '#6b7280',
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.15)',
        },
        angleLines: {
          color: 'rgba(107, 114, 128, 0.15)',
        },
      },
    },
  };

  const ctx = els.skillRadarChart.getContext('2d');

  if (skillRadarChartInstance) {
    skillRadarChartInstance.data = chartData;
    skillRadarChartInstance.options = chartOptions;
    skillRadarChartInstance.update();
  } else {
    skillRadarChartInstance = new Chart(ctx, {
      type: 'radar',
      data: chartData,
      options: chartOptions,
    });
  }

  // Render legend below chart
  if (els.skillRadarLegend) {
    els.skillRadarLegend.innerHTML = exam.domains.map((d) =>
      `<span class="inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${d.color || '#6366f1'}"></span><span class="text-gray-600">D${d.id}: ${localizedTitle(d)}</span></span>`
    ).join('');
  }
}

function renderRecentXpActionsHtml(actions) {
  const list = Array.isArray(actions) ? actions : [];
  if (!list.length) {
    return `<div class="text-gray-400">${t('xpActions.noHistory')}</div>`;
  }

  const rows = list
    .map((a) => {
      const reason = String(a?.reason || '');
      const applied = Number(a?.appliedXp || 0);
      const bonus = Number(a?.bonusXp || 0);
      const at = String(a?.at || '');
      const day = String(a?.day || '');

      const label =
        reason === 'link'
          ? t('xpActions.link')
          : reason === 'explain'
            ? t('xpActions.explain')
            : reason === 'quiz'
              ? t('xpActions.quiz')
              : reason || t('xpActions.xp');

      let timeText = '';
      try {
        const d = new Date(at);
        if (!Number.isNaN(d.getTime())) {
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          timeText = day ? `${day} ${hh}:${mm}` : `${hh}:${mm}`;
        }
      } catch {
        // ignore
      }

      const bonusBadge = bonus > 0 ? `<span class="ml-1 text-[11px] font-bold text-orange-700">初回+${bonus}</span>` : '';

      return `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
          <div class="min-w-0">
            <div class="truncate"><span class="font-semibold text-gray-700">${escapeHtml(label)}</span></div>
          </div>
          <div class="flex flex-wrap items-baseline gap-x-1 gap-y-0">
            <span class="font-mono text-gray-800">+${applied}</span>
            <span class="text-gray-400">XP</span>
            ${bonusBadge}
            ${timeText ? `<span class="ml-2 text-gray-400 font-mono">${escapeHtml(timeText)}</span>` : ''}
          </div>
        </div>
      `.trim();
    })
    .join('');

  return rows;
}

function stablePick(list, seedText) {
  const arr = Array.isArray(list) ? list : [];
  if (!arr.length) return '';
  const seed = String(seedText || '');
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = Math.abs(h) % arr.length;
  return arr[idx];
}

function buildDashboardHeadline({ userName }) {
  const name = String(userName || '').trim();

  const now = new Date();
  const hour = now.getHours();
  const daySeed = now.toISOString().slice(0, 10);
  const baseSeed = `${daySeed}|${name || 'anon'}`;

  let greet;
  if (getLocale() === 'ja') {
    const greetingCandidates =
      hour < 5
        ? ['こんばんは。', 'おつかれさまです。', '夜遅くまでおつかれさまです。']
        : hour < 11
          ? ['おはようございます。', 'おはよう。', 'いい朝ですね。']
          : hour < 18
            ? ['こんにちは。', 'こんにちは！', 'やあ。']
            : ['こんばんは。', 'おつかれさまです。', 'おかえりなさい。'];
    greet = stablePick(greetingCandidates, `${baseSeed}|g`);
  } else {
    greet = hour < 5
      ? t('greeting.night')
      : hour < 11
        ? t('greeting.morning')
        : hour < 18
          ? t('greeting.afternoon')
          : t('greeting.evening');
  }

  const you = name ? (getLocale() === 'ja' ? `${name}さん` : name) : (getLocale() === 'ja' ? 'あなた' : 'there');
  let line1;
  if (getLocale() === 'ja') {
    line1 = `${greet} ${you}`.trim();
  } else {
    // English: "Good morning, kenta!" - strip trailing period from greeting and combine
    const greetBase = greet.replace(/\.\s*$/, '');
    line1 = `${greetBase}, ${you}!`;
  }
  const line2 = buildDashboardOneLiner({ userName: name });
  return [line1, line2].filter(Boolean).join('\n').trim();
}

function buildDashboardOneLiner({ userName, title } = {}) {
  const name = String(userName || '').trim();
  const now = new Date();
  const hour = now.getHours();
  const daySeed = now.toISOString().slice(0, 10);
  const baseSeed = `${daySeed}|${name || 'anon'}|${String(title || '')}`;

  if (getLocale() === 'en') {
    // Use localized motivations from JSON
    const motivations = [];
    for (let i = 0; i < 10; i++) {
      const key = `greeting.motivations.${i}`;
      const val = t(key);
      if (val !== key) motivations.push(val);
    }
    // Fallback
    if (!motivations.length) motivations.push('Keep up the great work!');
    return stablePick(motivations, `${baseSeed}|l`);
  }

  const base = [
    '今日も来てくれて嬉しいです。',
    '継続は力なり、ですね。',
    'コツコツやるのが一番です。',
    '今日も一歩ずつ進めましょう。',
    '今日も頑張りましょう。',
    'マイペースで大丈夫ですよ。',
    '疲れたら休憩しましょう。',
    '今日の努力が明日のあなたを作ります。',
    '千里の道も一歩から、ですね。',
    'あなたの成果を投稿してみませんか？',
    'AWS学習、応援しています！',
    '困ったときはAI機能も活用してくださいね。',
    '今日も楽しくAWSを学びましょう。',
    '息抜きに、SNSでシェアしてみませんか？',
    'AIがあなたの学習をサポートします。',
    '用語解説はAIにお任せください！',
  ];

  const lateNight = ['夜更かしはほどほどに。', 'また明日。', '眠気が来たら撤退も正解。'];
  const morning = ['朝から良いスタート切ろう。', '朝の集中は最強。', '1トピックだけ片づけよう。'];
  const evening = ['一日おつかれさま。', 'おつかれさま。あと少しだけ。', 'ゆるく続けよう。'];

  const timeAdd = hour < 5 ? lateNight : hour < 11 ? morning : hour < 18 ? [] : evening;
  const candidates = base.concat(timeAdd);
  return stablePick(candidates, `${baseSeed}|l`);
}

function smoothReturnToDashboard({ els }) {
  const target = els?.xpDashboard;
  if (!target) return;

  try {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    window.scrollTo?.(0, 0);
  }
}

function renderExamMeta({ els, exam }) {
  document.title = `${exam.title}`;
  els.siteTitle.textContent = exam.title;
  els.siteSubtitle.textContent = localizedSubtitle(exam);
  els.examCodeBadge.textContent = exam.code;
}

function renderExamSwitcher({ els, exams, state, onSelect }) {
  // 1つだけ公開の場合はスイッチャーを隠す
  if (!exams || exams.length <= 1) {
    els.examSwitcher.innerHTML = '';
    els.examSwitcher.classList.add('hidden');
    closeExamMenu(els);
    if (els.examMenuBtn) {
      els.examMenuBtn.disabled = true;
      els.examMenuBtn.setAttribute('aria-disabled', 'true');
      els.examMenuBtn.classList.add('cursor-default', 'opacity-60');
    }
    return;
  }

  els.examSwitcher.classList.remove('hidden');
  els.examSwitcher.innerHTML = '';
  if (els.examMenuBtn) {
    els.examMenuBtn.disabled = false;
    els.examMenuBtn.removeAttribute('aria-disabled');
    els.examMenuBtn.classList.remove('cursor-default', 'opacity-60');
  }

  for (const exam of exams) {
    const btn = document.createElement('button');
    const isActive = exam.id === state.examId;

    btn.className = [
      'px-3 py-1.5 rounded-lg text-sm font-bold border transition',
      isActive
        ? 'bg-white text-gray-900 border-white'
        : 'bg-gray-700/50 text-gray-200 border-gray-600 hover:bg-gray-600',
    ].join(' ');

    btn.type = 'button';
    btn.textContent = exam.shortLabel;
    btn.setAttribute('aria-pressed', String(isActive));
    btn.addEventListener('click', () => {
      onSelect(exam.id);
      closeExamMenu(els);
    });

    els.examSwitcher.appendChild(btn);
  }
}

function toggleExamMenu(els) {
  if (!els.examMenu) return;
  els.examMenu.classList.toggle('hidden');
}

function closeExamMenu(els) {
  if (!els.examMenu) return;
  els.examMenu.classList.add('hidden');
}

function renderChart({ els, exam, onDomainSelect }) {
  // chart destroy
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  // Chart.js が読み込めない環境でもアプリ自体は動かす
  if (typeof window.Chart === 'undefined') {
    els.domainLegend.innerHTML =
      `<div class="text-sm text-gray-500">${t('errors.chartLoadFailed')}</div>`;
    return;
  }

  // データが無い場合
  if (!exam.domains || exam.domains.length === 0) {
    els.domainLegend.innerHTML = `<div class="text-sm text-gray-500">${t('errors.examDataNotFound')}</div>`;
    return;
  }

  const ctx = els.examWeightChart?.getContext?.('2d');
  if (!ctx) return;
  const data = {
    labels: exam.domains.map((d) => localizedTitle(d)),
    datasets: [
      {
        data: exam.domains.map((d) => d.weight),
        backgroundColor: exam.domains.map((d) => d.color),
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  chartInstance = new window.Chart(ctx, {
    type: 'doughnut',
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => ` ${context.label}: ${context.raw}%`,
          },
        },
      },
    },
  });

  // Legend
  els.domainLegend.innerHTML = '';
  for (const domain of exam.domains) {
    const item = document.createElement('div');
    item.className = 'flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition';
    item.addEventListener('click', () => onDomainSelect(domain.id));
    item.innerHTML = `
      <div class="w-3 h-3 rounded-full" style="background-color: ${domain.color}"></div>
      <span class="text-gray-700 flex-1">${escapeHtml(domain.title)}</span>
      <span class="font-bold text-gray-900">${domain.weight}%</span>
    `;
    els.domainLegend.appendChild(item);
  }
}

function renderTabs({ els, exam, state, onDomainSelect }) {
  els.domainTabs.innerHTML = '';

  if (!exam.domains || exam.domains.length === 0) return;

  // "全般" tab for exam-wide steps
  const hasExamSteps = Array.isArray(exam.steps) && exam.steps.length > 0;
  if (hasExamSteps) {
    const isAllActive = state.currentDomainId === 'all';
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = [
      'whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors border-b-2',
      isAllActive
        ? 'text-gray-900 border-orange-500'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
    ].join(' ');
    if (isAllActive) {
      allBtn.style.borderColor = '#f97316';
      allBtn.style.color = '#f97316';
    }
    allBtn.innerHTML = `<i class="fas fa-star text-xs mr-1"></i>${t('common.all')}`;
    allBtn.addEventListener('click', () => onDomainSelect('all'));
    els.domainTabs.appendChild(allBtn);
  }

  for (const domain of exam.domains) {
    const isActive = state.currentDomainId === domain.id;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = [
      'whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors border-b-2',
      isActive
        ? 'text-gray-900'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
    ].join(' ');

    if (isActive) {
      btn.style.borderColor = domain.color;
      btn.style.color = domain.color;
    }

    btn.textContent = `Domain ${domain.id}`;
    btn.addEventListener('click', () => onDomainSelect(domain.id));
    els.domainTabs.appendChild(btn);
  }
}

function renderContent({ els, exam, state }) {
  els.contentArea.innerHTML = '';

  // Special: Beginner guide (common resources)
  if (state.examId === '__beginner__') {
    renderBeginnerGuide({ els, state });
    return;
  }

  if (!exam.domains || exam.domains.length === 0) {
    els.contentArea.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <i class="fas fa-circle-info text-4xl mb-3 text-gray-300"></i>
        <p>${t('errors.examDataNotFound')}</p>
      </div>
    `;
    return;
  }

  // Exam-wide resources ("全般" tab)
  if (state.currentDomainId === 'all') {
    renderExamResources({ els, exam, state });
    return;
  }

  const term = '';
  const targetDomains = exam.domains.filter((d) => d.id === state.currentDomainId);

  for (const domain of targetDomains) {
    const visibleTasks = domain.tasks || [];

    const domainHeader = document.createElement('div');
    domainHeader.innerHTML = `
      <div class="flex items-center gap-2 mb-4">
        <span class="px-3 py-1 rounded text-xs font-bold text-white" style="background-color: ${domain.color}">Domain ${domain.id}</span>
        <h2 class="text-xl font-bold text-gray-800">${escapeHtml(localizedTitle(domain))}</h2>
      </div>
      <p class="text-gray-600 mb-6 bg-gray-50 p-4 rounded-lg border-l-4" style="border-color: ${domain.color}">
        ${escapeHtml(localizedDomainDescription(domain))}
      </p>
    `;
    els.contentArea.appendChild(domainHeader);

    for (const task of visibleTasks) {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden card-hover mb-6';

      const taskContext = buildTaskAiContext(task);
      const shouldShowDescription = task?.showDescription === true;
      const taskDescriptionLines = normalizeDescriptionLines(localizedDescription(task));
      const taskDescriptionHtml = taskDescriptionLines
        .map((line) => `<div>${highlightHtml(escapeHtml(line), term)}</div>`)
        .join('');
      const descriptionHtml =
        shouldShowDescription && taskDescriptionLines.length
          ? `
            <div class="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
              <div class="text-xs font-bold text-amber-700 mb-1">${getLocale() === 'ja' ? '説明' : 'Description'}</div>
              <div class="space-y-1">${taskDescriptionHtml}</div>
            </div>
          `
          : '';

      const header = document.createElement('div');
      header.className = 'p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white';
      header.innerHTML = `
        <div class="flex flex-col gap-3">
          <div>
            <div class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">${t('roadmap.taskStatement', { id: escapeHtml(task.id) })}</div>
            <h3 class="text-lg font-bold text-gray-900">${escapeHtml(localizedTitle(task))}</h3>
            ${getLocale() === 'ja' ? `<p class="text-sm text-gray-500 mt-1">${escapeHtml(task.title)}</p>` : ''}
            ${descriptionHtml}
          </div>
          <div class="flex justify-end">
            <button
              type="button"
              data-action="quiz"
              data-task-id="${escapeHtml(task.id)}"
              data-task-title="${escapeHtml(localizedTitle(task))}"
              data-task-context="${escapeHtml(taskContext)}"
              class="sparkle-btn text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 whitespace-nowrap"
            >
            <i class="fas fa-magic"></i> ${t('quiz.generateBtn')}
            </button>
          </div>
        </div>
      `;
      card.appendChild(header);

      const body = document.createElement('div');
      const resourceSections = buildResourceSections(task);
      const hasResources = resourceSections.length > 0;
      body.className = hasResources ? 'p-5 grid md:grid-cols-2 gap-6' : 'p-5';

      const knowledgeCol = document.createElement('div');
      knowledgeCol.innerHTML = `
        <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <i class="fas fa-check-circle text-green-500"></i> ${t('roadmap.knowledge')}
        </h4>
        <ul class="space-y-3">
          ${(localizedKnowledge(task)).map((k) => renderKnowledgeRow({ knowledge: k, term, taskContext })).join('')}
        </ul>
      `;

      body.appendChild(knowledgeCol);

      if (hasResources) {
        const resourceCol = document.createElement('div');
        resourceCol.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200';
        resourceCol.innerHTML = `
          <div class="space-y-5">
            ${resourceSections
              .map((section) =>
                renderResourceSection({
                  title: section.title,
                  iconClass: section.iconClass,
                  iconColorClass: section.iconColorClass,
                  items: section.items,
                  term,
                  context: {
                    examId: state.examId,
                    domainId: String(domain.id || ''),
                    taskId: String(task.id || ''),
                    taskTitle: String(localizedTitle(task) || ''),
                    resourceSection: String(section.key || ''),
                  },
                })
              )
              .join('')}
          </div>
        `;
        body.appendChild(resourceCol);
      }
      card.appendChild(body);
      els.contentArea.appendChild(card);
    }
  }

  if (!els.contentArea.innerHTML) {
    els.contentArea.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <i class="fas fa-circle-info text-4xl mb-3 text-gray-300"></i>
        <p>${t('errors.domainTaskNotFound')}</p>
      </div>
    `;
  }
}

function renderExamResources({ els, exam, state }) {
  const steps = exam.steps;
  if (!Array.isArray(steps) || steps.length === 0) {
    els.contentArea.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <i class="fas fa-circle-info text-4xl mb-3 text-gray-300"></i>
        <p>${t('errors.stepsNotFound')}</p>
      </div>
    `;
    return;
  }

  // Separate exam-specific steps from common ones
  const examSpecificSteps = steps.filter(step => !COMMON_STEP_TITLES.has(step.title));

  const term = '';

  // Header
  const headerEl = document.createElement('div');
  headerEl.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <span class="px-3 py-1 rounded text-xs font-bold text-white bg-orange-500"><i class="fas fa-star mr-1"></i>${t('common.all')}</span>
      <h2 class="text-xl font-bold text-gray-800">${t('roadmap.title')}</h2>
    </div>
    <p class="text-gray-600 mb-6 bg-gray-50 p-4 rounded-lg border-l-4 border-orange-400">
      ${escapeHtml(t('roadmap.description', { code: exam.code }))}
    </p>
  `;
  els.contentArea.appendChild(headerEl);

  // Render exam-specific steps
  let stepIndex = 1;
  for (const step of examSpecificSteps) {
    renderStepCard({ els, step, stepIndex: String(stepIndex), state, term });
    stepIndex++;
  }
}

function renderStepCard({ els, step, stepIndex, state, term }) {
  const card = document.createElement('div');
  card.className = 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden card-hover mb-6';

  const stepDescLines = normalizeDescriptionLines(localizedDescription(step));
  const stepDescHtml = stepDescLines.length
    ? `<div class="mt-3 p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-900">
         <div class="space-y-1">${stepDescLines.map((l) => `<div>${escapeHtml(l)}</div>`).join('')}</div>
       </div>`
    : '';

  const header = document.createElement('div');
  header.className = 'p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white';
  header.innerHTML = `
    <div class="flex items-center gap-3">
      <span class="flex items-center justify-center w-9 h-9 rounded-full bg-orange-500 text-white font-bold text-sm flex-shrink-0 shadow-sm">${escapeHtml(stepIndex)}</span>
      <div class="flex-1 min-w-0">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Step ${escapeHtml(stepIndex)}</div>
        <h3 class="text-lg font-bold text-gray-900">${escapeHtml(localizedTitle(step))}</h3>
        ${getLocale() === 'ja' ? `<p class="text-sm text-gray-500 mt-0.5">${escapeHtml(step.title)}</p>` : ''}
      </div>
    </div>
    ${stepDescHtml}
  `;
  card.appendChild(header);

  const resourceSections = buildResourceSections(step);
  const hasResources = resourceSections.length > 0;
  const hasKnowledge = Array.isArray(step.knowledge) && step.knowledge.length > 0;

  const body = document.createElement('div');
  body.className = (hasResources && hasKnowledge) ? 'p-5 grid md:grid-cols-2 gap-6' : 'p-5';

  if (hasKnowledge) {
    const knowledgeCol = document.createElement('div');
    knowledgeCol.innerHTML = `
      <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <i class="fas fa-check-circle text-green-500"></i> ${t('roadmap.keyPoints')}
      </h4>
      <ul class="space-y-2">
        ${(localizedKnowledge(step)).map((k) => `
          <li class="text-sm text-gray-600 flex items-start gap-2 p-2 rounded hover:bg-gray-50 transition">
            <span class="mt-1.5 w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></span>
            <span>${escapeHtml(k)}</span>
          </li>
        `).join('')}
      </ul>
    `;
    body.appendChild(knowledgeCol);
  }

  if (hasResources) {
    const resourceCol = document.createElement('div');
    resourceCol.className = 'bg-gray-50 rounded-lg p-4 border border-gray-200';
    resourceCol.innerHTML = `
      <div class="space-y-5">
        ${resourceSections
          .map((section) =>
            renderResourceSection({
              title: section.title,
              iconClass: section.iconClass,
              iconColorClass: section.iconColorClass,
              items: section.items,
              term,
              context: {
                examId: state.examId,
                domainId: 'all',
                taskId: String(step.id || ''),
                taskTitle: String(localizedTitle(step) || ''),
                resourceSection: String(section.key || ''),
              },
            })
          )
          .join('')}
      </div>
    `;
    body.appendChild(resourceCol);
  }

  card.appendChild(body);
  els.contentArea.appendChild(card);
}

function renderBeginnerGuide({ els, state }) {
  const term = '';

  // Header
  const headerEl = document.createElement('div');
  headerEl.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <span class="px-3 py-1 rounded text-xs font-bold text-white bg-blue-500"><i class="fas fa-graduation-cap mr-1"></i>${t('roadmap.commonTitle')}</span>
      <h2 class="text-xl font-bold text-gray-800">${t('roadmap.commonTitle')}</h2>
    </div>
    <p class="text-gray-600 mb-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
      ${escapeHtml(t('roadmap.commonDescription'))}
    </p>
  `;
  els.contentArea.appendChild(headerEl);

  // Render each common step
  let stepIndex = 1;
  for (const step of COMMON_STEPS) {
    renderStepCard({ els, step, stepIndex: String(stepIndex), state, term });
    stepIndex++;
  }
}

function renderKnowledgeRow({ knowledge, term, taskContext }) {
  const safe = escapeHtml(knowledge);
  const highlighted = highlightHtml(safe, term);
  return `
    <li class="text-sm text-gray-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded hover:bg-gray-50 transition">
      <div class="flex items-start gap-2">
        <span class="mt-1.5 w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></span>
        <span>${highlighted}</span>
      </div>
      <button
        type="button"
        data-action="explain"
        data-term="${safe}"
        data-task-context="${escapeHtml(taskContext || '')}"
        class="text-xs text-purple-600 border border-purple-200 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded flex items-center gap-1 whitespace-nowrap transition"
      >
        <i class="fas fa-sparkles"></i> ${t('quiz.explainBtn')}
      </button>
    </li>
  `;
}

function buildTaskAiContext(task) {
  if (!task || typeof task !== 'object') return '';
  const id = typeof task.id === 'string' ? task.id.trim() : String(task.id || '').trim();
  const jpTitle = typeof task.jpTitle === 'string' ? task.jpTitle.trim() : '';
  const enTitle = typeof task.title === 'string' ? task.title.trim() : '';
  const description = normalizeDescriptionLines(task.description).join('\n');

  const parts = [];
  if (id) parts.push(`Task ${id}`);
  if (jpTitle) parts.push(`JP: ${jpTitle}`);
  if (enTitle) parts.push(`EN: ${enTitle}`);
  if (description) parts.push(`DESC: ${description}`);
  return parts.join(' | ');
}

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

function renderBlogCard({ blog, term, context }) {
  const isRecommended = blog?.recommend === true;
  const titleSafe = escapeHtml(localizedResourceTitle(blog));
  const title = highlightHtml(titleSafe, term);
  const localizedUrl = getLocalizedUrl(blog.url, blog.urlEn);
  const urlSafe = escapeHtml(localizedUrl);
  const noteSafe = escapeHtml(localizedResourceNote(blog));

  const voteTargetId = String(blog.url || '').trim();
  const existing = voteTargetId ? getExistingVote({ targetType: 'resource', targetId: voteTargetId }) : null;
  const goodSelected = existing === 'good';
  const badSelected = existing === 'bad';
  const goodClass = goodSelected
    ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100';
  const badClass = badSelected
    ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100';

  const cardClass = isRecommended
    ? 'recommend-card p-3 rounded shadow-sm border'
    : 'bg-white p-3 rounded shadow-sm border border-gray-100';

  const badge = isRecommended
    ? `
      <span class="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100 border border-orange-200 rounded px-2 py-0.5 whitespace-nowrap">
        ${t('roadmap.recommend')}
      </span>
    `
    : '';

  // Optional technical-level badge (issue #137). Rendered only when the item
  // has a non-empty level; otherwise `levelBadge` is '' so the card output is
  // byte-identical to before. Uses a muted indigo palette so it reads clearly
  // as distinct from the orange recommend badge.
  const levelSafe = escapeHtml(localizedResourceLevel(blog));
  const levelTitle = escapeHtml(t('roadmap.level'));
  const levelBadge = levelSafe
    ? `
      <span class="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 border border-indigo-200 rounded px-2 py-0.5 whitespace-nowrap" title="${levelTitle}" aria-label="${levelTitle}: ${levelSafe}">
        ${levelSafe}
      </span>
    `
    : '';

  return `
    <div class="${cardClass}">
      <div class="flex items-start justify-between gap-3">
        <a data-xp-link="resource" href="${urlSafe}" target="_blank" rel="noopener noreferrer" class="text-sm font-medium text-blue-700 hover:underline flex items-start gap-2 group">
          <span>${title}</span>
          <i class="fas fa-external-link-alt text-xs text-gray-400 group-hover:text-blue-500 mt-1"></i>
        </a>
        <div class="flex items-center gap-2">
          <div data-vote-group class="flex items-center gap-1">
            <button type="button" data-action="vote" data-vote="good" data-vote-target-type="resource" data-vote-target-id="${escapeHtml(voteTargetId)}" data-exam-id="${escapeHtml(context?.examId || '')}" data-domain-id="${escapeHtml(context?.domainId || '')}" data-task-id="${escapeHtml(context?.taskId || '')}" data-task-title="${escapeHtml(context?.taskTitle || '')}" data-resource-section="${escapeHtml(context?.resourceSection || '')}" data-resource-title="${titleSafe}" data-resource-url="${urlSafe}" class="px-2 py-1 border rounded text-xs font-medium transition-colors flex items-center gap-1 ${goodClass}" aria-pressed="${goodSelected ? 'true' : 'false'}" title="${getLocale() === 'ja' ? '役に立った' : 'Helpful'}">
              <i class="fa-regular fa-thumbs-up"></i>
            </button>
            <button type="button" data-action="vote" data-vote="bad" data-vote-target-type="resource" data-vote-target-id="${escapeHtml(voteTargetId)}" data-exam-id="${escapeHtml(context?.examId || '')}" data-domain-id="${escapeHtml(context?.domainId || '')}" data-task-id="${escapeHtml(context?.taskId || '')}" data-task-title="${escapeHtml(context?.taskTitle || '')}" data-resource-section="${escapeHtml(context?.resourceSection || '')}" data-resource-title="${titleSafe}" data-resource-url="${urlSafe}" class="px-2 py-1 border rounded text-xs font-medium transition-colors flex items-center gap-1 ${badClass}" aria-pressed="${badSelected ? 'true' : 'false'}" title="${getLocale() === 'ja' ? '微妙 / 改善してほしい' : 'Not helpful'}">
              <i class="fa-regular fa-thumbs-down"></i>
            </button>
          </div>
          ${levelBadge}
          ${badge}
        </div>
      </div>
      <div class="text-xs text-gray-500 mt-1 flex items-center gap-1">
        <i class="fas fa-info-circle text-gray-400"></i>
        <span>${noteSafe}</span>
      </div>
    </div>
  `;
}

function renderResourceSection({ title, iconClass, iconColorClass, items, term, context }) {
  if (!items || items.length === 0) return '';
  const safeTitle = escapeHtml(title);
  const rows = (items || []).map((blog) => renderBlogCard({ blog, term, context })).join('');
  const icon = iconClass
    ? `<i class="${escapeHtml(iconClass)} ${escapeHtml(iconColorClass || '')}"></i>`
    : '';
  return `
    <section>
      <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        ${icon} ${safeTitle}
      </h4>
      <div class="space-y-3">
        ${rows}
      </div>
    </section>
  `;
}

function buildResourceSections(task) {
  const nested = task?.resources;
  if (!Array.isArray(nested) || nested.length === 0) return [];

  const sections = [];
  for (const rawGroup of nested) {
    if (!rawGroup || typeof rawGroup !== 'object') continue;

    // Apply shared presentation defaults (issue #11). This is opt-in and
    // non-destructive: a group whose `key` is a known common one (e.g.
    // blackbelts/docs/blogs) may OMIT iconClass/iconColorClass/label/labelEn
    // and the common default is filled in here. Explicit fields on the group
    // always win over the defaults, so existing exams render identically.
    const group = applyResourceGroupDefaults(rawGroup);

    const key = String(group.key || group.id || group.type || '').trim();
    const title = String(localizedResourceLabel(group) || group.label || group.title || '').trim() || (key ? humanizeKey(key) : 'Resources');
    const iconClass = typeof group.iconClass === 'string' ? group.iconClass : '';
    const iconColorClass = typeof group.iconColorClass === 'string' ? group.iconColorClass : '';

    const rawItems = group.items || group.links || group.resources || [];
    const items = uniqByUrl(normalizeResourceItems(rawItems));
    if (!items.length) continue;

    sections.push({ key, title, iconClass, iconColorClass, items });
  }

  return sections;
}

function normalizeResourceItems(items) {
  return (items || [])
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      title: String(item.title || ''),
      titleEn: item.titleEn ? String(item.titleEn) : undefined,
      url: String(item.url || ''),
      urlEn: item.urlEn ? String(item.urlEn) : undefined,
      note: String(item.note || ''),
      noteEn: item.noteEn ? String(item.noteEn) : undefined,
      // Optional AWS technical-level annotation (issue #137). Numeric AWS
      // levels like 'Level 200' are language-neutral, so most items set only
      // `level`; `levelEn` is optional for cases needing different phrasing.
      level: item.level ? String(item.level) : undefined,
      levelEn: item.levelEn ? String(item.levelEn) : undefined,
      recommend: item.recommend === true,
    }))
    .filter((item) => item.title && item.url);
}

function uniqByUrl(items) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    if (!item || !item.url) continue;
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    out.push(item);
  }
  return out;
}

function humanizeKey(key) {
  return String(key)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function highlightHtml(escapedText, termLower) {
  if (!termLower) return escapedText;
  const t = escapeRegExp(termLower);
  const regex = new RegExp(`(${t})`, 'gi');
  return escapedText.replace(regex, '<span class="bg-yellow-200 font-semibold">$1</span>');
}

// --- Feedback ---
const FEEDBACK_MAX_LENGTH = 1000;

// In-memory list of images the user attached to the current feedback draft.
// Each entry: { file, url } where `url` is an object URL used only for the
// preview thumbnail. Bytes are NEVER uploaded anywhere — GitHub's tokenless
// prefilled new-issue URL cannot carry attachments, so the user is guided to
// paste the images into the opened issue instead. The list is cleared (and its
// object URLs revoked) on modal open/close to avoid leaks.
let feedbackImages = [];

function wireFeedbackHandlers({ els }) {
  if (!els.feedbackBtn || !els.feedbackModal) return;

  els.feedbackBtn.addEventListener('click', () => openFeedbackModal(els));

  els.feedbackTextarea?.addEventListener('input', () => {
    updateFeedbackCharCount(els);
  });

  els.feedbackSubmitBtn?.addEventListener('click', () => {
    submitFeedback(els);
  });

  // #101: copy-only path so users WITHOUT a GitHub account can still send
  // feedback (they copy the composed text and share it however they like).
  els.feedbackCopyBtn?.addEventListener('click', () => {
    copyFeedbackText(els);
  });

  // Allow Ctrl+Enter / Cmd+Enter to submit
  els.feedbackTextarea?.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitFeedback(els);
    }
  });

  // Image attach affordances (#81). Files are kept in memory only for preview;
  // they are never uploaded (static site, no backend / AWS out of bounds).
  els.feedbackImageTrigger?.addEventListener('click', () => {
    els.feedbackImageInput?.click();
  });

  els.feedbackImageInput?.addEventListener('change', () => {
    addFeedbackImages(els, els.feedbackImageInput.files);
    // Reset so selecting the same file again still fires `change`.
    els.feedbackImageInput.value = '';
  });

  // Paste images (e.g. screenshots) directly into the textarea.
  els.feedbackTextarea?.addEventListener('paste', (e) => {
    const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length) {
      e.preventDefault();
      addFeedbackImages(els, files);
    }
  });

  // Drag-and-drop onto the dropzone trigger.
  els.feedbackImageTrigger?.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.feedbackImageTrigger.classList.add('border-teal-400', 'text-teal-600');
  });
  els.feedbackImageTrigger?.addEventListener('dragleave', () => {
    els.feedbackImageTrigger.classList.remove('border-teal-400', 'text-teal-600');
  });
  els.feedbackImageTrigger?.addEventListener('drop', (e) => {
    e.preventDefault();
    els.feedbackImageTrigger.classList.remove('border-teal-400', 'text-teal-600');
    const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length) addFeedbackImages(els, files);
  });
}

// Add image File objects to the in-memory list and re-render the previews.
function addFeedbackImages(els, fileList) {
  const files = Array.from(fileList || []).filter((f) => f && f.type && f.type.startsWith('image/'));
  if (!files.length) return;
  files.forEach((file) => {
    feedbackImages.push({ file, url: URL.createObjectURL(file) });
  });
  renderFeedbackImagePreviews(els);
}

// Remove a single attached image (by index), revoking its object URL.
function removeFeedbackImage(els, index) {
  const entry = feedbackImages[index];
  if (!entry) return;
  try {
    URL.revokeObjectURL(entry.url);
  } catch {
    // ignore
  }
  feedbackImages.splice(index, 1);
  renderFeedbackImagePreviews(els);
}

// Clear all attached images and revoke their object URLs to avoid leaks.
function clearFeedbackImages(els) {
  feedbackImages.forEach((entry) => {
    try {
      URL.revokeObjectURL(entry.url);
    } catch {
      // ignore
    }
  });
  feedbackImages = [];
  if (els?.feedbackImagePreview) els.feedbackImagePreview.innerHTML = '';
}

// Render thumbnail previews with a per-thumbnail remove button.
function renderFeedbackImagePreviews(els) {
  const container = els?.feedbackImagePreview;
  if (!container) return;
  container.innerHTML = '';
  feedbackImages.forEach((entry, index) => {
    const wrap = document.createElement('div');
    wrap.className = 'relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50';

    const img = document.createElement('img');
    img.src = entry.url;
    img.alt = entry.file?.name || 'image';
    img.className = 'w-full h-full object-cover';
    wrap.appendChild(img);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'absolute top-0 right-0 bg-black/60 hover:bg-black/80 text-white w-5 h-5 flex items-center justify-center text-xs rounded-bl-lg focus:outline-none';
    removeBtn.setAttribute('aria-label', t('feedbackModal.imageRemove'));
    removeBtn.title = t('feedbackModal.imageRemove');
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', () => removeFeedbackImage(els, index));
    wrap.appendChild(removeBtn);

    container.appendChild(wrap);
  });
}

function openFeedbackModal(els) {
  if (!els.feedbackModal) return;
  if (els.feedbackTextarea) els.feedbackTextarea.value = '';
  if (els.feedbackCategorySelect) els.feedbackCategorySelect.value = 'general';
  els.feedbackMessage?.classList?.add('hidden');
  // Start every session with a clean image list (revokes any stale URLs).
  clearFeedbackImages(els);
  updateFeedbackCharCount(els);
  openModal(els.feedbackModal);
  setTimeout(() => els.feedbackTextarea?.focus(), 0);
}

function updateFeedbackCharCount(els) {
  if (!els.feedbackCharCount || !els.feedbackTextarea) return;
  const len = (els.feedbackTextarea.value || '').length;
  els.feedbackCharCount.textContent = `${len} / ${FEEDBACK_MAX_LENGTH}`;
  els.feedbackCharCount.classList.toggle('text-orange-500', len > FEEDBACK_MAX_LENGTH * 0.95);
  els.feedbackCharCount.classList.toggle('text-gray-400', len <= FEEDBACK_MAX_LENGTH * 0.95);
}

// Compose the issue title/body from the user's feedback text + category.
// Shared by the GitHub-issue submit path and the account-free copy path (#101)
// so both produce identical, correctly-escaped content.
function composeFeedbackIssue({ text, category }) {
  const feedbackText = String(text).slice(0, FEEDBACK_MAX_LENGTH);
  const categoryLabel = t(`feedbackModal.categories.${feedbackCategoryI18nKey(category)}`);
  const issueTitle = t('feedbackModal.issueTitle', { category: categoryLabel });
  // Interpolate the user-controlled `text` LAST (category first) so that any
  // literal `{{...}}` sequence inside the user's feedback is never re-scanned
  // by a subsequent replacement pass. t() substitutes params in object-key
  // order, so key order here is load-bearing.
  let issueBody = t('feedbackModal.issueBody', { category: categoryLabel, text: feedbackText });
  // When images are attached (#81), append a marker line so the user knows
  // where to paste them in the opened GitHub issue. The bytes are never
  // uploaded — GitHub's tokenless prefilled URL cannot carry attachments, so
  // GitHub itself auto-uploads images when the user pastes/drops them.
  if (feedbackImages.length > 0) {
    issueBody += `\n\n${t('feedbackModal.issueImageMarker', { count: feedbackImages.length })}`;
  }
  return { issueBody, categoryLabel, issueTitle };
}

// #101: account-free path. Copy the composed feedback text to the clipboard so
// a user who does not have (or does not want to use) a GitHub account can send
// it by any channel they prefer, without ever opening the GitHub issue screen.
function copyFeedbackText(els) {
  const text = String(els.feedbackTextarea?.value || '').trim();
  const category = String(els.feedbackCategorySelect?.value || 'general');

  if (!text) {
    showInlineMessage(els.feedbackMessage, t('feedbackModal.validationEmpty'), 'text-red-600');
    return;
  }
  if (text.length > FEEDBACK_MAX_LENGTH) {
    showInlineMessage(els.feedbackMessage, t('feedbackModal.validationLength'), 'text-red-600');
    return;
  }

  const { issueBody } = composeFeedbackIssue({ text, category });
  copyTextToClipboard(issueBody)
    .then((ok) => {
      showInlineMessage(
        els.feedbackMessage,
        t(ok ? 'feedbackModal.copied' : 'feedbackModal.copyFailed'),
        ok ? 'text-teal-600' : 'text-red-600',
      );
    })
    .catch(() => {
      showInlineMessage(els.feedbackMessage, t('feedbackModal.copyFailed'), 'text-red-600');
    });
}

function submitFeedback(els) {
  const text = String(els.feedbackTextarea?.value || '').trim();
  const category = String(els.feedbackCategorySelect?.value || 'general');

  if (!text) {
    showInlineMessage(els.feedbackMessage, t('feedbackModal.validationEmpty'), 'text-red-600');
    return;
  }
  if (text.length > FEEDBACK_MAX_LENGTH) {
    showInlineMessage(els.feedbackMessage, t('feedbackModal.validationLength'), 'text-red-600');
    return;
  }

  // Compose a prefilled GitHub Issue and open it in a new tab on this explicit
  // user click (static site => no token => tokenless prefilled URL pattern,
  // same as the X/tweet share). Never auto-popup.
  const { issueBody, categoryLabel, issueTitle } = composeFeedbackIssue({ text, category });
  const hasImages = feedbackImages.length > 0;
  const labels = ['feedback', categoryToIssueLabel(category)].filter(Boolean);
  const issueUrl = buildGitHubIssueUrl({ title: issueTitle, body: issueBody, labels });

  // #79: the prefilled issue URL already carries the composed body, so the
  // primary hand-off is the opened GitHub page below. We also copy the body to
  // the clipboard as a backup so the user can re-paste it if GitHub truncates
  // an over-long prefilled URL. Best-effort: a copy failure must never block
  // opening the issue. Fire-and-forget so the window.open below stays inside
  // the user-gesture call stack and popup blockers don't trip.
  copyTextToClipboard(issueBody).catch(() => {});

  window.open(issueUrl, '_blank', 'noopener,noreferrer');

  const sentKey = hasImages ? 'feedbackModal.sentWithImages' : 'feedbackModal.sent';
  showInlineMessage(els.feedbackMessage, t(sentKey), 'text-teal-600');
  if (els.feedbackTextarea) els.feedbackTextarea.value = '';
  clearFeedbackImages(els);
  updateFeedbackCharCount(els);

  // Award a modest XP bonus for submitting feedback, capped to once per day so
  // it cannot be farmed by repeated submissions. The XP award is best-effort;
  // any failure here must never block the feedback UX above.
  try {
    const today = feedbackLocalDayString();
    let lastAwardedDay = '';
    try {
      lastAwardedDay = localStorage.getItem(FEEDBACK_XP_DAY_KEY) || '';
    } catch {
      lastAwardedDay = '';
    }
    if (lastAwardedDay !== today) {
      const result = addXp({ amount: XP_RULES.feedback, reason: 'feedback' });
      try {
        localStorage.setItem(FEEDBACK_XP_DAY_KEY, today);
      } catch {
        // ignore storage write failures
      }
      if (result?.unlocked?.length) {
        showMilestoneToast({ els, unlocked: result.unlocked });
      }
    }
  } catch {
    // ignore XP award failures — feedback submission already succeeded
  }

  // Auto-close after a short delay
  setTimeout(() => {
    closeModal(els.feedbackModal);
    els.feedbackMessage?.classList?.add('hidden');
  }, 1500);
}

// Map a feedback category <option> value to its i18n category label key under
// feedbackModal.categories.*. Falls back to 'general'.
function feedbackCategoryI18nKey(category) {
  const map = {
    general: 'general',
    resource_request: 'resources',
    feature_request: 'feature',
    bug_report: 'bug',
    ai_quality: 'aiQuality',
    ui_ux: 'ui',
    other: 'other',
  };
  return map[String(category || '')] || 'general';
}

// Map a feedback category to an extra GitHub Issue label. Bug reports use `bug`,
// feature requests use `enhancement`; everything else has no extra label (the
// `feedback` label is always applied by the caller).
function categoryToIssueLabel(category) {
  switch (String(category || '')) {
    case 'bug_report':
      return 'bug';
    case 'feature_request':
      return 'enhancement';
    default:
      return '';
  }
}

// --- Modals + AI actions ---
function openSettingsModal(els) {
  const geminiKey = getApiKey();
  if (geminiKey) els.apiKeyInput.value = geminiKey;
  const openaiKey = getOpenAiApiKey();
  if (openaiKey && els.openaiKeyInput) els.openaiKeyInput.value = openaiKey;
  els.settingsMessage.classList.add('hidden');
  reflectProviderUi(els);
  openModal(els.settingsModal);
}

function openModal(modalEl) {
  modalEl.style.display = 'block';
}

function closeModal(modalEl) {
  modalEl.style.display = 'none';
  // Per-modal teardown so closing via the X button, Cancel button, backdrop,
  // or a programmatic close all run the same cleanup. The feedback modal holds
  // attached-image object URLs that must be revoked on every close path, not
  // just on the next open. Otherwise cancelling with images attached leaks
  // them until the modal is reopened (#81).
  if (modalEl?.id === 'feedbackModal') {
    clearFeedbackImages({ feedbackImagePreview: document.getElementById('feedbackImagePreview') });
  }
}

// --- AI Provider UI ---
function wireAiProviderSwitch(els) {
  if (!els.aiProviderSwitch) return;
  els.aiProviderSwitch.querySelectorAll('button[data-provider]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const provider = btn.dataset.provider;
      setAiProvider(provider);
      reflectProviderUi(els);
    });
  });
}

function reflectProviderUi(els) {
  const provider = getAiProvider();

  // Highlight active toggle button
  if (els.aiProviderSwitch) {
    els.aiProviderSwitch.querySelectorAll('button[data-provider]').forEach((btn) => {
      const isActive = btn.dataset.provider === provider;
      btn.classList.toggle('bg-blue-600', isActive);
      btn.classList.toggle('text-white', isActive);
      btn.classList.toggle('bg-white', !isActive);
      btn.classList.toggle('text-gray-600', !isActive);
      btn.classList.toggle('hover:bg-gray-100', !isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  }

  // Show/hide relevant key sections (both always visible, but active one gets highlight)
  if (els.geminiKeySection) {
    els.geminiKeySection.classList.toggle('opacity-40', provider !== 'gemini');
  }
  if (els.openaiKeySection) {
    els.openaiKeySection.classList.toggle('opacity-40', provider !== 'openai');
  }
}

// --- Theme (Dark Mode) ---
function applyTheme() {
  const effective = getEffectiveTheme();
  if (effective === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function reflectThemeToggleIcon(els) {
  if (!els.themeToggleIcon) return;
  const current = getTheme();
  // Update icon: sun for light, moon for dark, laptop for system
  // Use setAttribute because Font Awesome may replace <i> with <svg> (SVG className is read-only)
  const newClass = current === 'dark'
    ? 'fas fa-moon text-yellow-300 group-hover:text-yellow-200'
    : current === 'light'
      ? 'fas fa-sun text-yellow-300 group-hover:text-yellow-200'
      : 'fas fa-laptop text-gray-300 group-hover:text-white';
  els.themeToggleIcon.setAttribute('class', newClass);
}

function wireThemeSwitch(els) {
  if (!els.themeToggleBtn) return;

  // Cycle through: light → dark → system → light ...
  // Skip states that produce the same visual result as the current effective theme
  els.themeToggleBtn.addEventListener('click', () => {
    const current = getTheme();
    const effectiveBefore = getEffectiveTheme();
    let next;
    if (current === 'light') {
      next = 'dark';
    } else if (current === 'dark') {
      next = 'system';
    } else {
      // 'system' — skip to the opposite of what system currently shows
      next = effectiveBefore === 'dark' ? 'light' : 'dark';
    }
    setTheme(next);
    applyTheme();
    reflectThemeToggleIcon(els);
  });

  // Listen for OS theme changes (relevant when preference is 'system')
  if (typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (getTheme() === 'system') {
        applyTheme();
      }
    });
  }
}

function showAiModal(els, title, isLoading) {
  els.modalTitle.textContent = title;
  openModal(els.aiModal);

  // Always reset quiz interactive area on new modal open
  if (els.quizArea) els.quizArea.classList.add('hidden');
  if (els.quizResult) els.quizResult.classList.add('hidden');
  if (els.quizNextBtn) els.quizNextBtn.classList.add('hidden');

  if (isLoading) {
    els.modalLoading.classList.remove('hidden');
    els.modalContent.textContent = '';
    els.modalContent.innerHTML = '';
    if (els.modalContent?.dataset) {
      delete els.modalContent.dataset.aiCopyText;
    }
    resetAiCopyButton(els);
    if (els.aiRetryBtn) {
      els.aiRetryBtn.disabled = true;
      els.aiRetryBtn.classList.add('opacity-60', 'cursor-not-allowed');
    }
  }
}

function normalizeMarkdownForJapanese(markdown) {
  const input = String(markdown ?? '');

  // Japanese IMEs/editors sometimes emit:
  // - Fullwidth asterisk: U+FF0A '＊' (looks like '*')
  // - Zero-width space/BOM around delimiters
  // These can prevent Markdown emphasis parsing (e.g. **「...」** / ＊＊「...」＊＊).
  // To avoid breaking code samples, we normalize only outside fenced/inline code.

  const FENCE_RE = /(^|\n)( {0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2\3[ \t]*($|\n)/g;
  const CODE_SPAN_RE = /`+[^`]*?`+/g;

  function normalizeTextSegment(segment) {
    let s = segment
      .replaceAll('\u200B', '')
      .replaceAll('\uFEFF', '')
      .replaceAll('\u200C', '')
      .replaceAll('\u2060', '')
      .replaceAll('＊', '*');

    // Fix emphasis broken by spaces/invisible chars adjacent to Japanese brackets.
    // CommonMark forbids whitespace right after opening ** or right before closing **.
    // AI models sometimes output: ** 「text」 ** instead of **「text」**
    s = s.replace(/(\*{2,3})[ \t\u00A0\u3000]+([「【（『])/g, '$1$2');
    s = s.replace(/([」】）』])[ \t\u00A0\u3000]+(\*{2,3})/g, '$1$2');

    return s;
  }

  function normalizeOutsideCode(segment) {
    // Preserve inline code spans as-is.
    return segment.replace(CODE_SPAN_RE, (codeSpan) => `\u0000${codeSpan}\u0000`).split('\u0000').map((part) => {
      if (part.startsWith('`')) return part;
      return normalizeTextSegment(part);
    }).join('');
  }

  // Preserve fenced code blocks as-is.
  let out = '';
  let lastIndex = 0;
  for (const match of input.matchAll(FENCE_RE)) {
    const index = match.index ?? 0;
    out += normalizeOutsideCode(input.slice(lastIndex, index));
    out += match[0];
    lastIndex = index + match[0].length;
  }
  out += normalizeOutsideCode(input.slice(lastIndex));
  return out;
}

let __markedConfigured = false;

function configureMarkedOnce(marked) {
  if (__markedConfigured) return;
  if (!marked || typeof marked.setOptions !== 'function') return;
  try {
    // keep it simple: gfm + line breaks
    marked.setOptions({ gfm: true, breaks: true });
    __markedConfigured = true;
  } catch {
    // ignore
  }
}

/**
 * Extract distinct AWS official documentation URLs (https://docs.aws.amazon.com/...)
 * from a text blob, preserving first-seen order and de-duplicating.
 */
function extractAwsDocUrls(text) {
  const urls = [];
  const seen = new Set();
  const re = /https:\/\/docs\.aws\.amazon\.com\/[^\s<>()"'`）】」、。]+/g;
  const source = String(text ?? '');
  let match;
  while ((match = re.exec(source)) !== null) {
    // Trim trailing punctuation that commonly abuts a URL in prose.
    const url = match[0].replace(/[.,;:!?]+$/, '');
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
  return urls;
}

/**
 * Render a distinct "Sources / 出典" block listing AWS official documentation
 * citations found in the quiz explanation. Built entirely from DOM nodes with
 * textContent + href (no raw innerHTML of untrusted strings) to avoid XSS.
 * Idempotent: any previously rendered block in the container is removed first.
 */
function renderQuizSources(container, explanation) {
  if (!container) return;
  // Remove any prior sources block (re-render on each new question).
  container.querySelector('[data-quiz-sources]')?.remove();

  const urls = extractAwsDocUrls(explanation);
  if (urls.length === 0) return;

  const wrap = document.createElement('div');
  wrap.setAttribute('data-quiz-sources', '');
  wrap.className = 'mt-3 pt-3 border-t border-gray-200';

  const heading = document.createElement('div');
  heading.className = 'text-xs font-bold text-gray-500 uppercase tracking-wide mb-1';
  heading.textContent = t('quiz.sourcesLabel');
  wrap.appendChild(heading);

  const list = document.createElement('ul');
  list.className = 'space-y-1';
  for (const url of urls) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    a.textContent = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.className = 'text-xs text-blue-700 hover:underline break-all';
    li.appendChild(a);
    list.appendChild(li);
  }
  wrap.appendChild(list);
  container.appendChild(wrap);
}

function renderMarkdownToSafeHtml(markdown) {
  const md = normalizeMarkdownForJapanese(markdown);

  const marked = typeof window !== 'undefined' ? window.marked : undefined;
  const DOMPurify = typeof window !== 'undefined' ? window.DOMPurify : undefined;

  if (!marked || typeof marked.parse !== 'function' || !DOMPurify || typeof DOMPurify.sanitize !== 'function') {
    return { html: '', usedMarkdown: false };
  }

  configureMarkedOnce(marked);

  const rawHtml = marked.parse(md);
  const cleanHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
  return { html: cleanHtml, usedMarkdown: true };
}

function updateAiModalContent(els, text) {
  els.modalLoading.classList.add('hidden');
  if (els.aiRetryBtn) {
    els.aiRetryBtn.disabled = false;
    els.aiRetryBtn.classList.remove('opacity-60', 'cursor-not-allowed');
  }

  const disclaimer = t('aiDisclaimer');

  const baseText = String(text ?? '');
  const shouldAppend = baseText && !baseText.includes(disclaimer.slice(0, 20));
  const md = shouldAppend ? `${baseText}\n\n---\n\n> ${disclaimer.replaceAll('\n', '\n> ')}` : baseText;

  if (els.modalContent?.dataset) {
    els.modalContent.dataset.aiCopyText = md;
  }
  setAiCopyButtonEnabled(els, Boolean(md.trim()));

  const { html, usedMarkdown } = renderMarkdownToSafeHtml(md);
  if (usedMarkdown) {
    els.modalContent.innerHTML = html;
    // Ensure links open safely in a new tab
    els.modalContent.querySelectorAll('a').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
    return;
  }

  // Fallback: plain text
  els.modalContent.textContent = shouldAppend ? `${baseText}\n\n---\n${disclaimer}` : baseText;
}

function updateAiModalContentStreaming(els, partialText) {
  // While streaming, keep it simple (plain text). We'll render Markdown + disclaimer once the stream completes.
  els.modalLoading.classList.add('hidden');
  const t = String(partialText ?? '');
  els.modalContent.textContent = t;
  if (els.modalContent?.dataset) {
    els.modalContent.dataset.aiCopyText = t;
  }
  setAiCopyButtonEnabled(els, Boolean(t.trim()));
}

async function explainTerm({ els, exam, term, taskContext }) {
  if (!getApiKey() && !getOpenAiApiKey()) {
    openSettingsModal(els);
    return;
  }

  const providerLabel = getActiveProviderLabel();
  showAiModal(els, `${getLocale() === 'ja' ? '用語解説' : 'Explain'}: ${term}`, true);

  const systemPrompt =
    `${exam.code}（${exam.shortLabel}）の初学者に向けて、` +
    `指定されたAWS/技術用語を「腹落ち」するように解説してください。辞書的な定義の丸写しではなく、` +
    `具体的な説明を心がけて、初心者でも納得して理解できるようにしてください。` +
    `出力はMarkdownで、見出しと箇条書きを使って読みやすくしてください。` +
    `また、説明の中で新しい用語（初学者がつまずきやすい関連用語）を出す場合は、` +
    `初出に短い補足（括弧で5〜15字程度）を付けるか、最後に「ミニ用語集」で必ず説明してください。\n\n` +
    `【信頼性ルール】\n` +
    `- AWS公式ドキュメントに記載がある情報のみに基づいて説明してください。\n` +
    `- 推測や不確実な情報は含めないでください。分からない場合は「公式ドキュメントを参照してください」と明示してください。\n` +
    `- 解説の最後に「📚 参考ドキュメント」セクションを設け、関連するAWS公式ドキュメントのURLを1〜3件記載してください。`;

  const contextPrompt = taskContext
    ? `\n\n【タスク文脈】\n${taskContext}`
    : '';

  const userPrompt = `用語: 「${term}」について、「AWS」の文脈で解説してください。`;

  let response = await callAiStream({
    userPrompt,
    systemPrompt: systemPrompt + contextPrompt,
    onRequireApiKey: () => openSettingsModal(els),
    onTextDelta: (_delta, fullText) => updateAiModalContentStreaming(els, fullText),
  });

  // Fallback to non-streaming when the runtime doesn't support streams/SSE.
  if (String(response || '').includes('ストリーミングに対応していない環境')) {
    response = await callAi({
      userPrompt,
      systemPrompt: systemPrompt + contextPrompt,
      onRequireApiKey: () => openSettingsModal(els),
    });
  }

  if (response) updateAiModalContent(els, response);
  return isSuccessfulAiResponse(response);
}

async function generateQuiz({ els, exam, taskTitle, taskContext, session, isDashboardQuiz, domainId }) {
  if (!getApiKey() && !getOpenAiApiKey()) {
    openSettingsModal(els);
    return;
  }

  const config = session ? QUIZ_MODE_CONFIG[session.mode] || QUIZ_MODE_CONFIG.single : null;
  const modalTitle = config && session && session.questionCount > 1
    ? `${localizedModeLabel(config)}: ${taskTitle}`
    : `${getLocale() === 'ja' ? '模擬問題' : 'Quiz'}: ${taskTitle}`;

  showAiModal(els, modalTitle, true);

  // Hide quiz-specific UI while loading
  resetQuizUi(els);

  const systemPrompt = (session && session.mode === 'mock')
    ? buildMockQuizSystemPrompt(exam.code, exam.shortLabel, getExamLevel(session.examId))
    : buildQuizSystemPrompt(exam.code, exam.shortLabel);
  const userPrompt = isDashboardQuiz
    ? buildGeneralQuizUserPrompt(exam.code, null)
    : buildQuizUserPrompt(taskTitle, taskContext);

  let response = '';
  let fullText = '';

  try {
    response = await callAiStream({
      userPrompt,
      systemPrompt,
      onRequireApiKey: () => openSettingsModal(els),
      onTextDelta: (_delta, text) => {
        fullText = text;
        updateAiModalContentStreaming(els, text);
      },
    });

    if (String(response || '').includes('ストリーミングに対応していない環境')) {
      response = await callAi({
        userPrompt,
        systemPrompt,
        onRequireApiKey: () => openSettingsModal(els),
      });
    }
  } catch (err) {
    updateAiModalContent(els, `エラーが発生しました: ${err.message || err}`);
    return false;
  }

  if (!isSuccessfulAiResponse(response)) {
    if (response) updateAiModalContent(els, response);
    return false;
  }

  // Try to parse as interactive quiz
  const parsed = parseQuizResponse(response);

  if (parsed) {
    parsed.domainId = domainId ?? null;
    // Render interactive quiz UI
    renderInteractiveQuiz({ els, quiz: parsed });
    return true;
  }

  // Fallback: show as plain markdown (old format)
  updateAiModalContent(els, response);
  return true;
}

function showQuizSummary({ els, session }) {
  if (!session) return;
  const summary = getSessionSummary(session);
  const config = QUIZ_MODE_CONFIG[session.mode] || QUIZ_MODE_CONFIG.single;

  // Hide question area, show summary
  if (els.quizQuestion) els.quizQuestion.classList.add('hidden');
  if (els.quizChoices) els.quizChoices.classList.add('hidden');
  if (els.quizResult) els.quizResult.classList.add('hidden');
  if (els.quizNextBtn) els.quizNextBtn.classList.add('hidden');
  if (els.quizProgressBar) els.quizProgressBar.classList.add('hidden');

  // Emoji & title based on accuracy
  const acc = summary.accuracy;
  let emoji = '🎉';
  let title = t('quiz.complete');
  if (acc >= 0.9) { emoji = '🏆'; title = t('quiz.summaryExcellent'); }
  else if (acc >= 0.7) { emoji = '🎉'; title = t('quiz.summaryGood'); }
  else if (acc >= 0.5) { emoji = '💪'; title = t('quiz.summaryOkay'); }
  else { emoji = '📚'; title = t('quiz.summaryReview'); }

  if (els.quizSummaryEmoji) els.quizSummaryEmoji.textContent = emoji;
  if (els.quizSummaryTitle) els.quizSummaryTitle.textContent = title;
  if (els.quizSummarySubtitle) els.quizSummarySubtitle.textContent = t('quiz.summarySubtitle', { label: localizedModeLabel(config), total: summary.total });

  if (els.quizSumCorrect) els.quizSumCorrect.textContent = String(summary.correct);
  if (els.quizSumTotal) els.quizSumTotal.textContent = String(summary.total);
  if (els.quizSumAccuracy) els.quizSumAccuracy.textContent = `${Math.round(summary.accuracy * 100)}%`;
  if (els.quizSumXp) els.quizSumXp.textContent = String(summary.totalXp);
  if (els.quizSumCombo) els.quizSumCombo.textContent = String(summary.maxCombo);

  // Time display
  if (session.startedAt && session.finishedAt) {
    const elapsed = Math.round((session.finishedAt - session.startedAt) / 1000);
    if (els.quizSumTime) els.quizSumTime.classList.remove('hidden');
    if (els.quizSumTimeValue) els.quizSumTimeValue.textContent = formatTime(elapsed);
  } else if (config.timeLimitSec > 0 && session.startedAt) {
    const elapsed = Math.round((Date.now() - session.startedAt) / 1000);
    if (els.quizSumTime) els.quizSumTime.classList.remove('hidden');
    if (els.quizSumTimeValue) els.quizSumTimeValue.textContent = formatTime(elapsed);
  }

  if (els.quizSummary) els.quizSummary.classList.remove('hidden');

  // Explanation review: render all Q/A pairs
  if (els.quizSumExplanations && session.questions.length > 1) {
    els.quizSumExplanations.classList.remove('hidden');
    if (els.quizSumExplanationsList) {
      els.quizSumExplanationsList.innerHTML = session.questions.map((q, i) => {
        if (!q) return '';
        const userAnswer = session.answers[i];
        const isCorrect = userAnswer === q.correctIndex;
        const icon = userAnswer === -1 ? '⏭️' : isCorrect ? '✅' : '❌';
        const userLetter = userAnswer >= 0 ? indexToLetter(userAnswer) : '未回答';
        const correctLetter = indexToLetter(q.correctIndex);
        return `
          <div class="rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} p-3">
            <div class="flex items-start gap-2 mb-2">
              <span class="text-sm">${icon}</span>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-bold text-gray-500 mb-1">Q${i + 1}</div>
                <div class="text-sm text-gray-800 font-medium">${escapeHtml(q.question)}</div>
              </div>
            </div>
            <div class="text-xs text-gray-600 ml-6 mb-1">
              あなたの回答: <span class="font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}">${userLetter}</span>
              ${!isCorrect ? ` / 正解: <span class="font-bold text-green-700">${correctLetter}</span>` : ''}
            </div>
            ${q.explanation ? `<div class="text-xs text-gray-700 ml-6 mt-2 p-2 bg-white bg-opacity-60 rounded">${escapeHtml(q.explanation)}</div>` : ''}
          </div>
        `.trim();
      }).join('');
    }
  }

  // Show "Schedule Review" button if there were wrong answers
  const wrongQuestions = session.questions.filter((q, i) => q && session.answers[i] !== q.correctIndex);
  if (els.quizSumScheduleReview && wrongQuestions.length > 0) {
    els.quizSumScheduleReview.classList.remove('hidden');
    if (els.scheduleReviewMsg) els.scheduleReviewMsg.classList.add('hidden');
  }

  // Offer a share affordance after a strong practice (mock) exam result (issue #33).
  // Threshold: mock mode + accuracy >= 80% (a good, shareable score). The button
  // itself opens the X intent URL on click, never as an auto popup.
  const SCORE_SHARE_THRESHOLD = 0.8;
  if (els.quizSumShareScore) {
    const shareable = session.mode === 'mock' && acc >= SCORE_SHARE_THRESHOLD;
    els.quizSumShareScore.classList.toggle('hidden', !shareable);
  }
}

function resetQuizUi(els) {
  if (els.quizArea) els.quizArea.classList.add('hidden');
  if (els.quizResult) els.quizResult.classList.add('hidden');
  if (els.quizComboDisplay) els.quizComboDisplay.classList.add('hidden');
  if (els.quizChoices) els.quizChoices.innerHTML = '';
  if (els.quizQuestion) els.quizQuestion.textContent = '';
  if (els.quizExplanation) els.quizExplanation.innerHTML = '';
  if (els.quizNextBtn) els.quizNextBtn.classList.add('hidden');

  // Reset mode-specific elements
  if (els.quizPregenOverlay) els.quizPregenOverlay.classList.add('hidden');
  if (els.quizPartialNotice) els.quizPartialNotice.classList.add('hidden');
  if (els.quizPartialNoticeText) els.quizPartialNoticeText.textContent = '';
  if (els.quizTimerDisplay) els.quizTimerDisplay.classList.add('hidden');
  if (els.quizProgressBar) els.quizProgressBar.classList.add('hidden');
  if (els.quizProgressFill) els.quizProgressFill.style.width = '0%';
  if (els.quizSummary) els.quizSummary.classList.add('hidden');
  if (els.quizSumTime) els.quizSumTime.classList.add('hidden');
  if (els.quizModeLabel) els.quizModeLabel.textContent = '';
  if (els.quizSessionProgress) els.quizSessionProgress.textContent = '';

  // Reset explanation review
  if (els.quizSumExplanations) els.quizSumExplanations.classList.add('hidden');
  if (els.quizSumExplanationsList) els.quizSumExplanationsList.innerHTML = '';
  if (els.quizSumExplanationsArrow) els.quizSumExplanationsArrow.style.transform = '';

  // Reset share-score affordance (issue #33)
  if (els.quizSumShareScore) els.quizSumShareScore.classList.add('hidden');
}

function renderInteractiveQuiz({ els, quiz }) {
  // Store reference for answer handling
  // `currentParsedQuiz` is accessible via closure in initApp
  if (typeof window !== 'undefined') {
    window.__currentParsedQuiz = quiz;
  }

  els.modalLoading?.classList.add('hidden');
  if (els.aiRetryBtn) {
    els.aiRetryBtn.disabled = false;
    els.aiRetryBtn.classList.remove('opacity-60', 'cursor-not-allowed');
  }

  // Hide the plain-text content, show quiz area
  if (els.modalContent) els.modalContent.innerHTML = '';
  if (els.quizArea) els.quizArea.classList.remove('hidden');
  if (els.quizResult) els.quizResult.classList.add('hidden');
  if (els.quizNextBtn) els.quizNextBtn.classList.add('hidden');
  if (els.quizSummary) els.quizSummary.classList.add('hidden');
  if (els.quizComboDisplay) els.quizComboDisplay.classList.add('hidden');

  // Make sure question/choices are visible (may have been hidden during pregen)
  if (els.quizQuestion) els.quizQuestion.classList.remove('hidden');
  if (els.quizChoices) els.quizChoices.classList.remove('hidden');

  // Render question
  if (els.quizQuestion) {
    els.quizQuestion.textContent = quiz.question;
  }

  // Render choices as buttons
  if (els.quizChoices) {
    els.quizChoices.innerHTML = quiz.choices.map((choice, i) => {
      const letter = indexToLetter(i);
      const choiceText = choice.startsWith(`${letter}.`) ? choice.substring(2).trim() : choice;
      return `
        <button type="button" class="quiz-choice-btn w-full text-left px-4 py-3 rounded-lg border border-gray-200 bg-white hover:border-indigo-400 text-sm transition flex items-start gap-3" data-choice-index="${i}">
          <span class="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 font-bold text-sm flex items-center justify-center">${escapeHtml(letter)}</span>
          <span class="pt-0.5">${escapeHtml(choiceText)}</span>
        </button>
      `.trim();
    }).join('');
  }

  // Track question shown time for elapsed measurement
  window.__questionShownAt = Date.now();

  // Set copy text
  if (els.modalContent?.dataset) {
    els.modalContent.dataset.aiCopyText = `${quiz.question}\n\n${quiz.choices.join('\n')}\n\n正解: ${indexToLetter(quiz.correctIndex)}\n${quiz.explanation}`;
  }
  setAiCopyButtonEnabled(els, true);
}

function isSuccessfulAiResponse(response) {
  if (!response) return false;
  const text = String(response).trim();
  if (!text) return false;
  if (text.startsWith('エラーが発生しました')) return false;
  if (text === '回答を生成できませんでした。') return false;
  if (text.length < 80) return false;
  return true;
}

// ─── Quiz History Review ────────────────────────────────────

const REVIEW_MODE_LABELS = { single: t('quizHistory.reviewModeLabels.single'), quick5: t('quizHistory.reviewModeLabels.quick5'), speed: t('quizHistory.reviewModeLabels.speed'), mock: t('quizHistory.reviewModeLabels.mock') };
const REVIEW_MODE_ICONS = { single: '📝', quick5: '⚡', speed: '⏱️', mock: '📋' };

function formatElapsedMs(ms) {
  if (ms == null) return '';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  return `${Math.floor(sec / 60)}分${sec % 60}秒`;
}

function groupHistoryBySessions(history) {
  const sessions = new Map();
  for (const h of history) {
    if (!h.question) continue;
    const key = h.sessionId || `date_${(h.answeredAt || '').slice(0, 10)}_${h.examId}`;
    if (!sessions.has(key)) sessions.set(key, []);
    sessions.get(key).push(h);
  }
  // Sort each session's entries by time ascending
  const result = [];
  for (const [sessionId, entries] of sessions) {
    entries.sort((a, b) => (a.answeredAt || '').localeCompare(b.answeredAt || ''));
    const first = entries[0];
    const correct = entries.filter(e => e.isCorrect).length;
    const modeKey = first.mode || '';
    result.push({
      sessionId,
      examId: first.examId,
      mode: modeKey,
      modeLabel: REVIEW_MODE_LABELS[modeKey] || modeKey || '模擬問題',
      modeIcon: REVIEW_MODE_ICONS[modeKey] || '📝',
      date: first.answeredAt,
      total: entries.length,
      correct,
      accuracy: entries.length > 0 ? Math.round(correct / entries.length * 100) : 0,
      entries,
    });
  }
  return result;
}

function renderQuizHistoryModal({ els, examId, exams, getExamById }) {
  // Render tabs
  if (els.quizHistoryTabs) {
    const allTab = `<button data-exam-tab="" class="px-3 py-1.5 rounded-full text-xs font-bold transition ${!examId ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">すべて</button>`;
    const examTabs = exams.map(e =>
      `<button data-exam-tab="${escapeHtml(e.id)}" class="px-3 py-1.5 rounded-full text-xs font-bold transition ${e.id === examId ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}">${escapeHtml(e.code)}</button>`
    ).join('');
    els.quizHistoryTabs.innerHTML = allTab + examTabs;
  }

  renderQuizHistoryContent({ els, exams, getExamById });
}

function renderQuizHistoryContent({ els, exams, getExamById }) {
  if (!els.quizHistoryList) return;

  // Read state from the review modal state (stored on the calling scope)
  const selectedExamId = els.quizHistoryTabs?.querySelector('.bg-indigo-600')?.dataset?.examTab;
  const reviewState = window.__reviewState;
  const examId = reviewState?.selectedExamId ?? selectedExamId ?? '';
  const currentSessionId = reviewState?.currentSessionId ?? null;

  // Update tab highlight
  if (els.quizHistoryTabs) {
    els.quizHistoryTabs.querySelectorAll('[data-exam-tab]').forEach(tab => {
      const isActive = tab.dataset.examTab === examId;
      tab.className = `px-3 py-1.5 rounded-full text-xs font-bold transition ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`;
    });
  }

  const history = getQuizHistory(examId || undefined);
  const reviewable = history.filter(h => h.question);

  if (reviewable.length === 0) {
    els.quizHistoryList.innerHTML = '';
    if (els.quizHistoryEmpty) els.quizHistoryEmpty.classList.remove('hidden');
    if (els.quizHistoryActions) els.quizHistoryActions.innerHTML = '';
    if (els.quizHistoryBreadcrumb) els.quizHistoryBreadcrumb.classList.add('hidden');
    return;
  }
  if (els.quizHistoryEmpty) els.quizHistoryEmpty.classList.add('hidden');

  const sessions = groupHistoryBySessions(reviewable);

  if (currentSessionId) {
    // Drill-down: show questions for a specific session
    const session = sessions.find(s => s.sessionId === currentSessionId);
    if (!session) { return; }

    if (els.quizHistoryActions) els.quizHistoryActions.innerHTML = '';
    if (els.quizHistoryBreadcrumb) {
      els.quizHistoryBreadcrumb.classList.remove('hidden');
      const dateStr = session.date ? new Date(session.date).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      els.quizHistoryBreadcrumb.innerHTML = `
        <button data-action="back-to-sessions" class="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"><i class="fas fa-arrow-left text-xs"></i> 戻る</button>
        <span class="text-gray-400">/</span>
        <span class="text-gray-700 font-medium">${session.modeIcon} ${escapeHtml(session.modeLabel)} (${escapeHtml(dateStr)})</span>
      `;
    }

    els.quizHistoryList.innerHTML = session.entries.map((h, idx) => {
      const isCorrect = h.isCorrect;
      const icon = isCorrect ? '✅' : '❌';
      const userLetter = h.userAnswer != null ? indexToLetter(h.userAnswer) : '未回答';
      const correctLetter = h.correctIndex != null ? indexToLetter(h.correctIndex) : '?';
      const elapsed = formatElapsedMs(h.elapsedMs);

      const choicesHtml = Array.isArray(h.choices) && h.choices.length > 0
        ? h.choices.map((c, ci) => {
            const letter = indexToLetter(ci);
            const isCorrectChoice = ci === h.correctIndex;
            const isUserPick = ci === h.userAnswer;
            let cls = 'text-gray-600';
            if (isCorrectChoice) cls = 'text-green-700 font-bold';
            if (isUserPick && !isCorrect) cls = 'text-red-600';
            const choiceText = c.startsWith(`${letter}.`) ? c : `${letter}. ${c}`;
            return `<div class="text-xs ${cls}">${escapeHtml(choiceText)}</div>`;
          }).join('')
        : '';

      // Bottom summary line with color
      const answerSummary = `<div class="text-xs mt-2 px-2 py-1.5 rounded ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}">` +
        `あなたの回答: <span class="font-bold">${escapeHtml(userLetter)}</span>` +
        ` / 正解: <span class="font-bold">${escapeHtml(correctLetter)}</span>` +
        (elapsed ? ` / <i class="fas fa-stopwatch text-[10px]"></i> ${escapeHtml(elapsed)}` : '') +
        (h.xpEarned ? ` / +${h.xpEarned} XP` : '') +
        `</div>`;

      return `
        <details class="rounded-lg border ${isCorrect ? 'border-green-200' : 'border-red-200'} overflow-hidden">
          <summary class="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${isCorrect ? 'bg-green-50' : 'bg-red-50'}">
            <span class="text-xs text-gray-400 font-mono w-5 text-right flex-shrink-0">${idx + 1}</span>
            <span class="text-sm flex-shrink-0">${icon}</span>
            <span class="flex-1 min-w-0 text-sm text-gray-800 truncate">${escapeHtml(h.question)}</span>
            ${elapsed ? `<span class="flex-shrink-0 text-[10px] text-gray-400 whitespace-nowrap"><i class="fas fa-stopwatch"></i> ${escapeHtml(elapsed)}</span>` : ''}
          </summary>
          <div class="p-3 bg-white border-t ${isCorrect ? 'border-green-100' : 'border-red-100'}">
            <div class="text-sm text-gray-800 font-medium mb-3">${escapeHtml(h.question)}</div>
            <div class="space-y-1 mb-2">${choicesHtml}</div>
            ${answerSummary}
            ${h.explanation ? `<div class="text-xs text-gray-700 p-2 mt-2 bg-gray-50 rounded border border-gray-100">${escapeHtml(h.explanation)}</div>` : ''}
          </div>
        </details>
      `.trim();
    }).join('');

  } else {
    // Session list view
    if (els.quizHistoryBreadcrumb) els.quizHistoryBreadcrumb.classList.add('hidden');

    // Show action buttons
    const wrongCount = reviewable.filter(h => !h.isCorrect).length;
    if (els.quizHistoryActions) {
      els.quizHistoryActions.innerHTML = wrongCount > 0
        ? `<button data-action="retry-wrong" class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"><i class="fas fa-redo"></i> 間違えた問題を解き直す（${wrongCount}問）</button>`
        : '';
    }

    els.quizHistoryList.innerHTML = sessions.map(s => {
      const dateStr = s.date ? new Date(s.date).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      let examLabel = '';
      try { examLabel = getExamById(s.examId).code; } catch { examLabel = s.examId; }

      const accuracyColor = s.accuracy >= 80 ? 'text-green-600' : s.accuracy >= 50 ? 'text-yellow-600' : 'text-red-600';

      return `
        <div data-session-id="${escapeHtml(s.sessionId)}" class="rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 hover:border-indigo-200 transition-all group">
          <div class="flex items-center gap-3">
            <span class="text-xl flex-shrink-0">${s.modeIcon}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-sm font-bold text-gray-800">${escapeHtml(s.modeLabel)}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">${escapeHtml(examLabel)}</span>
              </div>
              <div class="text-xs text-gray-400">${escapeHtml(dateStr)}</div>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
              <div class="text-right">
                <div class="text-sm font-bold ${accuracyColor}">${s.accuracy}%</div>
                <div class="text-[10px] text-gray-400">${s.correct}/${s.total} 正解</div>
              </div>
              <i class="fas fa-chevron-right text-gray-300 group-hover:text-indigo-400 transition text-xs"></i>
            </div>
          </div>
        </div>
      `.trim();
    }).join('');
  }
}
