import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { initI18n, setLocale, getLocalizedUrl } from '../js/i18n.js';
import {
  localizedPair,
  localizedField,
  localizedValue,
  pickLocalized,
  registerContentOverlay,
  clearContentOverlays,
  translateContent,
  loadContentOverlays,
  usesJapanesePrompt,
  promptLanguageName,
  outputLanguageDirective,
} from '../js/localeContent.js';
import { buildQuizSystemPrompt, buildSpeedQuizSystemPrompt, buildMockQuizSystemPrompt, buildGeneralQuizUserPrompt } from '../js/quiz.js';
import { buildEditorPrompt, buildSolverPrompt } from '../js/examJudge.js';
import { buildPlannerPrompt } from '../js/examPipeline.js';
import { buildExamGroundingPrompt } from '../js/chat.js';
import { renderUnitForPrompt } from '../js/cards.js';
import { getOfflineExamQuestions } from '../js/data/offline-exam-bank.js';
import { getDailyChallengeQuestions } from '../js/data/daily-challenge.js';
import { taskStatementLines } from '../js/roadmapTaskStatement.js';
import { collectResourceItems } from '../js/studyPack.js';
import {
  collectSourceStrings,
  checkTranslation,
  validateOverlay,
  buildOverlayTemplate,
  buildIndex,
  loadSource,
  listSourceIds,
} from '../scripts/content-overlay.mjs';

/**
 * Pure-logic spec (no browser) for issue #197 phase 1:
 *   - the localized-field accessor and its fallback order,
 *   - content overlays (registration, lazy loader, extraction / validation script),
 *   - AI prompt language selection for locales beyond ja/en,
 *   - data modules (question banks, task statements, study pack) on a new locale.
 */

function stubGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

function useLocale(locale) {
  const store = {};
  stubGlobal('document', { documentElement: { lang: '' }, querySelectorAll: () => [] });
  stubGlobal('localStorage', {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  });
  stubGlobal('navigator', { language: 'en-US', languages: ['en-US'] });
  const dict = { quiz: { recommendedResources: 'R' } };
  initI18n({ ja: dict, en: dict, ko: dict, fr: dict, 'zh-TW': dict }, {});
  setLocale(locale);
}

test.beforeEach(() => {
  clearContentOverlays();
});

test.describe('localizedField – fallback order (#197)', () => {
  const step = { title: 'Register for the exam', jpTitle: '試験の申し込み' };
  const item = { title: '公式ページ', titleEn: 'Official page', note: 'メモ' };
  const category = { labelJa: '基礎', labelEn: 'Foundational' };

  test('resolves the three data-field conventions', () => {
    expect(localizedPair(step, 'title')).toEqual({ ja: '試験の申し込み', en: 'Register for the exam' });
    expect(localizedPair(item, 'title')).toEqual({ ja: '公式ページ', en: 'Official page' });
    expect(localizedPair(category, 'label')).toEqual({ ja: '基礎', en: 'Foundational' });
    expect(localizedPair(null, 'title')).toEqual({ ja: undefined, en: undefined });
  });

  test('ja → Japanese, en → English, each falling back to the other', () => {
    expect(localizedField(step, 'title', 'ja')).toBe('試験の申し込み');
    expect(localizedField(step, 'title', 'en')).toBe('Register for the exam');
    expect(localizedField(item, 'note', 'en')).toBe('メモ'); // no noteEn
    expect(localizedField({ title: 'Only English', jpTitle: '' }, 'title', 'ja')).toBe('Only English');
  });

  test('other locales: overlay translation, else English, never Japanese while English exists', () => {
    expect(localizedField(step, 'title', 'ko')).toBe('Register for the exam');
    expect(localizedField(item, 'title', 'fr')).toBe('Official page');
    // Japanese only when the item has no English at all.
    expect(localizedField(item, 'note', 'ko')).toBe('メモ');
    registerContentOverlay('ko', { 'Register for the exam': '시험 등록', メモ: '메모', '': 'ignored' });
    expect(localizedField(step, 'title', 'ko')).toBe('시험 등록');
    expect(localizedField(item, 'note', 'ko')).toBe('메모');
    // Other locales are unaffected; ja / en never consult overlays.
    expect(localizedField(step, 'title', 'fr')).toBe('Register for the exam');
    expect(localizedField(step, 'title', 'en')).toBe('Register for the exam');
    expect(localizedField(step, 'title', 'ja')).toBe('試験の申し込み');
  });

  test('arrays are translated element by element; empty translations are ignored', () => {
    const task = { description: ['一', '二'], descriptionEn: ['One', 'Two'] };
    registerContentOverlay('ko', { One: '하나', Two: '' });
    expect(localizedField(task, 'description', 'ko')).toEqual(['하나', 'Two']);
    expect(localizedField(task, 'description', 'ja')).toEqual(['一', '二']);
    expect(translateContent('Two', 'ko')).toBeUndefined();
  });

  test('localizedValue: explicit locale key, else ja / en rules', () => {
    expect(localizedValue({ ja: '出典', en: 'Reference', ko: '출처' }, 'ko')).toBe('출처');
    expect(localizedValue({ ja: '出典', en: 'Reference' }, 'fr')).toBe('Reference');
    expect(localizedValue({ ja: '出典', en: 'Reference' }, 'ja')).toBe('出典');
    expect(pickLocalized({ ja: 'ア', en: '' }, 'de')).toBe('ア');
  });

  test('defaults to the current i18n locale', () => {
    useLocale('ko');
    registerContentOverlay('ko', { 'Register for the exam': '시험 등록' });
    expect(localizedField(step, 'title')).toBe('시험 등록');
    useLocale('ja');
    expect(localizedField(step, 'title')).toBe('試験の申し込み');
  });
});

