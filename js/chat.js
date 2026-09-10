/**
 * Chat widget – AI tutor for contextual Q&A about the current exam.
 * Uses multi-turn conversation history and streams responses.
 */

import { callAiStream, callAi, getActiveProviderLabel } from './ai.js';
import { getApiKey, getOpenAiApiKey } from './storage.js';
import { escapeHtml } from './utils.js';
import { getLocale, t } from './i18n.js';
import { getExamCategoryLabel, getExamOfficialRefs } from './exams.js';
import { renderMarkdownToSafeHtml } from './markdown.js';

/**
 * Gemini built-in grounding tools used by the chat.
 *
 * `url_context` runs on Google's side, so the browser never fetches the AWS
 * pages itself. That matters because AWS's own remote MCP endpoints cannot be
 * called from a static site: `https://knowledge-mcp.global.api.aws/mcp` sends no
 * `Access-Control-Allow-Origin`, and `https://aws-mcp.us-east-1.api.aws/mcp`
 * requires an `Mcp-Session-Id` that CORS neither exposes on the response nor
 * allows on the request (its preflight answers 405).
 * See docs/action-required/issue-138-ai-chat-exam-grounding.md.
 */
const CHAT_GROUNDING_TOOLS = [{ url_context: {} }];

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

  // Clear conversation
  els.chatClearBtn?.addEventListener('click', () => {
    clearChat(els);
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
  const examId = getState().examId;
  if (!examId || examId === '__beginner__') {
    els.chatExamBadge.textContent = '';
    return;
  }
  try {
    const exam = getExamById(examId);
    els.chatExamBadge.textContent = exam?.code || '';
  } catch {
    els.chatExamBadge.textContent = '';
  }
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
  const examId = getState().examId;
  let exam;
  try {
    exam = examId && examId !== '__beginner__' ? getExamById(examId) : null;
  } catch {
    exam = null;
  }
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
      tools: CHAT_GROUNDING_TOOLS,
      onRequireApiKey: () => openSettingsModal(),
      onTextDelta: (_delta, fullText) => {
        updateBubbleContent(aiBubble, fullText);
      },
    });

    if (String(response || '').includes('ストリーミングに対応していない環境')) {
      updateBubbleContent(aiBubble, t('chat.thinking'));
      response = await callAi({
        userPrompt: text,
        systemPrompt,
        history: history.slice(0, -1),
        tools: CHAT_GROUNDING_TOOLS,
        onRequireApiKey: () => openSettingsModal(),
      });
    }

    if (response) {
      updateBubbleContent(aiBubble, response, true);
      history.push({ role: 'assistant', content: response });
      if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
    } else {
      updateBubbleContent(aiBubble, t('chat.noResponse'), true);
    }
  } catch (err) {
    updateBubbleContent(aiBubble, `${t('common.error')}: ${err.message || err}`, true);
  }

  busy = false;
  scrollToBottom(els.chatMessages);
}

function buildChatSystemPrompt(exam) {
  const isJa = getLocale() === 'ja';
  // Authoritative identity sourced from the repository's own exam definitions (js/data/*.js).
  const category = getExamCategoryLabel(exam?.id);
  const categoryLabel = category ? (isJa ? category.labelJa : category.labelEn) : null;
  // AWS's own pages (official exam guide / official exam page) for this exam.
  // Handed to the model so the `url_context` tool can verify exam facts.
  const officialRefs = getExamOfficialRefs(exam?.id, { locale: isJa ? 'ja' : 'en' });
  return buildExamGroundingPrompt(exam, { isJa, categoryLabel, officialRefs });
}

/**
 * Build the chat system prompt from explicit inputs (pure, DOM/i18n-free).
 *
 * Extracted from buildChatSystemPrompt (mirroring the js/markdown.js /
 * js/aiErrors.js pure-module pattern) so the grounding contract can be unit
 * tested without a browser or i18n runtime: the caller resolves locale,
 * category label and official refs, this function only assembles the text.
 *
 * @param {{ code?: string, shortLabel?: string, title?: string } | null} exam
 * @param {{ isJa: boolean, categoryLabel?: string | null, officialRefs?: Array<{ title: string, url: string }> }} opts
 * @returns {string}
 */
