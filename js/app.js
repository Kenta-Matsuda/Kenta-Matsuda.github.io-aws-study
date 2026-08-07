import { getPublicExams, getExamById, resolveExamFromHash } from './exams.js';
import { DEFAULT_EXAM_ID } from './config.js';
import { initApp } from './ui.js';
import { initI18n, setLocale, getLocale, translateStaticElements } from './i18n.js';

function handleBootError(e) {
  // index.html のフォールバックバナーで表示する
  if (typeof window !== 'undefined') {
    window.__APP_BOOT_ERROR__ = e;
  }
  // eslint-disable-next-line no-console
  console.error(e);
}

async function loadLocales() {
  const base = import.meta.url ? new URL('.', import.meta.url).href : './js/';
  const [jaRes, enRes, urlsRes] = await Promise.all([
    fetch(`${base}locales/ja.json`),
    fetch(`${base}locales/en.json`),
    fetch(`${base}locales/urls.json`),
  ]);
  const [ja, en, urls] = await Promise.all([jaRes.json(), enRes.json(), urlsRes.json()]);
  return { ja, en, urls };
}

/**
 * Determine initial exam from URL hash, falling back to DEFAULT_EXAM_ID.
 */
function getInitialExamId() {
  const hash = location.hash.replace(/^#/, '');
  const resolved = resolveExamFromHash(hash);
  return resolved || DEFAULT_EXAM_ID;
}

async function boot() {
  // Initialize i18n before app to ensure t() is ready
  const { ja, en, urls } = await loadLocales();
  initI18n({ ja, en }, urls);
  translateStaticElements();

  // Wire up the language toggle button
  const langBtn = document.getElementById('langToggleBtn');
  const langLabel = document.getElementById('langToggleLabel');
  if (langBtn) {
    // Set initial label
    if (langLabel) langLabel.textContent = getLocale().toUpperCase();
    langBtn.addEventListener('click', () => {
      const next = getLocale() === 'ja' ? 'en' : 'ja';
      setLocale(next);
      if (langLabel) langLabel.textContent = next.toUpperCase();
    });
  }

  const initialExamId = getInitialExamId();

  const appApi = initApp({
    exams: getPublicExams(),
    getExamById,
    defaultExamId: initialExamId,
  });

  // Listen for hash changes to switch exam
  window.addEventListener('hashchange', () => {
    const hash = location.hash.replace(/^#/, '');
    const examId = resolveExamFromHash(hash);
    if (examId && appApi && appApi.setExam) {
      appApi.setExam(examId);
    }
  });

  return appApi;
}

const runBoot = () => boot().catch(handleBootError);

// DOM がまだ構築中の場合、要素取得前に init されてイベントが張られない事故を避ける
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runBoot, { once: true });
} else {
  runBoot();
}
