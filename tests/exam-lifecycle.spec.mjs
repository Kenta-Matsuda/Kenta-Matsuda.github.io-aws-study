import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { EXAM_LIFECYCLE } from '../js/data/exam-lifecycle.js';
import {
  LIFECYCLE_STATUSES,
  toLocalDateKey,
  getActiveLifecyclePhase,
  getExamLifecycleNotice,
} from '../js/examLifecycle.js';
import { parseExamDate } from '../js/examSchedule.js';
import { ALL_EXAMS, EXAM_CATEGORIES } from '../js/exams.js';
import { EXAM_MOCK_CONFIG, getExamLevel } from '../js/quiz.js';
import { buildExamGroundingPrompt } from '../js/chat.js';

// Exam version updates and retirements (AWS announcements as of 2026-10-16):
// MLA-C01 → MLA-C02, SAP-C02 → SAP-C03, DVA-C02 → DVA-C03, and ANS-C01 retiring
// with no successor. The study data keeps following the version that can still be
// taken; js/data/exam-lifecycle.js holds the schedule and js/examLifecycle.js picks
// the date-dependent notice shown in the banner, the sidebar badge and the AI chat.
//
// The first blocks are pure-logic (no browser) with a fixed "now", mirroring
// tests/exam-schedule.spec.mjs. The last block checks the banner in the real page.

const at = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0); // local noon
const STATUSES = Object.values(LIFECYCLE_STATUSES);
const AWS_HOSTS = ['aws.amazon.com', 'docs.aws.amazon.com'];

function nextDayKey(key) {
  const d = parseExamDate(key);
  d.setDate(d.getDate() + 1);
  return toLocalDateKey(d);
}

