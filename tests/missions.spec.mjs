import { test, expect } from '@playwright/test';
import {
  MISSION_TEMPLATES,
  getPeriodKey,
  normalizeMissionsProgress,
  recordMissionMetric,
  computeMissionState,
  claimMissions,
} from '../js/missions.js';

// Pure-logic spec (no browser) for issue #193: local daily/weekly/monthly
// missions. Verifies mission activation, completion detection, XP reward calc,
// and period reset across day/week/month boundaries by injecting fixed Dates.

// Fixed reference timestamps (local time). Using midday avoids any DST edge.
const DAY_A = new Date(2026, 0, 5, 12, 0, 0); // Mon 2026-01-05
const DAY_A_LATER = new Date(2026, 0, 5, 20, 0, 0); // same local day
const DAY_B = new Date(2026, 0, 6, 12, 0, 0); // Tue 2026-01-06 (next day, same ISO week)
const NEXT_WEEK = new Date(2026, 0, 12, 12, 0, 0); // Mon 2026-01-12 (next ISO week)
const NEXT_MONTH = new Date(2026, 1, 3, 12, 0, 0); // 2026-02-03 (next month)

test.describe('getPeriodKey – period boundaries (#193)', () => {
  test('daily key changes across a day boundary', () => {
    expect(getPeriodKey('daily', DAY_A)).toBe('2026-01-05');
    expect(getPeriodKey('daily', DAY_A_LATER)).toBe('2026-01-05');
    expect(getPeriodKey('daily', DAY_B)).toBe('2026-01-06');
    expect(getPeriodKey('daily', DAY_A)).not.toBe(getPeriodKey('daily', DAY_B));
  });

  test('weekly key is stable within an ISO week but changes next week', () => {
    // Mon 01-05 and Tue 01-06 are the same ISO week.
    expect(getPeriodKey('weekly', DAY_A)).toBe(getPeriodKey('weekly', DAY_B));
    // Next Monday is a different ISO week.
    expect(getPeriodKey('weekly', DAY_A)).not.toBe(getPeriodKey('weekly', NEXT_WEEK));
  });

  test('monthly key changes across a month boundary', () => {
    expect(getPeriodKey('monthly', DAY_A)).toBe('2026-01');
    expect(getPeriodKey('monthly', NEXT_MONTH)).toBe('2026-02');
  });
});

test.describe('recordMissionMetric + computeMissionState – activation & completion (#193)', () => {
  test('empty progress yields all missions incomplete with correct rewards', () => {
    const { missions } = computeMissionState(null, DAY_A);
    expect(missions.length).toBe(MISSION_TEMPLATES.length);
    for (const m of missions) {
      expect(m.progress).toBe(0);
      expect(m.completed).toBe(false);
      expect(m.claimed).toBe(false);
      const tpl = MISSION_TEMPLATES.find((t) => t.id === m.id);
      expect(m.xpReward).toBe(tpl.xpReward);
      expect(m.target).toBe(tpl.target);
    }
  });

  test('recording quiz answers advances the daily quiz mission and completes at target', () => {
    let progress = null;
    // daily_quiz_3 needs 3 quiz answers.
    progress = recordMissionMetric(progress, 'quiz', 1, DAY_A);
    progress = recordMissionMetric(progress, 'quiz', 1, DAY_A);
    let state = computeMissionState(progress, DAY_A);
    let daily = state.missions.find((m) => m.id === 'daily_quiz_3');
    expect(daily.progress).toBe(2);
    expect(daily.completed).toBe(false);

    progress = recordMissionMetric(progress, 'quiz', 1, DAY_A);
    state = computeMissionState(progress, DAY_A);
    daily = state.missions.find((m) => m.id === 'daily_quiz_3');
    expect(daily.progress).toBe(3);
    expect(daily.completed).toBe(true);
    expect(daily.progress01).toBe(1);
    // It appears in newlyCompleted until claimed.
    expect(state.newlyCompleted.map((m) => m.id)).toContain('daily_quiz_3');
  });

  test('a quiz answer feeds both daily and weekly quiz missions', () => {
    let progress = null;
    for (let i = 0; i < 3; i += 1) progress = recordMissionMetric(progress, 'quiz', 1, DAY_A);
    const state = computeMissionState(progress, DAY_A);
    expect(state.missions.find((m) => m.id === 'daily_quiz_3').progress).toBe(3);
    expect(state.missions.find((m) => m.id === 'weekly_quiz_20').progress).toBe(3);
  });

  test('the xp metric only feeds the monthly xp mission', () => {
    let progress = recordMissionMetric(null, 'xp', 500, DAY_A);
    const state = computeMissionState(progress, DAY_A);
    const monthly = state.missions.find((m) => m.id === 'monthly_xp_500');
    expect(monthly.progress).toBe(500);
    expect(monthly.completed).toBe(true);
  });

  test('invalid metric or non-positive amount is a no-op', () => {
    const base = recordMissionMetric(null, 'quiz', 1, DAY_A);
    expect(recordMissionMetric(base, 'bogus', 5, DAY_A)).toEqual(base);
    expect(recordMissionMetric(base, 'quiz', 0, DAY_A)).toEqual(base);
    expect(recordMissionMetric(base, 'quiz', -3, DAY_A)).toEqual(base);
  });
});

