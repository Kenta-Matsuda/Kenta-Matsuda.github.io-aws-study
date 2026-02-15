import { callGemini } from './gemini.js';
import { getApiKey, saveApiKeyFromInput, clearApiKey } from './storage.js';
import { escapeHtml, escapeRegExp } from './utils.js';

let chartInstance = null;

export function initApp({ exams, getExamById, defaultExamId }) {
  const els = getElements();

  /** @type {null | { type: 'explain', examId: string, term: string, taskContext: string } | { type: 'quiz', examId: string, taskTitle: string, taskContext: string }} */
  let lastAiRequest = null;

  function updateAiRetryButton({ visible, disabled } = {}) {
    if (!els.aiRetryBtn) return;
    const isVisible = visible ?? Boolean(lastAiRequest);
    els.aiRetryBtn.classList.toggle('hidden', !isVisible);
    els.aiRetryBtn.disabled = disabled ?? false;
    els.aiRetryBtn.classList.toggle('opacity-60', els.aiRetryBtn.disabled);
    els.aiRetryBtn.classList.toggle('cursor-not-allowed', els.aiRetryBtn.disabled);
  }

  async function runAiRequest(req) {
    const exam = getExamById(req.examId);
    updateAiRetryButton({ visible: true, disabled: true });
    if (req.type === 'explain') {
      await explainTerm({ els, exam, term: req.term, taskContext: req.taskContext });
      return;
    }
    await generateQuiz({ els, exam, taskTitle: req.taskTitle, taskContext: req.taskContext });
  }

  els.aiRetryBtn?.addEventListener('click', async () => {
    if (!lastAiRequest) return;
    await runAiRequest(lastAiRequest);
  });

  const state = {
    examId: defaultExamId,
    currentDomainId: null,
    searchTerm: '',
  };

  wireGlobalUiHandlers({ els, state });

  // 初期表示
  setExam(defaultExamId);

  // Boot marker for non-JS/module failure detection
  window.__APP_READY__ = true;

  function setExam(examId) {
    const exam = getExamById(examId);

    state.examId = examId;
    state.currentDomainId = exam.domains?.[0]?.id ?? null;
    state.searchTerm = '';
    els.searchInput.value = '';

    renderExamMeta({ els, exam });
    renderExamSwitcher({ els, exams, state, onSelect: setExam });
    renderChart({ els, exam, onDomainSelect: (domainId) => switchDomain(domainId) });
    renderTabs({ els, exam, state, onDomainSelect: (domainId) => switchDomain(domainId) });
    renderContent({ els, exam, state });
  }

  function switchDomain(domainId) {
    state.currentDomainId = domainId;
    state.searchTerm = '';
    els.searchInput.value = '';

    const exam = getExamById(state.examId);
    renderTabs({ els, exam, state, onDomainSelect: (id) => switchDomain(id) });
    renderContent({ els, exam, state });
  }

  // Search
  els.searchInput.addEventListener('input', (e) => {
    state.searchTerm = e.target.value ?? '';
    const exam = getExamById(state.examId);
    renderContent({ els, exam, state });
  });

  // Content actions (event delegation)
  els.contentArea.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const exam = getExamById(state.examId);
    const taskContext = btn.dataset.taskContext || '';
    const examId = state.examId;

    if (action === 'quiz') {
      lastAiRequest = { type: 'quiz', examId, taskTitle: btn.dataset.taskTitle || '', taskContext };
      updateAiRetryButton({ visible: true, disabled: true });
      await generateQuiz({ els, exam, taskTitle: btn.dataset.taskTitle || '', taskContext });
      return;
    }

    if (action === 'explain') {
      lastAiRequest = { type: 'explain', examId, term: btn.dataset.term || '', taskContext };
      updateAiRetryButton({ visible: true, disabled: true });
      await explainTerm({ els, exam, term: btn.dataset.term || '', taskContext });
      return;
    }
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
    searchInput: document.getElementById('searchInput'),

    // modals
    aiModal: document.getElementById('aiModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalContent: document.getElementById('modalContent'),
    modalLoading: document.getElementById('modalLoading'),
    aiRetryBtn: document.getElementById('aiRetryBtn'),

    settingsModal: document.getElementById('settingsModal'),
    settingsBtn: document.getElementById('settingsBtn'),
    apiKeyInput: document.getElementById('apiKeyInput'),
    settingsMessage: document.getElementById('settingsMessage'),
    apiKeySaveBtn: document.getElementById('apiKeySaveBtn'),
    apiKeyClearBtn: document.getElementById('apiKeyClearBtn'),
  };
}