test.describe('examLifecycle – date logic', () => {
  test('toLocalDateKey formats the local calendar day', () => {
    expect(toLocalDateKey(at(2026, 1, 5))).toBe('2026-01-05');
    expect(toLocalDateKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
    expect(toLocalDateKey(new Date('invalid'))).toBeNull();
    expect(toLocalDateKey('2026-01-05')).toBeNull();
  });

  test('phase boundaries are inclusive on both ends', () => {
    const entry = EXAM_LIFECYCLE['sap-c02'];
    expect(getActiveLifecyclePhase(entry, at(2026, 10, 16)).status).toBe('updating');
    expect(getActiveLifecyclePhase(entry, new Date(2026, 10, 16, 23, 59)).status).toBe('updating');
    expect(getActiveLifecyclePhase(entry, new Date(2026, 10, 17, 0, 0)).status).toBe('superseded');
    expect(getActiveLifecyclePhase(entry, at(2030, 1, 1)).status).toBe('superseded');
  });

  test('missing entry / phases yield null', () => {
    expect(getActiveLifecyclePhase(null, at(2026, 10, 16))).toBeNull();
    expect(getActiveLifecyclePhase({ phases: [{ from: '2027-01-01', status: 'retired' }] }, at(2026, 10, 16))).toBeNull();
  });
});

test.describe('examLifecycle – announced schedule (2026-10-16)', () => {
  test('MLA / SAP / DVA are updating and ANS is retiring', () => {
    const now = at(2026, 10, 16);
    expect(getExamLifecycleNotice('mla-c01', { now })).toMatchObject({ status: 'updating', successorCode: 'MLA-C02' });
    expect(getExamLifecycleNotice('sap-c02', { now })).toMatchObject({ status: 'updating', successorCode: 'SAP-C03' });
    expect(getExamLifecycleNotice('dva-c02', { now })).toMatchObject({ status: 'updating', successorCode: 'DVA-C03' });
    expect(getExamLifecycleNotice('ans-c01', { now })).toMatchObject({ status: 'retiring', successorCode: null });
  });

  test('switches on the AWS dates', () => {
    expect(getExamLifecycleNotice('sap-c02', { now: at(2026, 11, 17) }).status).toBe('superseded');
    expect(getExamLifecycleNotice('dva-c02', { now: at(2026, 11, 30) }).status).toBe('updating');
    expect(getExamLifecycleNotice('dva-c02', { now: at(2026, 12, 1) }).status).toBe('superseded');
    expect(getExamLifecycleNotice('mla-c01', { now: at(2027, 1, 13) }).status).toBe('updating');
    expect(getExamLifecycleNotice('mla-c01', { now: at(2027, 1, 14) }).status).toBe('superseded');
    expect(getExamLifecycleNotice('ans-c01', { now: at(2026, 12, 31) }).status).toBe('retiring');
    expect(getExamLifecycleNotice('ans-c01', { now: at(2027, 1, 1) }).status).toBe('retired');
  });

  test('exams without an announced change have no notice (CLF-C02 stays current)', () => {
    for (const id of ['clf-c02', 'aif-c01', 'saa-c03', 'soa-c03', 'dea-c01', 'dop-c02', 'aip-c01', 'scs-c03', 'aib-c01']) {
      expect(getExamLifecycleNotice(id, { now: at(2026, 10, 16) })).toBeNull();
    }
    expect(getExamLifecycleNotice('', { now: at(2026, 10, 16) })).toBeNull();
    expect(getExamLifecycleNotice('toString', { now: at(2026, 10, 16) })).toBeNull();
  });

  test('localizes the message and source URLs', () => {
    const now = at(2026, 10, 16);
    const ja = getExamLifecycleNotice('sap-c02', { now, locale: 'ja' });
    const en = getExamLifecycleNotice('sap-c02', { now, locale: 'en' });
    expect(ja.message).toContain('2026年11月16日');
    expect(en.message).toContain('November 16, 2026');
    expect(ja.sources.some((s) => s.url.startsWith('https://aws.amazon.com/jp/'))).toBe(true);
    expect(en.sources.every((s) => !s.url.includes('/jp/') && !s.url.includes('/ja_jp/'))).toBe(true);
  });

  test('AI-translated locales (e.g. ko) fall back to the English message, not Japanese (#197)', () => {
    const now = at(2026, 10, 16);
    const ko = getExamLifecycleNotice('sap-c02', { now, locale: 'ko' });
    const en = getExamLifecycleNotice('sap-c02', { now, locale: 'en' });
    expect(ko.message).toBe(en.message);
    expect(ko.sources).toEqual(en.sources);
  });
});

test.describe('exam-lifecycle.js – data integrity', () => {
  const examIds = new Set(ALL_EXAMS.map((e) => e.id));

  for (const [examId, entry] of Object.entries(EXAM_LIFECYCLE)) {
    test(`${examId}: phases, messages and sources are well-formed`, () => {
      expect(examIds.has(examId)).toBe(true);
      const code = ALL_EXAMS.find((e) => e.id === examId).code;

      if (entry.successorCode !== null) expect(entry.successorCode).toMatch(/^[A-Z]{3}-C\d{2}$/);
      expect(parseExamDate(entry.verifiedAt)).not.toBeNull();

      const phases = entry.phases;
      expect(phases.length).toBeGreaterThan(0);
      expect(phases[0].from).toBeUndefined(); // starts open-ended
      expect(phases[phases.length - 1].until).toBeUndefined(); // never disappears
      phases.forEach((phase, i) => {
        expect(STATUSES).toContain(phase.status);
        const retirement = phase.status === 'retiring' || phase.status === 'retired';
        expect(retirement).toBe(entry.successorCode === null);
        if (phase.from) expect(parseExamDate(phase.from)).not.toBeNull();
        if (phase.until) expect(parseExamDate(phase.until)).not.toBeNull();
        if (i > 0) expect(phase.from).toBe(nextDayKey(phases[i - 1].until)); // contiguous
        for (const text of [phase.message, phase.messageEn]) {
          expect(typeof text).toBe('string');
          expect(text).toContain(code);
          if (entry.successorCode) expect(text).toContain(entry.successorCode);
        }
      });

      expect(entry.sources.length).toBeGreaterThan(0);
      for (const source of entry.sources) {
        expect(source.title && source.titleEn).toBeTruthy();
        for (const url of [source.url, source.urlEn]) {
          const { protocol, hostname } = new URL(url);
          expect(protocol).toBe('https:');
          expect(AWS_HOSTS).toContain(hostname);
        }
      }
    });
  }

  test('every status has a title and badge string in ja and en', () => {
    for (const lang of ['ja', 'en']) {
      const dict = JSON.parse(readFileSync(`js/locales/${lang}.json`, 'utf8')).examLifecycle;
      expect(typeof dict.sources).toBe('string');
      for (const status of STATUSES) {
        expect(typeof dict.title[status]).toBe('string');
        expect(typeof dict.badge[status]).toBe('string');
      }
    }
  });
});

test.describe('mock exam parameters follow the official exam format', () => {
  test('AIF-C01 is 65 questions / 90 minutes and AIP-C01 is 75 questions / 180 minutes', () => {
    expect(EXAM_MOCK_CONFIG['aif-c01']).toMatchObject({ questionCount: 65, timeLimitMin: 90 });
    expect(EXAM_MOCK_CONFIG['aip-c01']).toMatchObject({ questionCount: 75, timeLimitMin: 180 });
  });

  test('every exam has a mock config whose level matches its sidebar category', () => {
    for (const exam of ALL_EXAMS) {
      const category = EXAM_CATEGORIES.find((c) => c.examIds.includes(exam.id));
      expect(EXAM_MOCK_CONFIG[exam.id], exam.id).toBeTruthy();
      expect(getExamLevel(exam.id), exam.id).toBe(category.labelEn);
    }
  });
});

test.describe('AI chat grounding includes the version schedule', () => {
  const exam = ALL_EXAMS.find((e) => e.id === 'sap-c02');
  const now = at(2026, 10, 16);

  test('Japanese prompt states the schedule and that the successor exists', () => {
    const lifecycleNotice = getExamLifecycleNotice('sap-c02', { now, locale: 'ja' });
    const prompt = buildExamGroundingPrompt(exam, { isJa: true, lifecycleNotice });
    expect(prompt).toContain('【試験バージョンの改定・廃止予定（AWS 公式発表）】');
    expect(prompt).toContain(lifecycleNotice.message);
    expect(prompt).toContain('SAP-C03 は AWS が発表済みの実在する試験バージョンです');
    expect(prompt).toContain('https://aws.amazon.com/jp/blogs/news/september-2026-new-offerings/');
  });

  test('English prompt states the schedule; no block without a notice', () => {
    const lifecycleNotice = getExamLifecycleNotice('sap-c02', { now, locale: 'en' });
    const prompt = buildExamGroundingPrompt(exam, { isJa: false, lifecycleNotice });
    expect(prompt).toContain('[Exam version update / retirement — announced by AWS]');
    expect(prompt).toContain('SAP-C03 is a real, announced exam version');
    expect(buildExamGroundingPrompt(exam, { isJa: false })).not.toContain('announced by AWS]');
    expect(buildExamGroundingPrompt(exam, { isJa: true })).not.toContain('改定・廃止予定');
  });

  test('retirement notices do not invent a successor', () => {
    const lifecycleNotice = getExamLifecycleNotice('ans-c01', { now, locale: 'en' });
    const ansExam = ALL_EXAMS.find((e) => e.id === 'ans-c01');
    const prompt = buildExamGroundingPrompt(ansExam, { isJa: false, lifecycleNotice });
    expect(prompt).toContain('December 31, 2026');
    expect(prompt).not.toContain('is a real, announced exam version');
  });
});

test.describe('exam lifecycle banner – browser', () => {
  async function open(page, { hash, locale = 'ja', date }) {
    await page.clock.setFixedTime(date);
    await page.addInitScript((lang) => {
      localStorage.setItem('asn_locale', lang);
      localStorage.setItem(
        'asn_study_state_v1',
        JSON.stringify({ schemaVersion: 2, profile: { name: 'testuser' }, xp: { total: 0, history: [], weekRing: [] }, quizHistory: [] }),
      );
    }, locale);
    await page.goto(`/#${hash}`);
    // Locator waits poll from the test runner, so they are not affected by the fixed clock
    // (an in-page waitForFunction poll stalls under page.clock in Chromium).
    await page.locator('#examSidebarContent .exam-sidebar-item[data-exam-id]').first().waitFor({ state: 'attached' });
  }

  test('SAP-C02 shows the SAP-C03 schedule and a sidebar badge', async ({ page }) => {
    await open(page, { hash: 'sap', date: at(2026, 10, 20) });
    const box = page.locator('#examLifecycleNotice');
    await expect(box).not.toHaveClass(/(^|\s)hidden(\s|$)/);
    await expect(box).toHaveAttribute('data-lifecycle-status', 'updating');
    await expect(page.locator('#examLifecycleNoticeTitle')).toHaveText('SAP-C03 への改定のお知らせ');
    await expect(page.locator('#examLifecycleNoticeText')).toContainText('2026年11月16日');
    await expect(page.locator('#examLifecycleNoticeSources a').first()).toHaveAttribute('href', /^https:\/\/aws\.amazon\.com\//);
    await expect(page.locator('.exam-sidebar-item[data-exam-id="sap-c02"] .exam-lifecycle-badge')).toHaveText('改定予定');
    await expect(page.locator('.exam-sidebar-item[data-exam-id="clf-c02"] .exam-lifecycle-badge')).toHaveCount(0);
  });

  test('after the last day the banner says the exam was superseded', async ({ page }) => {
    await open(page, { hash: 'sap', date: at(2026, 11, 20) });
    await expect(page.locator('#examLifecycleNotice')).toHaveAttribute('data-lifecycle-status', 'superseded');
    await expect(page.locator('#examLifecycleNoticeTitle')).toHaveText('SAP-C03 へ改定されました');
  });

  test('CLF-C02 shows no banner, and switching to the beginner guide hides it', async ({ page }) => {
    const box = page.locator('#examLifecycleNotice');
    const hidden = /(^|\s)hidden(\s|$)/;
    await open(page, { hash: 'clf', date: at(2026, 10, 20) });
    await expect(box).toHaveClass(hidden);
    // Switch via the sidebar (dispatchEvent: the sidebar drawer is off-canvas until opened).
    await page.locator('.exam-sidebar-item[data-exam-id="sap-c02"]').dispatchEvent('click');
    await expect(box).not.toHaveClass(hidden);
    await page.locator('.exam-sidebar-item[data-exam-id="__beginner__"]').dispatchEvent('click');
    await expect(box).toHaveClass(hidden);
  });

  test('English: ANS-C01 retirement notice and badge', async ({ page }) => {
    await open(page, { hash: 'ans', locale: 'en', date: at(2026, 10, 20) });
    await expect(page.locator('#examLifecycleNoticeTitle')).toHaveText('ANS-C01 is being retired');
    await expect(page.locator('#examLifecycleNoticeText')).toContainText('December 31, 2026');
    await expect(page.locator('#examLifecycleNoticeSources')).toContainText('Sources (AWS):');
    await expect(page.locator('.exam-sidebar-item[data-exam-id="ans-c01"] .exam-lifecycle-badge')).toHaveText('Retiring');
  });
});