test.describe('claimMissions – reward receipt (#193)', () => {
  test('claiming marks a completed mission so it is no longer newlyCompleted', () => {
    let progress = null;
    for (let i = 0; i < 3; i += 1) progress = recordMissionMetric(progress, 'quiz', 1, DAY_A);
    expect(computeMissionState(progress, DAY_A).newlyCompleted.map((m) => m.id)).toContain('daily_quiz_3');

    progress = claimMissions(progress, ['daily_quiz_3'], DAY_A);
    const state = computeMissionState(progress, DAY_A);
    expect(state.missions.find((m) => m.id === 'daily_quiz_3').claimed).toBe(true);
    expect(state.newlyCompleted.map((m) => m.id)).not.toContain('daily_quiz_3');
  });

  test('claiming an incomplete mission does not mark it claimed', () => {
    let progress = recordMissionMetric(null, 'quiz', 1, DAY_A); // only 1/3
    progress = claimMissions(progress, ['daily_quiz_3'], DAY_A);
    expect(computeMissionState(progress, DAY_A).missions.find((m) => m.id === 'daily_quiz_3').claimed).toBe(false);
  });
});

test.describe('period reset across boundaries (#193)', () => {
  test('daily counters reset the next day but weekly counters persist', () => {
    let progress = null;
    for (let i = 0; i < 3; i += 1) progress = recordMissionMetric(progress, 'quiz', 1, DAY_A);
    progress = claimMissions(progress, ['daily_quiz_3'], DAY_A);

    // Next day: daily resets (progress 0, claimed cleared); weekly keeps its 3.
    const nextDay = computeMissionState(progress, DAY_B);
    const daily = nextDay.missions.find((m) => m.id === 'daily_quiz_3');
    expect(daily.progress).toBe(0);
    expect(daily.completed).toBe(false);
    expect(daily.claimed).toBe(false);
    expect(nextDay.missions.find((m) => m.id === 'weekly_quiz_20').progress).toBe(3);
  });

  test('weekly counters reset next week', () => {
    let progress = null;
    for (let i = 0; i < 5; i += 1) progress = recordMissionMetric(progress, 'quiz', 1, DAY_A);
    expect(computeMissionState(progress, DAY_A).missions.find((m) => m.id === 'weekly_quiz_20').progress).toBe(5);

    const norm = normalizeMissionsProgress(progress, NEXT_WEEK);
    expect(computeMissionState(norm, NEXT_WEEK).missions.find((m) => m.id === 'weekly_quiz_20').progress).toBe(0);
  });

  test('monthly counters reset next month', () => {
    let progress = recordMissionMetric(null, 'xp', 500, DAY_A);
    expect(computeMissionState(progress, DAY_A).missions.find((m) => m.id === 'monthly_xp_500').progress).toBe(500);

    const nextMonth = computeMissionState(progress, NEXT_MONTH);
    const monthly = nextMonth.missions.find((m) => m.id === 'monthly_xp_500');
    expect(monthly.progress).toBe(0);
    expect(monthly.completed).toBe(false);
  });

  test('recordMissionMetric on the next day rolls over and starts fresh', () => {
    let progress = null;
    for (let i = 0; i < 3; i += 1) progress = recordMissionMetric(progress, 'quiz', 1, DAY_A);
    // Record one on the next day: daily counter should be 1 (reset then +1),
    // weekly counter should be 4 (carried 3 + 1).
    progress = recordMissionMetric(progress, 'quiz', 1, DAY_B);
    const state = computeMissionState(progress, DAY_B);
    expect(state.missions.find((m) => m.id === 'daily_quiz_3').progress).toBe(1);
    expect(state.missions.find((m) => m.id === 'weekly_quiz_20').progress).toBe(4);
  });
});