test.describe('content overlay loader (#197)', () => {
  function fakeFetch(files) {
    const calls = [];
    const impl = async (url) => {
      calls.push(url);
      if (!(url in files)) return { ok: false, json: async () => ({}) };
      return { ok: true, json: async () => files[url] };
    };
    return { impl, calls };
  }
  const base = '/x/';
  const files = {
    '/x/index.json': { locales: { ko: ['clf-c02', 'common'] } },
    '/x/ko/clf-c02.json': { locale: 'ko', source: 'clf-c02', strings: { Hello: '안녕' } },
    '/x/ko/common.json': { locale: 'ko', source: 'common', strings: { Close: '닫기' } },
  };

  test('fetches only files listed in the manifest, once', async () => {
    const { impl, calls } = fakeFetch(files);
    expect(await loadContentOverlays('ko', ['clf-c02', 'saa-c03'], { base, fetchImpl: impl })).toBe(true);
    expect(translateContent('Hello', 'ko')).toBe('안녕');
    expect(calls).toEqual(['/x/index.json', '/x/ko/clf-c02.json']);
    expect(await loadContentOverlays('ko', ['clf-c02'], { base, fetchImpl: impl })).toBe(false);
    expect(await loadContentOverlays('ko', ['common'], { base, fetchImpl: impl })).toBe(true);
    expect(calls).toEqual(['/x/index.json', '/x/ko/clf-c02.json', '/x/ko/common.json']);
  });

  test('ja / en never fetch; unlisted locales and network errors are no-ops', async () => {
    const { impl, calls } = fakeFetch(files);
    expect(await loadContentOverlays('ja', ['clf-c02'], { base, fetchImpl: impl })).toBe(false);
    expect(await loadContentOverlays('en', ['clf-c02'], { base, fetchImpl: impl })).toBe(false);
    expect(calls).toEqual([]);
    expect(await loadContentOverlays('fr', ['clf-c02'], { base, fetchImpl: impl })).toBe(false);
    clearContentOverlays();
    const failing = async () => { throw new Error('offline'); };
    expect(await loadContentOverlays('ko', ['clf-c02'], { base, fetchImpl: failing })).toBe(false);
  });
});

