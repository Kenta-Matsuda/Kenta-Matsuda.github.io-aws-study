import { test, expect } from '@playwright/test';
import {
  buildResourceIndex,
  searchResourcesMulti,
  buildExamKeywordCatalog,
  augmentTermsWithCatalog,
} from '../js/resourceSearch.js';

// Pure-logic spec (no browser) for issue #209 (exam-guide-informed HyDE). The AI
// search HyDE flow (js/ui.js) relied ENTIRELY on the model to guess concrete AWS
// service names; newer/edge services the LLM was not trained on (the "Quick" →
// Amazon QuickSight / Amazon Q litmus test) were dropped from expansion and never
// surfaced. The fix builds a durable, model-independent keyword catalog from the
// exam data (per-task/step knowledge / knowledgeEn) and augments the expanded terms
// with catalog services relevant to the query. Both new functions are pure and are
// exercised directly here; the AI call itself is browser-only (verified manually —
// see docs/issues/exam-guide-hyde-209.md).

// Synthetic exam objects mirroring the shape buildExamKeywordCatalog walks (steps[]
// with knowledge/knowledgeEn and domains[].tasks[] with knowledge/knowledgeEn), so
// the assertions are deterministic and independent of the real data set.
function makeExam(over) {
  return {
    id: 'x',
    code: 'X',
    title: 'X exam',
    shortLabel: 'X',
    steps: [],
    domains: [],
    ...over,
  };
}

test.describe('buildExamKeywordCatalog — exam-guide catalog (#209)', () => {
  test('collects knowledge + knowledgeEn from BOTH step-level and task-level', () => {
    const exam = makeExam({
      steps: [{ id: 's1', knowledge: ['Amazon S3'], knowledgeEn: ['AWS IAM'] }],
      domains: [
        {
          id: 'd1',
          tasks: [
            { id: 't1', knowledge: ['Amazon QuickSight'], knowledgeEn: ['Amazon Athena'] },
          ],
        },
      ],
    });
    const catalog = buildExamKeywordCatalog([exam]);
    expect(catalog).toContain('Amazon S3');
    expect(catalog).toContain('AWS IAM');
    expect(catalog).toContain('Amazon QuickSight');
    expect(catalog).toContain('Amazon Athena');
  });

  test('trims values and drops empty / whitespace-only entries', () => {
    const exam = makeExam({
      domains: [
        {
          id: 'd1',
          tasks: [{ id: 't1', knowledge: ['  Amazon EC2  ', '', '   ', 'AWS Lambda'] }],
        },
      ],
    });
    const catalog = buildExamKeywordCatalog([exam]);
    expect(catalog).toContain('Amazon EC2');
    expect(catalog).toContain('AWS Lambda');
    // No empty entries slip through.
    expect(catalog.every((k) => k.trim().length > 0)).toBe(true);
    expect(catalog.length).toBe(2);
  });

  test('de-dupes case-insensitively, preserving the first-seen casing', () => {
    const exam = makeExam({
      steps: [{ id: 's1', knowledge: ['Amazon QuickSight'] }],
      domains: [
        {
          id: 'd1',
          tasks: [{ id: 't1', knowledge: ['amazon quicksight', 'AMAZON QUICKSIGHT'] }],
        },
      ],
    });
    const catalog = buildExamKeywordCatalog([exam]);
    const qs = catalog.filter((k) => k.toLowerCase() === 'amazon quicksight');
    expect(qs.length).toBe(1);
    // First-seen casing (step-level) is preserved.
    expect(qs[0]).toBe('Amazon QuickSight');
  });

  test('accepts a bare string as well as an array for knowledge fields', () => {
    const exam = makeExam({
      domains: [{ id: 'd1', tasks: [{ id: 't1', knowledge: 'Amazon Kendra' }] }],
    });
    const catalog = buildExamKeywordCatalog([exam]);
    expect(catalog).toContain('Amazon Kendra');
  });

  test('tolerates missing/empty exams and returns []', () => {
    expect(buildExamKeywordCatalog([])).toEqual([]);
    expect(buildExamKeywordCatalog(null)).toEqual([]);
    expect(buildExamKeywordCatalog([null, {}, { steps: [], domains: [] }])).toEqual([]);
  });
});

test.describe('augmentTermsWithCatalog — HyDE augmentation (#209)', () => {
  const CATALOG = ['Amazon QuickSight', 'Amazon Athena', 'Amazon Q', 'AWS Glue'];

  test("a partial query term 'Quick' pulls in the catalog 'Amazon QuickSight'", () => {
    const out = augmentTermsWithCatalog(['Quick'], CATALOG);
    expect(out.some((t) => t.toLowerCase().includes('quicksight'))).toBe(true);
  });

  test("the exact service 'QuickSight' also pulls the catalog entry", () => {
    const out = augmentTermsWithCatalog(['QuickSight'], CATALOG);
    expect(out).toContain('Amazon QuickSight');
  });

  test('a catalog entry that is a substring of a query term is pulled in', () => {
    // 'Amazon Q' (catalog) is a substring of the query term below.
    const out = augmentTermsWithCatalog(['Amazon Q Developer とは'], CATALOG);
    expect(out).toContain('Amazon Q');
  });

  test('already-present terms are not duplicated (case-insensitive)', () => {
    const out = augmentTermsWithCatalog(['amazon quicksight'], CATALOG);
    const qs = out.filter((t) => t.toLowerCase() === 'amazon quicksight');
    expect(qs.length).toBe(1);
  });

  test('order is preserved: original terms first, then catalog additions', () => {
    const out = augmentTermsWithCatalog(['QuickSight', 'raw'], CATALOG);
    expect(out[0]).toBe('QuickSight');
    expect(out[1]).toBe('raw');
    // The catalog-added QuickSight appears after the original terms.
    expect(out.indexOf('Amazon QuickSight')).toBeGreaterThan(1);
  });

  test('respects the limit', () => {
    const out = augmentTermsWithCatalog(['Amazon'], CATALOG, { limit: 2 });
    expect(out.length).toBe(2);
  });

  test('ignores empty / whitespace-only query terms', () => {
    const out = augmentTermsWithCatalog(['', '   '], CATALOG);
    expect(out).toEqual([]);
  });

  test('does not mutate its inputs', () => {
    const terms = ['Quick'];
    const catalog = [...CATALOG];
    augmentTermsWithCatalog(terms, catalog);
    expect(terms).toEqual(['Quick']);
    expect(catalog).toEqual(CATALOG);
  });
});

test.describe('real-data smoke + end-to-end (#209 litmus test)', () => {
  test("the real catalog contains a QuickSight entry and 'Quick' surfaces it", () => {
    const catalog = buildExamKeywordCatalog();
    expect(catalog.some((k) => k.toLowerCase().includes('quicksight'))).toBe(true);
    const aug = augmentTermsWithCatalog(['Quick'], catalog);
    expect(aug.some((k) => k.toLowerCase().includes('quicksight'))).toBe(true);
  });

  test("'Quick' yields real QuickSight resources even when the model omits QuickSight", () => {
    const index = buildResourceIndex();
    const catalog = buildExamKeywordCatalog();
    // Simulate the model returning NO QuickSight term (only unrelated Athena).
    const expandedTerms = ['Amazon Athena'];
    const terms = augmentTermsWithCatalog(['Quick', ...expandedTerms], catalog);
    const results = searchResourcesMulti(index, terms);
    const hasQuickSight = results.some((r) =>
      `${r.title || ''}${r.titleEn || ''}${r.url || ''}`.toLowerCase().includes('quicksight'),
    );
    expect(hasQuickSight).toBe(true);
  });
});
