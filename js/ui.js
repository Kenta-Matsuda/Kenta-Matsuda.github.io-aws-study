import { callAi, callAiStream, getActiveProviderLabel } from './ai.js';
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
  addQuizResult,
  getQuizHistory,
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

let chartInstance = null;

const XP_RULES = {
  link: 2,
  explain: 5,
  quiz: 10,
};

export function initApp({ exams, getExamById, defaultExamId }) {
  const els = getElements();

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
    closeModal(els.quizModeModal);

    const mode = selectedQuizMode;
    const config = QUIZ_MODE_CONFIG[mode] || QUIZ_MODE_CONFIG.single;

    // Create session
    quizSession = createQuizSession({ examId: lastAiRequest.examId, mode });
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
  els.dashboardQuizBtn?.addEventListener('click', () => {
    const exam = getExamById(state.examId);
    lastAiRequest = {
      type: 'quiz',
      examId: state.examId,
      taskId: '',
      taskTitle: `${exam.code} 全ドメイン横断`,
      taskContext: '',
      isDashboardQuiz: true,
    };
    reflectAiVoteUi();
    if (els.quizModeTaskLabel) els.quizModeTaskLabel.textContent = `${exam.code}（${exam.shortLabel}）全ドメイン横断クイズ`;
    openModal(els.quizModeModal);
  });

  // --- Dashboard Quiz History Review Button ---
  els.dashboardReviewBtn?.addEventListener('click', () => {
    renderQuizHistoryModal({ els, examId: state.examId, exams, getExamById });
    openModal(els.quizHistoryModal);
  });

  // Quiz history filter change
  els.quizHistoryFilter?.addEventListener('change', () => {
    const filterValue = els.quizHistoryFilter.value;
    renderQuizHistoryList({ els, examId: filterValue, getExamById });
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
      els.quizTimerValue.textContent = '0:00';
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
      els.quizModeLabel.textContent = config.label;
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
    showAiModal(els, `${config.label}: ${request.taskTitle}`, true);
    // Clear any previous content (e.g. old explanation)
    if (els.modalContent) els.modalContent.innerHTML = '';
    if (els.modalLoading) els.modalLoading.classList.add('hidden');
    resetQuizUi(els);
    if (els.quizArea) els.quizArea.classList.remove('hidden');
    if (els.quizPregenOverlay) els.quizPregenOverlay.classList.remove('hidden');
    if (els.quizPregenStatus) els.quizPregenStatus.textContent = `0 / ${total} 問`;
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

    const generated = [];
    for (let i = 0; i < total; i++) {
      // Only include last 5 questions for dedup to avoid oversized prompts
      const recentQuestions = generated.slice(-5).map(q => q.question).join('\n');
      const targetDomain = domainTargets[i] || null;
      const userPrompt = (request.isDashboardQuiz
        ? buildGeneralQuizUserPrompt(exam.code, targetDomain)
        : buildQuizUserPrompt(request.taskTitle, request.taskContext))
        + (recentQuestions ? `\n\n【重要】以下の問題とは異なる問題を作成してください:\n${recentQuestions}` : '');

      let response = '';
      try {
        response = await callAiStream({
          userPrompt,
          systemPrompt,
          onRequireApiKey: () => openSettingsModal(els),
          onTextDelta: () => {},  // silent during pre-gen
        });

        if (String(response || '').includes('ストリーミングに対応していない環境')) {
          response = await callAi({
            userPrompt,
            systemPrompt,
            onRequireApiKey: () => openSettingsModal(els),
          });
        }
      } catch (err) {
        // retry once on error
        try {
          response = await callAi({
            userPrompt,
            systemPrompt,
            onRequireApiKey: () => openSettingsModal(els),
          });
        } catch {
          continue;
        }
      }

      const parsed = parseQuizResponse(response);
      if (parsed) {
        generated.push(parsed);
        session.questions[generated.length - 1] = parsed;
      }

      // Update progress
      const done = generated.length;
      if (els.quizPregenStatus) els.quizPregenStatus.textContent = `${done} / ${total} 問`;
      if (els.quizPregenFill) els.quizPregenFill.style.width = `${(done / total) * 100}%`;
    }

    // If we couldn't generate enough, adjust session
    if (generated.length === 0) {
      updateAiModalContent(els, 'エラー: 問題を生成できませんでした。もう一度お試しください。');
      return;
    }
    session.questionCount = generated.length;

    // Hide pre-gen overlay, show quiz
    if (els.quizPregenOverlay) els.quizPregenOverlay.classList.add('hidden');

    // Browser notification
    if (Notification.permission === 'granted') {
      new Notification('問題の準備ができました！', { body: `${generated.length}問のクイズを開始できます`, icon: 'assets/og/favicon.ico' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => {
        if (p === 'granted') new Notification('問題の準備ができました！', { body: `${generated.length}問のクイズを開始できます`, icon: 'assets/og/favicon.ico' });
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
        ? `正解！ ${getComboLabel(result.combo)}`
        : `不正解 — 正解は ${indexToLetter(quiz.correctIndex)}`;
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
      } else {
        els.quizExplanation.textContent = quiz.explanation;
      }
    }

    // Award XP
    const xpResult = addXp({ amount: result.xpEarned, reason: 'quiz' });
    if (xpResult?.unlocked?.length) {
      showMilestoneToast({ els, unlocked: xpResult.unlocked });
    }

    // Store quiz result
    addQuizResult({
      examId: appState.examId,
      taskId: lastAiRequest?.taskId || '',
      isCorrect,
      xpEarned: result.xpEarned,
      answeredAt: new Date().toISOString(),
      question: quiz.question,
      choices: quiz.choices,
      correctIndex: quiz.correctIndex,
      explanation: quiz.explanation,
      userAnswer: answerIndex,
    });

    renderXpDashboard({ els, exam, state: appState });

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
      flashAiCopyButton(els, 'コピーしました');
    } else {
      flashAiCopyButton(els, 'コピー失敗');
    }
  });

  const state = {
    examId: defaultExamId,
    currentDomainId: null,
  };

  wireGlobalUiHandlers({ els, state });

  wireProfileHandlers({ els, state, getExamById });
  wireToastHandlers({ els });

  // Initialize chat widget
  initChat({
    els,
    getExamById,
    getState: () => state,
    openSettingsModal: () => openSettingsModal(els),
  });

  // 初期表示
  setExam(defaultExamId);

  // Boot marker for non-JS/module failure detection
  window.__APP_READY__ = true;

  function setExam(examId) {
    const exam = getExamById(examId);

    state.examId = examId;
    const hasExamSteps = Array.isArray(exam.steps) && exam.steps.length > 0;
    state.currentDomainId = hasExamSteps ? 'all' : (exam.domains?.[0]?.id ?? null);

    renderExamMeta({ els, exam });
    renderExamSwitcher({ els, exams, state, onSelect: setExam });
    renderChart({ els, exam, onDomainSelect: (domainId) => switchDomain(domainId) });
    renderXpDashboard({ els, exam, state });
    renderTabs({ els, exam, state, onDomainSelect: (domainId) => switchDomain(domainId) });
    renderContent({ els, exam, state });

    // Reset chat on exam change & update badge
    resetChat();
    if (els.chatExamBadge) els.chatExamBadge.textContent = exam?.code || '';
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
    xpUserLine: document.getElementById('xpUserLine'),
    xpTotal: document.getElementById('xpTotal'),
    xpRecentActions: document.getElementById('xpRecentActions'),
    xpWeek: document.getElementById('xpWeek'),
    xpTitleBadge: document.getElementById('xpTitleBadge'),
    xpNextTitle: document.getElementById('xpNextTitle'),
    xpRemaining: document.getElementById('xpRemaining'),
    xpProgressBar: document.getElementById('xpProgressBar'),
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
    // OpenAI / Provider
    openaiKeyInput: document.getElementById('openaiKeyInput'),
    openaiKeyClearBtn: document.getElementById('openaiKeyClearBtn'),
    aiProviderSwitch: document.getElementById('aiProviderSwitch'),
    geminiKeySection: document.getElementById('geminiKeySection'),
    openaiKeySection: document.getElementById('openaiKeySection'),

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

    // Dashboard carousel
    dashboardCarousel: document.getElementById('dashboardCarousel'),
    carouselTrack: document.getElementById('carouselTrack'),
    carouselDots: document.getElementById('carouselDots'),
    carouselPrev: document.getElementById('carouselPrev'),
    carouselNext: document.getElementById('carouselNext'),
    dashboardQuizBtn: document.getElementById('dashboardQuizBtn'),
    dashboardReviewBtn: document.getElementById('dashboardReviewBtn'),

    // Quiz history review modal
    quizHistoryModal: document.getElementById('quizHistoryModal'),
    quizHistoryFilter: document.getElementById('quizHistoryFilter'),
    quizHistoryList: document.getElementById('quizHistoryList'),
    quizHistoryEmpty: document.getElementById('quizHistoryEmpty'),

    // Streak
    streakCount: document.getElementById('streakCount'),
    streakWeekDots: document.getElementById('streakWeekDots'),
    streakMessage: document.getElementById('streakMessage'),

    // Chat
    chatFab: document.getElementById('chatFab'),
    chatPanel: document.getElementById('chatPanel'),
    chatCloseBtn: document.getElementById('chatCloseBtn'),
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
    span.textContent = String(label ?? 'コピー');
  } else {
    els.aiCopyBtn.textContent = String(label ?? 'コピー');
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
  setAiCopyButtonLabel(els, 'コピー');
  setAiCopyButtonEnabled(els, false);
}

function flashAiCopyButton(els, message, ms = 1400) {
  if (!els.aiCopyBtn) return;
  clearAiCopyFlashTimer(els);
  setAiCopyButtonLabel(els, message);
  els.aiCopyBtn.__aiCopyTimer = setTimeout(() => {
    setAiCopyButtonLabel(els, 'コピー');
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
    const ok = window.confirm(
      'この端末に保存されている学習データ（ユーザー名・XP・称号）とAPIキーを初期化します。\n続行しますか？',
    );
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
      showInlineMessage(els.userMessage, 'ユーザー名を入力してください。', 'text-red-600');
      return;
    }
    if (name.length > 30) {
      showInlineMessage(els.userMessage, 'ユーザー名は30文字以内にしてください。', 'text-red-600');
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
  const name = String(userName || '名無し');
  const code = String(examCode || '');
  const t = String(title || '');
  const total = Number(totalXp || 0);
  const week = Number(weekXp || 0);
  return [
    `${name} のAWS学習ログ` + (code ? `（${code}を勉強中）` : ''),
    `称号：${t}`,
    `累積XP：${total}（今週+${week}）`,
    '完全無料の「AWS合格ナビゲーター」で、効率的に学習しよう！ #AWS #AWS合格ナビゲーター',
  ].filter(Boolean).join('\n');
}

function buildTweetIntentUrl({ text, url }) {
  // X current endpoint (twitter.com still works, but this reduces redirects)
  const base = 'https://x.com/intent/post';
  const params = new URLSearchParams();
  params.set('text', String(text || '').slice(0, 800));
  if (url) params.set('url', String(url));
  return `${base}?${params.toString()}`;
}

function showMilestoneToast({ els, unlocked }) {
  if (!els.milestoneToast || !els.milestoneToastText) return;
  const latest = unlocked?.[unlocked.length - 1];
  if (!latest) return;
  els.milestoneToastText.textContent = `「${latest.title}」を解放（${latest.xp} XP）`;
  els.milestoneToast.classList.remove('hidden');
  window.clearTimeout?.(els.__milestoneToastTimer);
  els.__milestoneToastTimer = window.setTimeout(() => {
    hideMilestoneToast({ els });
  }, 4500);
}

function hideMilestoneToast({ els }) {
  els.milestoneToast?.classList?.add('hidden');
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
  if (els.xpProgressBar) {
    const pct = Math.max(0, Math.min(1, Number(summary.progress01 || 0))) * 100;
    els.xpProgressBar.style.width = `${pct.toFixed(1)}%`;
  }

  // Streak display
  renderStreakDisplay(els);

  // Request notification permission early
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  // Initialize carousel (only once)
  initDashboardCarousel(els);
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

function renderStreakDisplay(els) {
  const streak = getStreakInfo();
  if (els.streakCount) {
    els.streakCount.textContent = String(streak.current);
  }
  if (els.streakMessage) {
    if (streak.hadActivityToday) {
      els.streakMessage.textContent = streak.current >= 7
        ? '素晴らしい！1週間連続学習達成 🎉'
        : streak.current >= 3
          ? `${streak.current}日連続！この調子で続けよう 💪`
          : '今日もがんばってるね！';
    } else {
      els.streakMessage.textContent = streak.current > 0
        ? '今日もアクセスしてストリークを守ろう！'
        : '今日から連続学習をスタートしよう！';
    }
  }
  if (els.streakWeekDots) {
    // Render 7 dots: newest (today) on the right
    const days = ['月', '火', '水', '木', '金', '土', '日'];
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

function renderRecentXpActionsHtml(actions) {
  const list = Array.isArray(actions) ? actions : [];
  if (!list.length) {
    return '<div class="text-gray-400">まだ獲得履歴がありません</div>';
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
          ? 'URL遷移'
          : reason === 'explain'
            ? 'AI解説'
            : reason === 'quiz'
              ? 'AI作問'
              : reason || 'XP';

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

  const greetingCandidates =
    hour < 5
      ? ['こんばんは。', 'おつかれさまです。', '夜遅くまでおつかれさまです。']
      : hour < 11
        ? ['おはようございます。', 'おはよう。', 'いい朝ですね。']
        : hour < 18
          ? ['こんにちは。', 'こんにちは！', 'やあ。']
          : ['こんばんは。', 'おつかれさまです。', 'おかえりなさい。'];

  const greet = stablePick(greetingCandidates, `${baseSeed}|g`);

  const you = name ? `${name}さん` : 'あなた';
  const line1 = `${greet} ${you}`.trim();
  const line2 = buildDashboardOneLiner({ userName: name });
  return [line1, line2].filter(Boolean).join('\n').trim();
}

function buildDashboardOneLiner({ userName, title } = {}) {
  const name = String(userName || '').trim();
  const now = new Date();
  const hour = now.getHours();
  const daySeed = now.toISOString().slice(0, 10);
  const baseSeed = `${daySeed}|${name || 'anon'}|${String(title || '')}`;

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
  els.siteSubtitle.textContent = exam.subtitle;
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
      '<div class="text-sm text-gray-500">チャートライブラリを読み込めませんでした（Chart.js）。</div>';
    return;
  }

  // データが無い場合
  if (!exam.domains || exam.domains.length === 0) {
    els.domainLegend.innerHTML = '<div class="text-sm text-gray-500">この試験のデータは未登録です。</div>';
    return;
  }

  const ctx = els.examWeightChart?.getContext?.('2d');
  if (!ctx) return;
  const data = {
    labels: exam.domains.map((d) => d.jpTitle),
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
    allBtn.innerHTML = '<i class="fas fa-star text-xs mr-1"></i>全般';
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

  if (!exam.domains || exam.domains.length === 0) {
    els.contentArea.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <i class="fas fa-circle-info text-4xl mb-3 text-gray-300"></i>
        <p>この試験のデータはまだ用意されていません。</p>
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
        <h2 class="text-xl font-bold text-gray-800">${escapeHtml(domain.jpTitle)}</h2>
      </div>
      <p class="text-gray-600 mb-6 bg-gray-50 p-4 rounded-lg border-l-4" style="border-color: ${domain.color}">
        ${escapeHtml(domain.description)}
      </p>
    `;
    els.contentArea.appendChild(domainHeader);

    for (const task of visibleTasks) {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden card-hover mb-6';

      const taskContext = buildTaskAiContext(task);
      const shouldShowDescription = task?.showDescription === true;
      const taskDescriptionLines = normalizeDescriptionLines(task?.description);
      const taskDescriptionHtml = taskDescriptionLines
        .map((line) => `<div>${highlightHtml(escapeHtml(line), term)}</div>`)
        .join('');
      const descriptionHtml =
        shouldShowDescription && taskDescriptionLines.length
          ? `
            <div class="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
              <div class="text-xs font-bold text-amber-700 mb-1">説明</div>
              <div class="space-y-1">${taskDescriptionHtml}</div>
            </div>
          `
          : '';

      const header = document.createElement('div');
      header.className = 'p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white';
      header.innerHTML = `
        <div class="flex flex-col gap-3">
          <div>
            <div class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Task Statement ${escapeHtml(task.id)}</div>
            <h3 class="text-lg font-bold text-gray-900">${escapeHtml(task.jpTitle)}</h3>
            <p class="text-sm text-gray-500 mt-1">${escapeHtml(task.title)}</p>
            ${descriptionHtml}
          </div>
          <div class="flex justify-end">
            <button
              type="button"
              data-action="quiz"
              data-task-id="${escapeHtml(task.id)}"
              data-task-title="${escapeHtml(task.jpTitle)}"
              data-task-context="${escapeHtml(taskContext)}"
              class="sparkle-btn text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 whitespace-nowrap"
            >
            <i class="fas fa-magic"></i> 模擬問題を作成
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
          <i class="fas fa-check-circle text-green-500"></i> 必要な知識・スキル
        </h4>
        <ul class="space-y-3">
          ${(task.knowledge || []).map((k) => renderKnowledgeRow({ knowledge: k, term, taskContext })).join('')}
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
                    taskTitle: String(task.jpTitle || ''),
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
        <p>このドメインのタスクが見つかりませんでした。</p>
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
        <p>この試験の学習ステップはまだ登録されていません。</p>
      </div>
    `;
    return;
  }

  const term = '';

  // Header
  const headerEl = document.createElement('div');
  headerEl.innerHTML = `
    <div class="flex items-center gap-2 mb-4">
      <span class="px-3 py-1 rounded text-xs font-bold text-white bg-orange-500"><i class="fas fa-star mr-1"></i>全般</span>
      <h2 class="text-xl font-bold text-gray-800">学習ロードマップ</h2>
    </div>
    <p class="text-gray-600 mb-6 bg-gray-50 p-4 rounded-lg border-l-4 border-orange-400">
      ${escapeHtml(exam.code)} 試験の学習を上から順に進めていきましょう。各ステップのリソースを活用して学習を進めてください。
    </p>
  `;
  els.contentArea.appendChild(headerEl);

  // Render each step as a task card (reusing domain task card format)
  for (const step of steps) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden card-hover mb-6';

    // Step header — mirrors the domain task header format
    const stepDescLines = normalizeDescriptionLines(step.description);
    const stepDescHtml = stepDescLines.length
      ? `<div class="mt-3 p-3 rounded-lg bg-orange-50 border border-orange-200 text-sm text-orange-900">
           <div class="space-y-1">${stepDescLines.map((l) => `<div>${escapeHtml(l)}</div>`).join('')}</div>
         </div>`
      : '';

    const header = document.createElement('div');
    header.className = 'p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white';
    header.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="flex items-center justify-center w-9 h-9 rounded-full bg-orange-500 text-white font-bold text-sm flex-shrink-0 shadow-sm">${escapeHtml(step.id)}</span>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Step ${escapeHtml(step.id)}</div>
          <h3 class="text-lg font-bold text-gray-900">${escapeHtml(step.jpTitle)}</h3>
          <p class="text-sm text-gray-500 mt-0.5">${escapeHtml(step.title)}</p>
        </div>
      </div>
      ${stepDescHtml}
    `;
    card.appendChild(header);

    // Body: knowledge (optional) + resources
    const resourceSections = buildResourceSections(step);
    const hasResources = resourceSections.length > 0;
    const hasKnowledge = Array.isArray(step.knowledge) && step.knowledge.length > 0;

    const body = document.createElement('div');
    body.className = (hasResources && hasKnowledge) ? 'p-5 grid md:grid-cols-2 gap-6' : 'p-5';

    if (hasKnowledge) {
      const knowledgeCol = document.createElement('div');
      knowledgeCol.innerHTML = `
        <h4 class="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <i class="fas fa-check-circle text-green-500"></i> ポイント
        </h4>
        <ul class="space-y-2">
          ${step.knowledge.map((k) => `
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
                  taskTitle: String(step.jpTitle || ''),
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
        <i class="fas fa-sparkles"></i> 解説
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
  const titleSafe = escapeHtml(blog.title);
  const title = highlightHtml(titleSafe, term);
  const urlSafe = escapeHtml(blog.url);
  const noteSafe = escapeHtml(blog.note);

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
        おススメ
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
            <button type="button" data-action="vote" data-vote="good" data-vote-target-type="resource" data-vote-target-id="${escapeHtml(voteTargetId)}" data-exam-id="${escapeHtml(context?.examId || '')}" data-domain-id="${escapeHtml(context?.domainId || '')}" data-task-id="${escapeHtml(context?.taskId || '')}" data-task-title="${escapeHtml(context?.taskTitle || '')}" data-resource-section="${escapeHtml(context?.resourceSection || '')}" data-resource-title="${titleSafe}" data-resource-url="${urlSafe}" class="px-2 py-1 border rounded text-xs font-medium transition-colors flex items-center gap-1 ${goodClass}" aria-pressed="${goodSelected ? 'true' : 'false'}" title="役に立った">
              <i class="fa-regular fa-thumbs-up"></i>
            </button>
            <button type="button" data-action="vote" data-vote="bad" data-vote-target-type="resource" data-vote-target-id="${escapeHtml(voteTargetId)}" data-exam-id="${escapeHtml(context?.examId || '')}" data-domain-id="${escapeHtml(context?.domainId || '')}" data-task-id="${escapeHtml(context?.taskId || '')}" data-task-title="${escapeHtml(context?.taskTitle || '')}" data-resource-section="${escapeHtml(context?.resourceSection || '')}" data-resource-title="${titleSafe}" data-resource-url="${urlSafe}" class="px-2 py-1 border rounded text-xs font-medium transition-colors flex items-center gap-1 ${badClass}" aria-pressed="${badSelected ? 'true' : 'false'}" title="微妙 / 改善してほしい">
              <i class="fa-regular fa-thumbs-down"></i>
            </button>
          </div>
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
  for (const group of nested) {
    if (!group || typeof group !== 'object') continue;

    const key = String(group.key || group.id || group.type || '').trim();
    const title = String(group.label || group.title || '').trim() || (key ? humanizeKey(key) : 'Resources');
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
      url: String(item.url || ''),
      note: String(item.note || ''),
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
function wireFeedbackHandlers({ els }) {
  if (!els.feedbackBtn || !els.feedbackModal) return;

  els.feedbackBtn.addEventListener('click', () => openFeedbackModal(els));

  els.feedbackTextarea?.addEventListener('input', () => {
    updateFeedbackCharCount(els);
  });

  els.feedbackSubmitBtn?.addEventListener('click', () => {
    submitFeedback(els);
  });

  // Allow Ctrl+Enter / Cmd+Enter to submit
  els.feedbackTextarea?.addEventListener('keydown', (e) => {
    if (e.isComposing) return;
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submitFeedback(els);
    }
  });
}

function openFeedbackModal(els) {
  if (!els.feedbackModal) return;
  if (els.feedbackTextarea) els.feedbackTextarea.value = '';
  if (els.feedbackCategorySelect) els.feedbackCategorySelect.value = 'general';
  els.feedbackMessage?.classList?.add('hidden');
  updateFeedbackCharCount(els);
  openModal(els.feedbackModal);
  setTimeout(() => els.feedbackTextarea?.focus(), 0);
}

function updateFeedbackCharCount(els) {
  if (!els.feedbackCharCount || !els.feedbackTextarea) return;
  const len = (els.feedbackTextarea.value || '').length;
  els.feedbackCharCount.textContent = `${len} / 1000`;
  els.feedbackCharCount.classList.toggle('text-red-500', len > 950);
  els.feedbackCharCount.classList.toggle('text-gray-400', len <= 950);
}

function submitFeedback(els) {
  const text = String(els.feedbackTextarea?.value || '').trim();
  const category = String(els.feedbackCategorySelect?.value || 'general');

  if (!text) {
    showInlineMessage(els.feedbackMessage, 'フィードバック内容を入力してください。', 'text-red-600');
    return;
  }
  if (text.length > 1000) {
    showInlineMessage(els.feedbackMessage, '1000文字以内で入力してください。', 'text-red-600');
    return;
  }

  // Send to Google Analytics as a custom event
  sendFeedbackToGa({ category, text });

  showInlineMessage(els.feedbackMessage, 'フィードバックを送信しました。ありがとうございます！', 'text-teal-600');
  if (els.feedbackTextarea) els.feedbackTextarea.value = '';
  updateFeedbackCharCount(els);

  // Auto-close after a short delay
  setTimeout(() => {
    closeModal(els.feedbackModal);
    els.feedbackMessage?.classList?.add('hidden');
  }, 1500);
}

function sendFeedbackToGa({ category, text }) {
  try {
    if (typeof window === 'undefined') return;
    const gtag = window.gtag;
    if (typeof gtag !== 'function') return;

    // GA4 event parameters are limited to 100 chars per value for standard reporting,
    // but custom events can send longer strings in exploration reports.
    // Split long text into chunks for reliable capture.
    const maxChunk = 500;
    const chunks = [];
    for (let i = 0; i < text.length; i += maxChunk) {
      chunks.push(text.slice(i, i + maxChunk));
    }

    gtag('event', 'user_feedback', {
      feedback_category: category,
      feedback_text: chunks[0] || '',
      feedback_text_2: chunks[1] || '',
      feedback_length: text.length,
    });
  } catch {
    // ignore
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

  const disclaimer =
    '※注意: AIの生成結果は必ずしも正しくありません（誤りを含む可能性があります）。\n' +
    '重要な判断は、AWS公式ドキュメント等の一次情報で確認してください。';

  const baseText = String(text ?? '');
  const shouldAppend = baseText && !baseText.includes('AIの生成結果は必ずしも正しくありません');
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
  showAiModal(els, `用語解説: ${term}`, true);

  const systemPrompt =
    `${exam.code}（${exam.shortLabel}）の初学者に向けて、` +
    `指定されたAWS/技術用語を「腹落ち」するように解説してください。辞書的な定義の丸写しではなく、` +
    `具体的な説明を心がけて、初心者でも納得して理解できるようにしてください。` +
    `出力はMarkdownで、見出しと箇条書きを使って読みやすくしてください。` +
    `また、説明の中で新しい用語（初学者がつまずきやすい関連用語）を出す場合は、` +
    `初出に短い補足（括弧で5〜15字程度）を付けるか、最後に「ミニ用語集」で必ず説明してください。`;

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

async function generateQuiz({ els, exam, taskTitle, taskContext, session, isDashboardQuiz }) {
  if (!getApiKey() && !getOpenAiApiKey()) {
    openSettingsModal(els);
    return;
  }

  const config = session ? QUIZ_MODE_CONFIG[session.mode] || QUIZ_MODE_CONFIG.single : null;
  const modalTitle = config && session && session.questionCount > 1
    ? `${config.label}: ${taskTitle}`
    : `模擬問題: ${taskTitle}`;

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
  let title = 'クイズ完了！';
  if (acc >= 0.9) { emoji = '🏆'; title = '素晴らしい！'; }
  else if (acc >= 0.7) { emoji = '🎉'; title = 'よくできました！'; }
  else if (acc >= 0.5) { emoji = '💪'; title = 'まずまず！'; }
  else { emoji = '📚'; title = '復習しよう！'; }

  if (els.quizSummaryEmoji) els.quizSummaryEmoji.textContent = emoji;
  if (els.quizSummaryTitle) els.quizSummaryTitle.textContent = title;
  if (els.quizSummarySubtitle) els.quizSummarySubtitle.textContent = `${config.label} — ${summary.total}問完了`;

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

function renderQuizHistoryModal({ els, examId, exams, getExamById }) {
  // Populate filter dropdown
  if (els.quizHistoryFilter) {
    const currentVal = els.quizHistoryFilter.value;
    els.quizHistoryFilter.innerHTML =
      '<option value="">すべての試験</option>' +
      exams.map(e => `<option value="${escapeHtml(e.id)}"${e.id === examId ? ' selected' : ''}>${escapeHtml(e.code)}</option>`).join('');
    // Keep previous selection if modal was already open
    if (currentVal && exams.some(e => e.id === currentVal)) {
      els.quizHistoryFilter.value = currentVal;
    }
  }

  const filterExamId = els.quizHistoryFilter?.value || '';
  renderQuizHistoryList({ els, examId: filterExamId, getExamById });
}

function renderQuizHistoryList({ els, examId, getExamById }) {
  if (!els.quizHistoryList) return;

  const history = getQuizHistory(examId || undefined);
  // Only show entries that have question content (older entries may not)
  const reviewable = history.filter(h => h.question);

  if (reviewable.length === 0) {
    els.quizHistoryList.innerHTML = '';
    if (els.quizHistoryEmpty) els.quizHistoryEmpty.classList.remove('hidden');
    return;
  }

  if (els.quizHistoryEmpty) els.quizHistoryEmpty.classList.add('hidden');

  els.quizHistoryList.innerHTML = reviewable.map((h, idx) => {
    const isCorrect = h.isCorrect;
    const icon = isCorrect ? '✅' : '❌';
    const userLetter = h.userAnswer >= 0 ? indexToLetter(h.userAnswer) : '未回答';
    const correctLetter = h.correctIndex >= 0 ? indexToLetter(h.correctIndex) : '?';

    let examLabel = '';
    try {
      const exam = getExamById(h.examId);
      examLabel = exam.code;
    } catch { examLabel = h.examId; }

    const dateStr = h.answeredAt ? new Date(h.answeredAt).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

    const choicesHtml = Array.isArray(h.choices) && h.choices.length > 0
      ? h.choices.map((c, ci) => {
          const letter = indexToLetter(ci);
          const isUserPick = ci === h.userAnswer;
          const isCorrectChoice = ci === h.correctIndex;
          let cls = 'text-gray-600';
          if (isCorrectChoice) cls = 'text-green-700 font-bold';
          if (isUserPick && !isCorrect) cls = 'text-red-600 line-through';
          if (isUserPick && isCorrect) cls = 'text-green-700 font-bold';
          const choiceText = c.startsWith(`${letter}.`) ? c : `${letter}. ${c}`;
          return `<div class="text-xs ${cls}">${escapeHtml(choiceText)}${isUserPick ? ' ← あなたの回答' : ''}${isCorrectChoice && !isUserPick ? ' ← 正解' : ''}</div>`;
        }).join('')
      : '';

    return `
      <details class="rounded-lg border ${isCorrect ? 'border-green-200' : 'border-red-200'} overflow-hidden">
        <summary class="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${isCorrect ? 'bg-green-50' : 'bg-red-50'}">
          <span class="text-sm flex-shrink-0">${icon}</span>
          <span class="flex-1 min-w-0 text-sm text-gray-800 truncate">${escapeHtml(h.question)}</span>
          <span class="flex-shrink-0 text-[10px] text-gray-400 whitespace-nowrap">${escapeHtml(examLabel)} ${escapeHtml(dateStr)}</span>
        </summary>
        <div class="p-3 bg-white border-t ${isCorrect ? 'border-green-100' : 'border-red-100'}">
          <div class="text-sm text-gray-800 font-medium mb-3">${escapeHtml(h.question)}</div>
          <div class="space-y-1 mb-3">${choicesHtml}</div>
          <div class="text-xs text-gray-600 mb-2">
            あなたの回答: <span class="font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}">${escapeHtml(userLetter)}</span>
            ${!isCorrect ? ` / 正解: <span class="font-bold text-green-700">${escapeHtml(correctLetter)}</span>` : ''}
            ${h.xpEarned ? ` / +${h.xpEarned} XP` : ''}
          </div>
          ${h.explanation ? `<div class="text-xs text-gray-700 p-2 bg-gray-50 rounded border border-gray-100">${escapeHtml(h.explanation)}</div>` : ''}
        </div>
      </details>
    `.trim();
  }).join('');
}
