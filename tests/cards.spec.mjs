import { test, expect } from '@playwright/test';
import { listUnits, validateCards, coverageReport, indexUnitsByTask, renderUnitForPrompt, COVERAGE_FACTOR } from '../js/cards.js';
import { buildExamBlueprint, buildSlotPromptSuffix, compactBlueprint } from '../js/examPipeline.js';
import { CARDS_AIB_C01 } from '../js/data/cards/aib-c01.js';
import { CARDS_SAA_C03 } from '../js/data/cards/saa-c03.js';
import { AIB_C01 } from '../js/data/aib-c01.js';
import { SAA_C03 } from '../js/data/saa-c03.js';

/**
 * Cards (issue #225, design §4): pre-prepared units the pipeline tests —
 * framework cells for AIB-C01, case decision points for SAA-C03.
 */

const taskIds = (exam) => exam.domains.flatMap((d) => d.tasks.map((t) => String(t.id)));

test.describe('card data files', () => {
  test('AIB-C01 framework map is valid and covers every task with enough cells', () => {
    expect(validateCards(CARDS_AIB_C01, { taskIds: taskIds(AIB_C01) })).toEqual([]);
    const report = coverageReport(CARDS_AIB_C01, { questionCount: 65, taskIds: taskIds(AIB_C01) });
    expect(report.required).toBe(Math.ceil(65 * COVERAGE_FACTOR));
    expect(report.uncoveredTasks).toEqual([]);
    expect(report.byKind.framework).toBe(report.units);
    // Cells are the AI-enriched CAF-AI capabilities (plus the journey); the
    // inventory is below the 1.5× requirement and the report must say so.
    expect(report.units).toBeGreaterThanOrEqual(60);
    expect(report.sufficient).toBe(report.units >= report.required);
    // Archived source is recorded, not hidden.
    expect(CARDS_AIB_C01.cards[0].source.archived).toBe(true);
    // Every cell names a real perspective and stage.
    const { perspective, stage } = CARDS_AIB_C01.cards[0].axes;
    for (const c of CARDS_AIB_C01.cards[0].cells) {
      expect(perspective).toContain(c.perspective);
      expect(stage).toContain(c.stage);
      expect(c.misconceptions.length).toBeGreaterThan(0);
    }
  });

  test('SAA-C03 case cards are valid and cover every task; the unit count is still below 1.5× and reported as such', () => {
    expect(validateCards(CARDS_SAA_C03, { taskIds: taskIds(SAA_C03) })).toEqual([]);
    const report = coverageReport(CARDS_SAA_C03, { questionCount: 65, taskIds: taskIds(SAA_C03) });
    expect(report.byKind.case).toBe(report.units);
    // #241 added cards for the previously uncovered tasks 3.1–3.3, 3.5, 4.2–4.4.
    expect(report.units).toBeGreaterThanOrEqual(60);
    expect(report.uncoveredTasks).toEqual([]);
    expect(report.sufficient).toBe(report.units >= report.required);
    // Every decision has rejected alternatives (distractor material).
    for (const card of CARDS_SAA_C03.cards) for (const d of card.decisions) expect(d.rejected.length).toBeGreaterThan(0);
  });

  test('validateCards reports schema problems', () => {
    const problems = validateCards({ cards: [
      { id: 'x', kind: 'case', source: {}, decisions: [{ id: 'd1', question: 'q', chosen: 'c', rejected: [], tasks: ['9.9'] }] },
      { id: 'x', kind: 'nope' },
    ] }, { taskIds: ['1.1'] });
    expect(problems.some((p) => p.includes('missing source.url'))).toBe(true);
    expect(problems.some((p) => p.includes('no rejected alternatives'))).toBe(true);
    expect(problems.some((p) => p.includes('unknown task 9.9'))).toBe(true);
    expect(problems.some((p) => p.includes('duplicate id'))).toBe(true);
    expect(problems.some((p) => p.includes('unknown kind'))).toBe(true);
  });
});

test.describe('units in the pipeline', () => {
  test('renderUnitForPrompt lists rejected alternatives / misconceptions as distractor material', () => {
    const caseUnit = listUnits(CARDS_SAA_C03)[0];
    const text = renderUnitForPrompt(caseUnit);
    expect(text).toContain('【ケース素材');
    expect(text).toContain('不採用案');
    expect(text).toContain(caseUnit.detail.chosen);
    expect(text).toContain(caseUnit.card.source.url);
    const cellUnit = listUnits(CARDS_AIB_C01)[0];
    const en = renderUnitForPrompt(cellUnit, { locale: 'en' });
    expect(en).toContain('[Framework cell]');
    expect(en).toContain('misconceptions');
  });

  test('a blueprint with units tests units instead of task-statement items and the writer sees the card', () => {
    const unitsByTask = indexUnitsByTask(listUnits(CARDS_AIB_C01));
    const bp = buildExamBlueprint({ exam: AIB_C01, count: 65, level: 'Business', unitsByTask, rng: () => 0.42 });
    expect(bp.every((s) => s.unit && s.unit.kind === 'framework')).toBe(true);
    expect(bp.every((s) => s.item === s.unit.label)).toBe(true);
    // Within a task, units do not repeat before all of that task's units were used.
    for (const task of AIB_C01.domains.flatMap((d) => d.tasks)) {
      const ids = bp.filter((s) => s.task === task).map((s) => s.unit.id);
      const distinct = unitsByTask.get(String(task.id)).length;
      const firstRound = ids.slice(0, Math.min(ids.length, distinct));
      expect(new Set(firstRound).size).toBe(firstRound.length);
    }
    expect(compactBlueprint(bp)[0].unitId).toBe(bp[0].unit.id);
    const suffix = buildSlotPromptSuffix({ slot: bp[0] });
    // Node has no saved locale, so the suffix may be English or Japanese.
    expect(suffix).toMatch(/【フレームワークのセル】|\[Framework cell\]/);
    expect(suffix).toMatch(/誤答は列挙された不採用案・誤解から|build the wrong choices from the rejected alternatives/);
  });

  test('tasks without units fall back to task-statement items (partial SAA inventory)', () => {
    // SAA now covers every task (#241); drop domain 4's units to keep testing the fallback.
    const unitsByTask = indexUnitsByTask(listUnits(CARDS_SAA_C03).filter((u) => !u.tasks.some((t) => String(t).startsWith('4.'))));
    const bp = buildExamBlueprint({ exam: SAA_C03, count: 65, unitsByTask, rng: () => 0.17 });
    const withUnit = bp.filter((s) => s.unit);
    const without = bp.filter((s) => !s.unit);
    expect(withUnit.length).toBeGreaterThan(0);
    expect(without.length).toBeGreaterThan(0);
    for (const s of withUnit) expect(unitsByTask.has(String(s.task.id))).toBe(true);
    for (const s of without) {
      expect(unitsByTask.has(String(s.task.id))).toBe(false);
      expect(s.item.length).toBeGreaterThan(0);
    }
  });
});