test.describe('AI prompt language (#197)', () => {
  test('directive only for locales beyond ja / en', () => {
    expect(outputLanguageDirective('ja')).toBe('');
    expect(outputLanguageDirective('en')).toBe('');
    const ko = outputLanguageDirective('ko');
    expect(ko).toContain('Korean (한국어)');
    expect(ko).toContain('official English form');
    expect(outputLanguageDirective('zh-TW')).toContain('Traditional Chinese (中文(繁體))');
    expect(promptLanguageName('ja')).toBe('Japanese (日本語)');
    expect(usesJapanesePrompt('ja')).toBe(true);
    expect(usesJapanesePrompt('ko')).toBe(false);
  });

  test('quiz system prompts: English scaffolding + target language for ko; unchanged for en; Japanese for ja', () => {
    useLocale('en');
    const en = [buildQuizSystemPrompt('SAA-C03', 'SAA'), buildSpeedQuizSystemPrompt('SAA-C03', 'SAA'), buildMockQuizSystemPrompt('SAA-C03', 'SAA', 'Associate')];
    en.forEach((p) => {
      expect(p).toContain('You MUST output ONLY the following JSON format');
      expect(p).not.toContain('[Output Language]');
    });
    useLocale('ko');
    const ko = [buildQuizSystemPrompt('SAA-C03', 'SAA'), buildSpeedQuizSystemPrompt('SAA-C03', 'SAA'), buildMockQuizSystemPrompt('SAA-C03', 'SAA', 'Associate')];
    ko.forEach((p, i) => {
      expect(p.startsWith(en[i])).toBe(true);
      expect(p).toContain('[Output Language]');
      expect(p).toContain('Korean (한국어)');
    });
    useLocale('ja');
    expect(buildQuizSystemPrompt('SAA-C03', 'SAA')).toContain('あなたはAWS認定試験のエキスパートです');
    expect(buildQuizSystemPrompt('SAA-C03', 'SAA')).not.toContain('[Output Language]');
  });

  test('user prompts and pipeline stages use English scaffolding for non-ja locales', () => {
    useLocale('fr');
    const domain = { title: 'Design Secure Architectures', jpTitle: 'セキュアなアーキテクチャの設計', tasks: [] };
    expect(buildGeneralQuizUserPrompt('SAA-C03', domain)).toContain('Design Secure Architectures');
    expect(buildSolverPrompt({ question: 'Q', choices: ['A. a', 'B. b', 'C. c', 'D. d'] }).systemPrompt).toContain('experienced AWS certification candidate');
    const editor = buildEditorPrompt({ question: { question: 'Q', choices: ['A. a', 'B. b', 'C. c', 'D. d'], correctIndex: 0, explanation: 'E' }, issues: ['x'] });
    expect(editor.systemPrompt).toContain('French (Français)');
    const plan = buildPlannerPrompt({ exam: { code: 'SAA-C03' }, blueprint: [] });
    expect(plan.systemPrompt).toContain('chief examiner');
    expect(renderUnitForPrompt({ kind: 'concept', card: { source: { title: 's', url: 'u' } }, detail: { term: 'T', definition: 'D' } }, { locale: 'fr' })).toContain('[Concept card]');
  });

  test('chat grounding prompt answers in the requested language', () => {
    const exam = { code: 'SAA-C03', shortLabel: 'SAA', title: 'AWS Certified Solutions Architect - Associate' };
    expect(buildExamGroundingPrompt(exam, { isJa: false })).toContain('Respond in English.');
    const ko = buildExamGroundingPrompt(exam, { isJa: false, responseLanguage: 'Korean (한국어)' });
    expect(ko).toContain('Respond in Korean (한국어).');
    expect(ko).toContain('official English form');
  });
});

