/**
 * Chat widget – AI tutor for contextual Q&A about the current exam.
 * Uses multi-turn conversation history and streams responses.
 */

import { callAiStream, callAi, getActiveProviderLabel } from './ai.js';
import { getApiKey, getOpenAiApiKey } from './storage.js';
import { escapeHtml } from './utils.js';

/** Conversation history (role/content pairs) */
let history = [];
/** Whether a request is currently in-flight */
let busy = false;

const MAX_HISTORY = 20; // keep latest N turns to avoid token overflow

/**
 * Initialize the chat widget.
 * @param {{ els: Record<string, HTMLElement|null>, getExamById: Function, getState: () => { examId: string } }} opts
 */
export function initChat({ els, getExamById, getState, openSettingsModal }) {
  if (!els.chatFab || !els.chatPanel) return;

  // Toggle panel
  els.chatFab.addEventListener('click', () => {
    const isHidden = els.chatPanel.classList.contains('hidden');
    els.chatPanel.classList.toggle('hidden', !isHidden);
    if (isHidden && els.chatInput) {
      els.chatInput.focus();
    }
  });

  els.chatCloseBtn?.addEventListener('click', () => {
    els.chatPanel.classList.add('hidden');
  });

  // Send on Enter
  els.chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendMessage({ els, getExamById, getState, openSettingsModal });
    }
  });

  // Send on click
  els.chatSendBtn?.addEventListener('click', () => {
    sendMessage({ els, getExamById, getState, openSettingsModal });
  });

  // Suggestion chips
  els.chatSuggestions?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-chat-suggest]');
    if (!btn) return;
    const text = btn.dataset.chatSuggest;
    if (els.chatInput) els.chatInput.value = text;
    sendMessage({ els, getExamById, getState, openSettingsModal });
  });

  // Update exam badge when exam changes
  updateChatExamBadge(els, getExamById, getState);
}

function updateChatExamBadge(els, getExamById, getState) {
  if (!els.chatExamBadge) return;
  const exam = getExamById(getState().examId);
  els.chatExamBadge.textContent = exam?.code || '';
}

async function sendMessage({ els, getExamById, getState, openSettingsModal }) {
  if (busy) return;
  const text = (els.chatInput?.value || '').trim();
  if (!text) return;

  if (!getApiKey() && !getOpenAiApiKey()) {
    openSettingsModal();
    return;
  }

  els.chatInput.value = '';
  busy = true;

  // Append user bubble
  appendBubble(els.chatMessages, text, 'user');

  // Hide suggestions after first message
  if (els.chatSuggestions) els.chatSuggestions.classList.add('hidden');

  // Build system prompt with exam context
  const exam = getExamById(getState().examId);
  const systemPrompt = buildChatSystemPrompt(exam);

  // Add user message to history
  history.push({ role: 'user', content: text });
  if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

  // Create AI bubble placeholder
  const aiBubble = appendBubble(els.chatMessages, '...', 'ai');

  try {
    let response = await callAiStream({
      userPrompt: text,
      systemPrompt,
      history: history.slice(0, -1), // exclude current message (already in userPrompt)
      onRequireApiKey: () => openSettingsModal(),
      onTextDelta: (_delta, fullText) => {
        updateBubbleContent(aiBubble, fullText);
      },
    });

    if (String(response || '').includes('ストリーミングに対応していない環境')) {
      updateBubbleContent(aiBubble, '考え中...');
      response = await callAi({
        userPrompt: text,
        systemPrompt,
        history: history.slice(0, -1),
        onRequireApiKey: () => openSettingsModal(),
      });
    }

    if (response) {
      updateBubbleContent(aiBubble, response, true);
      history.push({ role: 'assistant', content: response });
      if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    } else {
      updateBubbleContent(aiBubble, '回答を生成できませんでした。', true);
    }
  } catch (err) {
    updateBubbleContent(aiBubble, `エラー: ${err.message || err}`, true);
  }

  busy = false;
  scrollToBottom(els.chatMessages);
}

function buildChatSystemPrompt(exam) {
  const code = exam?.code || 'AWS';
  const label = exam?.shortLabel || '認定試験';
  return (
    `あなたはフレンドリーなAWS学習アシスタントです。` +
    `現在ユーザーは${code}（${label}）の学習をしています。\n` +
    `質問にはわかりやすく簡潔に回答し、具体例を交えてください。\n` +
    `回答はMarkdown形式で、箇条書きやコード例を適宜使ってください。\n` +
    `日本語で回答してください。`
  );
}

function appendBubble(container, text, role) {
  if (!container) return null;
  const div = document.createElement('div');
  div.className = `chat-bubble chat-bubble-${role}`;
  if (role === 'ai') {
    div.innerHTML = '<span class="text-gray-400 text-xs">...</span>';
  } else {
    div.textContent = text;
  }
  container.appendChild(div);
  scrollToBottom(container);
  return div;
}

function updateBubbleContent(bubble, text, isFinal = false) {
  if (!bubble) return;
  if (isFinal) {
    // Render markdown for final content
    const marked = typeof window !== 'undefined' ? window.marked : undefined;
    const DOMPurify = typeof window !== 'undefined' ? window.DOMPurify : undefined;

    if (marked && typeof marked.parse === 'function' && DOMPurify && typeof DOMPurify.sanitize === 'function') {
      const rawHtml = marked.parse(String(text));
      bubble.innerHTML = `<div class="ai-response-area">${DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } })}</div>`;
      // Open links in new tab
      bubble.querySelectorAll('a').forEach((a) => {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      });
    } else {
      bubble.textContent = text;
    }
  } else {
    // Streaming: plain text
    bubble.textContent = text;
  }
}

function scrollToBottom(container) {
  if (!container) return;
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

/**
 * Reset chat history (e.g., when switching exams).
 */
export function resetChat() {
  history = [];
}
