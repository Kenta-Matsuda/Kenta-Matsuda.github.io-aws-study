import { getPublicExams, getExamById } from './exams.js';
import { DEFAULT_EXAM_ID } from './config.js';
import { initApp } from './ui.js';

function handleBootError(e) {
  // index.html のフォールバックバナーで表示する
  if (typeof window !== 'undefined') {
    window.__APP_BOOT_ERROR__ = e;
  }
  // eslint-disable-next-line no-console
  console.error(e);
}

function boot() {
  return initApp({
    exams: getPublicExams(),
    getExamById,
    defaultExamId: DEFAULT_EXAM_ID,
  });
}

const runBoot = () => Promise.resolve().then(boot).catch(handleBootError);

// DOM がまだ構築中の場合、要素取得前に init されてイベントが張られない事故を避ける
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runBoot, { once: true });
} else {
  runBoot();
}