test.describe('data modules on a new locale (#197)', () => {
  test('offline / daily banks fall back to English (not Japanese) and use overlays', () => {
    const [ko] = getOfflineExamQuestions('saa-c03', 1, { locale: 'ko', seed: 's' });
    const [en] = getOfflineExamQuestions('saa-c03', 1, { locale: 'en', seed: 's' });
    expect(ko.question).toBe(en.question);
    expect(ko.choices).toEqual(en.choices);
    expect(ko.question).not.toMatch(/[ぁ-んァ-ン]/);
    expect(ko.explanation).toContain('출처:');
    expect(ko.explanation).toMatch(/docs\.aws\.amazon\.com\/ko_kr\//);
    registerContentOverlay('ko', { [en.question]: '번역된 질문' });
    expect(getOfflineExamQuestions('saa-c03', 1, { locale: 'ko', seed: 's' })[0].question).toBe('번역된 질문');
    const daily = getDailyChallengeQuestions(5, new Date('2026-10-13T12:00:00'), 'de');
    const dailyEn = getDailyChallengeQuestions(5, new Date('2026-10-13T12:00:00'), 'en');
    expect(daily.map((q) => q.question)).toEqual(dailyEn.map((q) => q.question));
  });

  test('task statements and the study pack follow the same rules', () => {
    const task = { description: ['タスク 1.1'], descriptionEn: ['Task 1.1: Design'] };
    expect(taskStatementLines(task, 'it')).toEqual(['Task 1.1: Design']);
    registerContentOverlay('it', { 'Task 1.1: Design': 'Attività 1.1: Progettare' });
    expect(taskStatementLines(task, 'it')).toEqual(['Attività 1.1: Progettare']);
    const exam = { id: 'x', code: 'X', steps: [{ id: '1', title: 'Step', jpTitle: 'ステップ', resources: [{ key: 'docs', label: 'ドキュメント', labelEn: 'Docs', items: [{ title: 'ガイド', titleEn: 'Guide', url: 'https://docs.aws.amazon.com/ja_jp/s3/latest/userguide/x.html' }] }] }] };
    const [item] = collectResourceItems(exam, { locale: 'es' });
    expect(item).toMatchObject({ stepTitle: 'Step', group: 'Docs', title: 'Guide', url: 'https://docs.aws.amazon.com/es_es/s3/latest/userguide/x.html' });
    expect(collectResourceItems(exam, { locale: 'ja' })[0].url).toBe('https://docs.aws.amazon.com/ja_jp/s3/latest/userguide/x.html');
  });

  test('getLocalizedUrl points docs links at the locale and keeps ja unchanged', () => {
    useLocale('zh-TW');
    expect(getLocalizedUrl('https://docs.aws.amazon.com/ja_jp/s3/x.html', 'https://docs.aws.amazon.com/s3/x.html')).toBe('https://docs.aws.amazon.com/zh_tw/s3/x.html');
    useLocale('ja');
    expect(getLocalizedUrl('https://docs.aws.amazon.com/ja_jp/s3/x.html', 'https://docs.aws.amazon.com/s3/x.html')).toBe('https://docs.aws.amazon.com/ja_jp/s3/x.html');
  });
});

test.describe('content overlay script (#197)', () => {
  test('collectSourceStrings: English source, Japanese only without English, de-duplicated', () => {
    const data = {
      title: 'Exam', subtitle: '副題', subtitleEn: 'Subtitle', url: 'https://x',
      steps: [
        { id: '1', title: 'Step', jpTitle: 'ステップ', knowledge: ['知識'], knowledgeEn: ['Knowledge'] },
        { resources: [{ key: 'k', label: 'ラベル', labelEn: 'Label', items: [{ title: '和文のみ', note: 'メモ', noteEn: 'Note' }, { title: 'T', titleEn: 'Step' }] }] },
      ],
    };
    expect(collectSourceStrings(data)).toEqual(['Exam', 'Subtitle', 'Step', 'Knowledge', 'Label', '和文のみ', 'Note']);
  });

  test('checkTranslation keeps URLs, placeholders, leading markers and section numbers', () => {
    expect(checkTranslation('- Skill 1.2.3: See https://docs.aws.amazon.com/x', '- Compétence 1.2.3 : voir https://docs.aws.amazon.com/x')).toEqual([]);
    expect(checkTranslation('See https://a.example/x', 'Voir')).toEqual(['URL missing: https://a.example/x']);
    expect(checkTranslation('Hi {{name}}', 'Salut')).toEqual(['placeholder missing: {{name}}']);
    expect(checkTranslation('- item', 'élément')).toEqual(['leading "-" marker missing']);
    expect(checkTranslation('Task 1.1', 'Tâche')).toEqual(['section number missing: 1.1']);
    expect(checkTranslation('anything', '')).toEqual([]);
  });

  test('validateOverlay reports stale keys, untranslated strings and broken translations', () => {
    const r = validateOverlay({ locale: 'ko', source: 'x', strings: { A: '가', 'Task 1.1': '작업', Old: '구' } }, ['A', 'Task 1.1', 'B'], { locale: 'ko', source: 'x' });
    expect(r.stale).toEqual(['Old']);
    expect(r.untranslated).toEqual(['B']);
    expect(r.translated).toBe(2);
    expect(r.errors).toHaveLength(1);
    expect(validateOverlay({ locale: 'fr', strings: {} }, [], { locale: 'ko' }).errors[0]).toContain('does not match');
    expect(validateOverlay({ strings: [] }, []).errors).toEqual(['"strings" must be an object']);
  });

  test('buildOverlayTemplate keeps translations and prunes stale keys on request', () => {
    const prev = { locale: 'ko', source: 'x', machineTranslated: true, strings: { A: '가', Old: '구' } };
    expect(buildOverlayTemplate('ko', 'x', ['A', 'B'], prev).strings).toEqual({ A: '가', B: '', Old: '구' });
    expect(buildOverlayTemplate('ko', 'x', ['A', 'B'], prev, { prune: true }).strings).toEqual({ A: '가', B: '' });
  });

  test('every committed overlay validates against the current data and the manifest is current', async () => {
    const dir = 'js/data/i18n';
    expect(JSON.parse(readFileSync(`${dir}/index.json`, 'utf8'))).toEqual(buildIndex());
    const ids = new Set(await listSourceIds());
    for (const locale of readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
      for (const f of readdirSync(`${dir}/${locale}`).filter((x) => x.endsWith('.json'))) {
        const id = f.replace(/\.json$/, '');
        expect(ids.has(id), `${locale}/${f} source id`).toBe(true);
        const overlay = JSON.parse(readFileSync(`${dir}/${locale}/${f}`, 'utf8'));
        const r = validateOverlay(overlay, collectSourceStrings(await loadSource(id)), { locale, source: id });
        expect(r.errors, `${locale}/${f}`).toEqual([]);
        expect(r.stale, `${locale}/${f} stale`).toEqual([]);
        expect(r.untranslated, `${locale}/${f} untranslated`).toEqual([]);
      }
    }
    expect(existsSync(dir)).toBe(true);
  });
});
