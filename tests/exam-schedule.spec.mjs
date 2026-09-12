import { test, expect } from '@playwright/test';
import {
  EXAM_STAGES,
  parseExamDate,
  daysUntilExam,
  stageForDaysUntil,
  describeExamSchedule,
  messageKeyForStage,
  shouldCelebratePass,
} from '../js/examSchedule.js';

// Pure-logic spec (no browser) for issue #200: users asked to register a planned
// exam date so that the in-app message changes as the date approaches, with a
// pass celebration at the end. The date math and stage selection live in
// js/examSchedule.js as a DOM/network-free pure module (mirroring js/resourceSearch.js
// and js/markdown.js) so they can be unit-tested by injecting a fixed "now".
//
// Playwright cannot run in the INTEGRATIONS_ONLY sandbox (npm registry 403, no
// cached browsers), but this spec is a pure-module regression: it imports the
// module directly and would fail if the boundary math or stage selection
// regressed. Use a fixed "now" so the assertions are deterministic.

const NOW = new Date(2026, 0, 1, 12, 0, 0); // 2026-01-01 local noon

test.describe('daysUntilExam – local-day math (#200)', () => {
  test('same calendar day is 0 regardless of time-of-day', () => {
    expect(daysUntilExam('2026-01-01', NOW)).toBe(0);
    // even late in the day, the target that day is still "today" (0 days).
    expect(daysUntilExam('2026-01-01', new Date(2026, 0, 1, 23, 59))).toBe(0);
  });

  test('future dates count forward, past dates are negative', () => {
    expect(daysUntilExam('2026-01-02', NOW)).toBe(1);
    expect(daysUntilExam('2026-01-08', NOW)).toBe(7);
    expect(daysUntilExam('2026-01-31', NOW)).toBe(30);
    expect(daysUntilExam('2026-02-01', NOW)).toBe(31);
    expect(daysUntilExam('2025-12-31', NOW)).toBe(-1);
  });

  test('invalid or empty targets return null', () => {
    expect(daysUntilExam('', NOW)).toBeNull();
    expect(daysUntilExam('not-a-date', NOW)).toBeNull();
    expect(daysUntilExam('2026-02-30', NOW)).toBeNull(); // rolled-over date rejected
    expect(daysUntilExam(null, NOW)).toBeNull();
  });
});

test.describe('parseExamDate – normalization (#200)', () => {
  test('parses YYYY-MM-DD as a local calendar day', () => {
    const d = parseExamDate('2026-03-15');
    expect(d).not.toBeNull();
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
  });

  test('rejects malformed month/day', () => {
    expect(parseExamDate('2026-13-01')).toBeNull();
    expect(parseExamDate('2026-00-10')).toBeNull();
    expect(parseExamDate('2026-04-31')).toBeNull();
  });
});

test.describe('stageForDaysUntil – boundaries (#200)', () => {
  test('selects the correct stage across every boundary', () => {
    // past
    expect(stageForDaysUntil(-1)).toBe(EXAM_STAGES.PAST);
    // today
    expect(stageForDaysUntil(0)).toBe(EXAM_STAGES.TODAY);
    // imminent: 1..7
    expect(stageForDaysUntil(1)).toBe(EXAM_STAGES.IMMINENT);
    expect(stageForDaysUntil(7)).toBe(EXAM_STAGES.IMMINENT);
    // soon: 8..30
    expect(stageForDaysUntil(8)).toBe(EXAM_STAGES.SOON);
    expect(stageForDaysUntil(30)).toBe(EXAM_STAGES.SOON);
    // far: 31+
    expect(stageForDaysUntil(31)).toBe(EXAM_STAGES.FAR);
    expect(stageForDaysUntil(365)).toBe(EXAM_STAGES.FAR);
  });

  test('null / non-finite input yields null stage', () => {
    expect(stageForDaysUntil(null)).toBeNull();
    expect(stageForDaysUntil(undefined)).toBeNull();
    expect(stageForDaysUntil(NaN)).toBeNull();
  });
});

test.describe('describeExamSchedule – combined (#200)', () => {
  test('returns matching daysUntil and stage as the date approaches', () => {
    expect(describeExamSchedule('2026-06-01', NOW)).toEqual({ daysUntil: 151, stage: EXAM_STAGES.FAR });
    expect(describeExamSchedule('2026-01-20', NOW)).toEqual({ daysUntil: 19, stage: EXAM_STAGES.SOON });
    expect(describeExamSchedule('2026-01-05', NOW)).toEqual({ daysUntil: 4, stage: EXAM_STAGES.IMMINENT });
    expect(describeExamSchedule('2026-01-01', NOW)).toEqual({ daysUntil: 0, stage: EXAM_STAGES.TODAY });
    expect(describeExamSchedule('2025-12-25', NOW)).toEqual({ daysUntil: -7, stage: EXAM_STAGES.PAST });
    expect(describeExamSchedule('', NOW)).toEqual({ daysUntil: null, stage: null });
  });
});

test.describe('messageKeyForStage – i18n key mapping (#200)', () => {
  test('maps every stage to examDate.stage.<stage>', () => {
    expect(messageKeyForStage(EXAM_STAGES.FAR)).toBe('examDate.stage.far');
    expect(messageKeyForStage(EXAM_STAGES.SOON)).toBe('examDate.stage.soon');
    expect(messageKeyForStage(EXAM_STAGES.IMMINENT)).toBe('examDate.stage.imminent');
    expect(messageKeyForStage(EXAM_STAGES.TODAY)).toBe('examDate.stage.today');
    expect(messageKeyForStage(EXAM_STAGES.PAST)).toBe('examDate.stage.past');
  });

  test('null / unknown stage yields null key', () => {
    expect(messageKeyForStage(null)).toBeNull();
    expect(messageKeyForStage('bogus')).toBeNull();
  });
});

test.describe('shouldCelebratePass – one-shot celebration (#200)', () => {
  test('celebrates only when passed and not yet celebrated', () => {
    expect(shouldCelebratePass({ passed: true, alreadyCelebrated: false })).toBe(true);
    expect(shouldCelebratePass({ passed: true, alreadyCelebrated: true })).toBe(false);
    expect(shouldCelebratePass({ passed: false, alreadyCelebrated: false })).toBe(false);
    expect(shouldCelebratePass({})).toBe(false);
    expect(shouldCelebratePass()).toBe(false);
  });
});