function wireGlobalUiHandlers({ els }) {
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

  els.apiKeySaveBtn.addEventListener('click', () => {
    saveApiKeyFromInput({
      inputEl: els.apiKeyInput,
      messageEl: els.settingsMessage,
      onSuccess: () => setTimeout(() => closeModal(els.settingsModal), 800),
    });
  });

  els.apiKeyClearBtn.addEventListener('click', () => {
    clearApiKey({ inputEl: els.apiKeyInput, messageEl: els.settingsMessage });
  });

  // Close modal buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-close-modal]');
    if (!btn) return;
    const modalId = btn.getAttribute('data-close-modal');
    const modalEl = document.getElementById(modalId);
    if (modalEl) closeModal(modalEl);
  });

  // Close exam menu when clicking outside
  document.addEventListener('click', (e) => {
    const clickedInside = e.target.closest('#examMenu') || e.target.closest('#examMenuBtn');
    if (clickedInside) return;
    closeExamMenu(els);
  });

  // Click outside to close
  window.addEventListener('click', (event) => {
    if (event.target?.classList?.contains('modal')) {
      closeModal(event.target);
    }
  });
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

  const termRaw = (state.searchTerm || '').trim();
  const term = termRaw.toLowerCase();

  let targetDomains = exam.domains;
  if (!term) {
    targetDomains = targetDomains.filter((d) => d.id === state.currentDomainId);
  }

  for (const domain of targetDomains) {
    const visibleTasks = (domain.tasks || []).filter((task) => {
      if (!term) return true;
      return (
        task.title.toLowerCase().includes(term) ||
        task.jpTitle.toLowerCase().includes(term) ||
        (task.knowledge || []).some((k) => k.toLowerCase().includes(term))
      );
    });

    if (visibleTasks.length === 0 && term) continue;

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
        <i class="fas fa-search text-4xl mb-3 text-gray-300"></i>
        <p>該当するタスクが見つかりませんでした。</p>
      </div>
    `;
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

function renderBlogCard({ blog, term }) {
  const isRecommended = blog?.recommend === true;
  const titleSafe = escapeHtml(blog.title);
  const title = highlightHtml(titleSafe, term);
  const urlSafe = escapeHtml(blog.url);
  const noteSafe = escapeHtml(blog.note);

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
        <a href="${urlSafe}" target="_blank" rel="noopener noreferrer" class="text-sm font-medium text-blue-700 hover:underline flex items-start gap-2 group">
          <span>${title}</span>
          <i class="fas fa-external-link-alt text-xs text-gray-400 group-hover:text-blue-500 mt-1"></i>
        </a>
        ${badge}
      </div>
      <div class="text-xs text-gray-500 mt-1 flex items-center gap-1">
        <i class="fas fa-info-circle text-gray-400"></i>
        <span>${noteSafe}</span>
      </div>
    </div>
  `;
}

