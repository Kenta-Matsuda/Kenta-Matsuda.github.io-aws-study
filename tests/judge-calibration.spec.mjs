import { test, expect } from '@playwright/test';
import {
  AXES, HUMAN_COLUMNS, seededRng, stratifiedSample, toCsv, parseCsv, normalizeHumanRows,
  weightedKappa, binaryKappa, spearman, passesThreshold, computeAgreement,
} from '../scripts/lib/judge-calibration-stats.mjs';

/**
 * Judge calibration tooling (issue #241 / #225 design §8.2, §8.5). Only the
 * statistics are tested here; the human scores themselves never live in the repo.
 */

const scores = (v) => Object.fromEntries(AXES.map((a) => [a, v]));

test.describe('judge calibration statistics', () => {
  test('weighted kappa, binary kappa and spearman on known inputs', () => {
    expect(weightedKappa([1, 2, 3, 4, 5], [1, 2, 3, 4, 5])).toBeCloseTo(1);
    expect(weightedKappa([1, 1, 5, 5], [5, 5, 1, 1])).toBeCloseTo(-1);
    expect(weightedKappa([3, 3, 3], [3, 3, 3])).toBe(1); // no variation, full agreement
    expect(weightedKappa([1, 2], [1])).toBeNull();
    expect(binaryKappa([true, false, true, false], [true, false, true, false])).toBeCloseTo(1);
    expect(binaryKappa([true, true, false, false], [true, false, true, false])).toBeCloseTo(0);
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1);
    expect(spearman([1, 1, 2], [1, 1, 2])).toBeCloseTo(1); // ties use average ranks
  });

  test('stratified sample keeps every judge outcome, is reproducible from the seed, and caps at n', () => {
    const items = [
      ...Array.from({ length: 40 }, (_, i) => ({ k: `p${i}`, judge: { outcome: 'pass' } })),
      ...Array.from({ length: 4 }, (_, i) => ({ k: `f${i}`, judge: { outcome: 'fix' } })),
      ...Array.from({ length: 2 }, (_, i) => ({ k: `r${i}`, judge: { outcome: 'reject' } })),
      { k: 'u0' },
    ];
    const a = stratifiedSample(items, { n: 30, seed: 7 });
    expect(a).toHaveLength(30);
    expect(new Set(a.map((x) => x.k)).size).toBe(30);
    const count = (o) => a.filter((x) => (x.judge?.outcome || 'unjudged') === o).length;
    expect(count('fix')).toBeGreaterThanOrEqual(3);
    expect(count('reject')).toBe(2); // all it has
    expect(count('unjudged')).toBe(1);
    expect(stratifiedSample(items, { n: 30, seed: 7 }).map((x) => x.k)).toEqual(a.map((x) => x.k));
    expect(stratifiedSample(items, { n: 30, seed: 8 }).map((x) => x.k)).not.toEqual(a.map((x) => x.k));
    expect(stratifiedSample(items.slice(0, 5), { n: 30 })).toHaveLength(5);
    expect(seededRng(1)()).toBe(seededRng(1)());
  });

  test('CSV round-trip keeps quotes, commas, newlines and Japanese; BOM is written and stripped', () => {
    const rows = [{ id: 'C01', accuracy: 4, verdict: 'pass', notes: '正解は妥当, ただし "常に" が気になる\n2 行目' }, { id: 'C02' }];
    const csv = toCsv(rows, HUMAN_COLUMNS);
    expect(csv.startsWith('﻿id,accuracy')).toBe(true);
    const back = parseCsv(csv);
    expect(back).toHaveLength(2);
    expect(back[0]).toMatchObject({ id: 'C01', accuracy: '4', verdict: 'pass', notes: rows[0].notes, fit: '' });
    expect(back[1].id).toBe('C02');
  });

  test('human rows: empty rows are skipped (unrated), partial or out-of-range rows are reported', () => {
    const { rows, problems, skipped } = normalizeHumanRows([
      { id: 'C01', accuracy: '5', uniqueness: '4', distractors: '3', fit: '4', cues: '5', verdict: 'PASS' },
      { id: 'C02', accuracy: '', uniqueness: '', distractors: '', fit: '', cues: '', verdict: '' },
      { id: 'C03', accuracy: '6', uniqueness: '4', distractors: '3', fit: '4', cues: '', verdict: 'maybe' },
    ]);
    expect(rows).toEqual([{ id: 'C01', scores: { accuracy: 5, uniqueness: 4, distractors: 3, fit: 4, cues: 5 }, verdict: 'pass' }]);
    expect(skipped).toBe(1);
    expect(problems.some((p) => p.includes('C03: accuracy'))).toBe(true);
    expect(problems.some((p) => p.includes('C03: cues'))).toBe(true);
    expect(problems.some((p) => p.includes('C03: verdict'))).toBe(true);
  });

  test('computeAgreement: per-axis stats, missing Judge scores, and a threshold sweep that finds the separating total', () => {
    // Human passes exactly the items whose Judge total is ≥ 20; the current
    // threshold (18) passes two items the human would fix.
    const totals = [25, 23, 21, 20, 19, 18, 15, 12];
    const human = totals.map((t, i) => ({ id: `C${i}`, scores: scores(Math.round(t / 5)), verdict: t >= 20 ? 'pass' : 'fix' }));
    human.push({ id: 'C99', scores: scores(3), verdict: 'fix' });
    const judge = Object.fromEntries(totals.map((t, i) => {
      const base = Math.floor(t / 5); const extra = t - base * 5;
      const s = Object.fromEntries(AXES.map((a, k) => [a, base + (k < extra ? 1 : 0)]));
      return [`C${i}`, { scores: s, verdict: t >= 20 ? 'pass' : 'fix' }];
    }));
    const res = computeAgreement(human, judge, { current: { minAxis: 3, minTotal: 18 } });
    expect(res.n).toBe(8);
    expect(res.missing).toEqual(['C99']);
    expect(res.verdict.exact).toBe(1);
    expect(res.humanPassRate).toBe(0.5);
    expect(res.current).toMatchObject({ minAxis: 3, minTotal: 18, passRecall: 1 });
    expect(res.current.passPrecision).toBeLessThan(1);
    expect(res.best[0].kappa).toBeCloseTo(1);
    expect(res.best[0].minTotal).toBe(20);
    expect(res.perAxis.accuracy.n).toBe(8);
    expect(passesThreshold(scores(4), { minAxis: 3, minTotal: 18 })).toBe(true);
    expect(passesThreshold({ ...scores(5), cues: 2 }, { minAxis: 3, minTotal: 18 })).toBe(false);
  });
});