export function buildExamGroundingPrompt(exam, { isJa = true, categoryLabel = null, officialRefs = [] } = {}) {
  const code = exam?.code || 'AWS';
  const label = exam?.shortLabel || (isJa ? '認定試験' : 'Certification');
  const refs = Array.isArray(officialRefs) ? officialRefs : [];

  if (!isJa) {
    let prompt =
      `You are a friendly AWS study assistant. ` +
      `The user is currently studying for ${code} (${label}).\n`;
    if (exam) {
      prompt +=
        `\n[Authoritative exam identity — repository source of truth]\n` +
        `- Full name: ${exam.title}\n` +
        `- Exam code: ${exam.code}\n` +
        `- Short label: ${exam.shortLabel}\n` +
        (categoryLabel ? `- Category / level: ${categoryLabel}\n` : '') +
        `- The exam identity above is provided by this repository and is the authoritative source of truth. This exam, with exactly this title and code, definitely exists.\n` +
        `- Do NOT claim that this exam code or name does not exist, and do NOT deny or rename it, even if it conflicts with your internal knowledge.\n` +
        `- Do NOT substitute or redirect the answer to a different exam (for example, do not swap ${exam.code} for another exam code). If the user asks about this exam, answer about THIS exam only.\n` +
        `- Treat this repository-provided exam definition as more reliable than your own prior knowledge.\n`;
    }
    if (refs.length) {
      prompt +=
        `\n[Primary sources — verify against AWS documentation]\n` +
        refs.map((ref) => `- ${ref.title}: ${ref.url}\n`).join('') +
        `- Before stating any fact about the exam itself (whether it exists, its official name, exam code, question domains and weightings, number of questions, duration, passing score, or fee), read the AWS pages above and base your answer on them.\n` +
        `- If your internal knowledge contradicts those pages, the pages win. Never override AWS documentation with your own recollection.\n` +
        `- AWS service names and branding change over time (services are renamed, rebranded or merged into other products). Always use the CURRENT service name exactly as it appears on the official AWS documentation and pages provided above, not an older name you may have memorized. For example, prefer the current name (such as "Amazon Q in QuickSight") over a former name. When in doubt, verify the current naming against the AWS pages before answering.\n` +
        `- Cite the AWS URL you actually relied on. If a page could not be read, say so instead of guessing.\n`;
    }
    prompt +=
      `\nAnswer questions clearly and concisely, using concrete examples.\n` +
      `Use Markdown format with bullet points and code examples as appropriate.\n` +
      `Respond in English.`;
    return prompt;
  }

  let prompt =
    `あなたはフレンドリーなAWS学習アシスタントです。` +
    `現在ユーザーは${code}（${label}）の学習をしています。\n\n` +
    `【回答ルール】\n` +
    `- 質問にはわかりやすく簡潔に回答し、具体例を交えてください。\n` +
    `- 回答はMarkdown形式で、箇条書きやコード例を適宜使ってください。\n` +
    `- 日本語で回答してください。\n\n`;
  if (exam) {
    prompt +=
      `【学習中の試験（信頼できる一次情報 / このリポジトリが保持する正）】\n` +
      `- 正式名称: ${exam.title}\n` +
      `- 試験コード: ${exam.code}\n` +
      `- 略称: ${exam.shortLabel}\n` +
      (categoryLabel ? `- 区分（レベル）: ${categoryLabel}\n` : '') +
      `- 上記の試験情報はこのリポジトリが保持する一次情報であり、信頼できる正（source of truth）です。この試験は、この正式名称・試験コードで確かに実在します。\n` +
      `- あなたの内部知識と食い違う場合でも、この試験コードや名称が「存在しない」と決めつけたり、否定・改名したりしないでください。\n` +
      `- 別の試験にすり替えたり誘導したりしないでください（例: ${exam.code} を別の試験コードに置き換えて回答しない）。ユーザーがこの試験について尋ねた場合は、この試験についてのみ回答してください。\n` +
      `- 試験の実在・正式名称・試験コード・区分については、あなたの内部知識よりも、このリポジトリが提供する上記の定義を優先してください。\n\n`;
  }
  if (refs.length) {
    prompt +=
      `【一次情報（AWS公式ドキュメント）で必ず裏取りする】\n` +
      refs.map((ref) => `- ${ref.title}: ${ref.url}\n`).join('') +
      `- 試験そのものに関する事実（実在するか、正式名称、試験コード、出題ドメインと配点比率、問題数、試験時間、合格スコア、受験料など）を述べる前に、上記のAWS公式ページを読み、その内容に基づいて回答してください。\n` +
      `- あなたの内部知識と上記ページの記載が食い違う場合は、必ず上記ページの記載を優先してください。記憶でAWS公式ドキュメントを上書きしないでください。\n` +
      `- AWSのサービス名やブランド名は時間とともに変わります（サービスは改名・再ブランド化されたり、別の製品に統合されたりします）。記憶している古い名称ではなく、上記のAWS公式ドキュメント・公式ページに記載されている「現在の正式なサービス名」をそのまま使ってください（例: 古い名称よりも「Amazon Q in QuickSight」のような現在の名称を優先する）。名称に確信が持てない場合は、回答前に上記のAWS公式ページで現在の名称を確認してください。\n` +
      `- 実際に根拠として使ったAWSのURLを明記してください。ページを読めなかった場合は、推測せずに「読めなかった」と述べてください。\n\n`;
  }
  prompt +=
    `【信頼性に関する厳格なルール】\n` +
    `- AWS公式ドキュメントに記載がある情報のみに基づいて回答してください。\n` +
    `- 推測や不確実な情報を提供しないでください。確信が持てない場合は「この点については公式ドキュメントで確認することをお勧めします」と明示してください。\n` +
    `- 回答の末尾には、参照したAWS公式ドキュメントのURLを可能な限り記載してください（形式: 📚 参考: https://docs.aws.amazon.com/...）。\n` +
    `- 廃止されたサービスや古い情報を提供しないよう注意してください。\n` +
    `- AWSの料金やSLAなど頻繁に変わる数値は「最新の公式ページを参照してください」と案内してください。`;
  return prompt;
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
    // Render markdown for final content. Uses the shared renderer so the chat
    // gets the same Japanese normalization as the AI explanation modal (#164).
    const { html, usedMarkdown } = renderMarkdownToSafeHtml(text);

    if (usedMarkdown) {
      bubble.innerHTML = `<div class="ai-response-area">${html}</div>`;
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

/**
 * Clear chat history and messages in the UI.
 */
function clearChat(els) {
  history = [];
  if (els.chatMessages) {
    els.chatMessages.innerHTML =
      `<div class="chat-bubble chat-bubble-ai">${t('chat.greeting')}</div>`;
  }
}
