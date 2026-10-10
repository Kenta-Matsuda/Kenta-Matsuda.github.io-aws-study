import { getPublicExams, getExamById, resolveExamFromHash } from './exams.js';
import { DEFAULT_EXAM_ID } from './config.js';
import { initApp } from './ui.js';
import { initI18n, setLocale, getLocale, translateStaticElements } from './i18n.js';
import { getRegisteredLocaleCodes, nextLocale } from './localeRegistry.js';

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
  // Load every registered locale dictionary (js/localeRegistry.js) plus the
  // URL map. initI18n derives the supported set from these keys.
  const codes = getRegisteredLocaleCodes();
  const [dicts, urls] = await Promise.all([
    Promise.all(codes.map((code) => fetch(`${base}locales/${code}.json`).then((r) => r.json()))),
    fetch(`${base}locales/urls.json`).then((r) => r.json()),
  ]);
  const localeData = Object.fromEntries(codes.map((code, i) => [code, dicts[i]]));
  return { localeData, urls };
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
  const { localeData, urls } = await loadLocales();
  initI18n(localeData, urls);
  translateStaticElements();

  // Wire up the language toggle button
  const langBtn = document.getElementById('langToggleBtn');
  const langLabel = document.getElementById('langToggleLabel');
  if (langBtn) {
    // Set initial label
    if (langLabel) langLabel.textContent = getLocale().toUpperCase();
    langBtn.addEventListener('click', () => {
      const next = nextLocale(getLocale());
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