function renderResourceSection({ title, iconClass, iconColorClass, items, term }) {
  if (!items || items.length === 0) return '';
  const safeTitle = escapeHtml(title);
  const rows = (items || []).map((blog) => renderBlogCard({ blog, term })).join('');
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

// --- Modals + AI actions ---
function openSettingsModal(els) {
  const key = getApiKey();
  if (key) els.apiKeyInput.value = key;
  els.settingsMessage.classList.add('hidden');
  openModal(els.settingsModal);
}

function openModal(modalEl) {
  modalEl.style.display = 'block';
}

function closeModal(modalEl) {
  modalEl.style.display = 'none';
}

function showAiModal(els, title, isLoading) {
  els.modalTitle.textContent = title;
  openModal(els.aiModal);

  if (isLoading) {
    els.modalLoading.classList.remove('hidden');
    els.modalContent.textContent = '';
    els.modalContent.innerHTML = '';
    if (els.aiRetryBtn) {
      els.aiRetryBtn.disabled = true;
      els.aiRetryBtn.classList.add('opacity-60', 'cursor-not-allowed');
    }
  }
}

function renderMarkdownToSafeHtml(markdown) {
  const md = String(markdown ?? '');

  const marked = typeof window !== 'undefined' ? window.marked : undefined;
  const DOMPurify = typeof window !== 'undefined' ? window.DOMPurify : undefined;

  if (!marked || typeof marked.parse !== 'function' || !DOMPurify || typeof DOMPurify.sanitize !== 'function') {
    return { html: '', usedMarkdown: false };
  }

  // keep it simple: gfm + line breaks
  try {
    marked.setOptions?.({ gfm: true, breaks: true });
  } catch {
    // ignore
  }

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

async function explainTerm({ els, exam, term, taskContext }) {
  if (!getApiKey()) {
    openSettingsModal(els);
    return;
  }

  showAiModal(els, `用語解説: ${term}`, true);

  const systemPrompt =
    `あなたはAWS認定インストラクターです。${exam.code}（${exam.shortLabel}）の初学者に向けて、` +
    `指定されたAWS/ネットワーク用語を「腹落ち」するように解説してください。辞書的な定義の丸写しではなく、` +
    `具体的な説明を心がけて、初心者でも納得して理解できるようにしてください。` +
    `出力はMarkdownで、見出しと箇条書きを使って読みやすくしてください。` +
    `また、説明の中で新しい用語（初学者がつまずきやすい関連用語）を出す場合は、` +
    `初出に短い補足（括弧で5〜15字程度）を付けるか、最後に「ミニ用語集」で必ず説明してください。`;

  const contextPrompt = taskContext
    ? `\n\n【タスク文脈】\n${taskContext}`
    : '';

  const userPrompt = `用語: 「${term}」について、「AWS」の文脈で150文字程度で解説してください。`;

  const response = await callGemini({
    userPrompt,
    systemPrompt: systemPrompt + contextPrompt,
    onRequireApiKey: () => openSettingsModal(els),
  });

  if (response) updateAiModalContent(els, response);
}

async function generateQuiz({ els, exam, taskTitle, taskContext }) {
  if (!getApiKey()) {
    openSettingsModal(els);
    return;
  }

  showAiModal(els, `模擬問題作成: ${taskTitle}`, true);

  const systemPrompt =
    `あなたはAWS認定試験のエキスパートです。${exam.code}（${exam.shortLabel}）レベルの4択問題を1問作成してください。`;

  const contextPrompt = taskContext
    ? `\n\n【タスク文脈】\n${taskContext}`
    : '';

  const userPrompt = `タスク: 「${taskTitle}」に関連する、実践的なシナリオベースの選択問題を1問作成してください。

フォーマット:
【問題文】
[シナリオと質問]

【選択肢】
A. [選択肢]
B. [選択肢]
C. [選択肢]
D. [選択肢]

【正解と解説】
正解: [記号]
解説: [なぜ正解か/他がなぜ違うかを簡潔に]`;

  const response = await callGemini({
    userPrompt,
    systemPrompt: systemPrompt + contextPrompt,
    onRequireApiKey: () => openSettingsModal(els),
  });

  if (response) updateAiModalContent(els, response);
}
