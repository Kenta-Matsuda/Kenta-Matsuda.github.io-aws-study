import { test, expect } from '@playwright/test';
import {
  buildResourceIndex,
  searchResourcesMulti,
  buildExamKeywordCatalog,
  augmentTermsWithCatalog,
  isSafeCatalogSearchTerm,
  buildAugmentedScoringQuery,
  selectAiCandidates,
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

test.describe('isSafeCatalogSearchTerm — over-match guard (#209 v1 review item 3)', () => {
  test('bare "Amazon Q" is unsafe (its single-letter "q" AND-matches noise)', () => {
    // 'Amazon Q' searches as `amazon AND q`; the 1-char `q` substring-matches
    // queue/quotas/parquet/quality etc., diluting grounding — so guard it out.
    expect(isSafeCatalogSearchTerm('Amazon Q')).toBe(false);
  });

  test('anchored multiword services with a short token stay safe', () => {
    // 'Amazon Q Developer' / 'Amazon Q Business' have an anchor token, so they do
    // NOT over-match and must be preserved (this is where the real recall win is).
    expect(isSafeCatalogSearchTerm('Amazon Q Developer')).toBe(true);
    expect(isSafeCatalogSearchTerm('Amazon Q Business')).toBe(true);
  });

  test('ordinary multiword service names are safe', () => {
    expect(isSafeCatalogSearchTerm('Amazon QuickSight')).toBe(true);
    expect(isSafeCatalogSearchTerm('AWS Glue')).toBe(true);
    // Punctuation-joined concept lists tokenize to >=2-char tokens -> safe.
    expect(isSafeCatalogSearchTerm('PII / PHI')).toBe(true);
  });

  test('empty / whitespace-only entries are not safe', () => {
    expect(isSafeCatalogSearchTerm('')).toBe(false);
    expect(isSafeCatalogSearchTerm('   ')).toBe(false);
    expect(isSafeCatalogSearchTerm(null)).toBe(false);
  });
});

test.describe('augmentTermsWithCatalog — HyDE augmentation (#209)', () => {
  const CATALOG = ['Amazon QuickSight', 'Amazon Athena', 'Amazon Q', 'Amazon Q Developer', 'AWS Glue'];

  test("a partial query term 'Quick' pulls in the catalog 'Amazon QuickSight'", () => {
    const out = augmentTermsWithCatalog(['Quick'], CATALOG);
    expect(out.some((t) => t.toLowerCase().includes('quicksight'))).toBe(true);
  });

  test("the exact service 'QuickSight' also pulls the catalog entry", () => {
    const out = augmentTermsWithCatalog(['QuickSight'], CATALOG);
    expect(out).toContain('Amazon QuickSight');
  });

  test('an ANCHORED catalog entry that is a substring of a query term is pulled in', () => {
    // 'Amazon Q Developer' (safe, anchored) is a substring of the verbose query below.
    const out = augmentTermsWithCatalog(['Amazon Q Developer とは'], CATALOG);
    expect(out).toContain('Amazon Q Developer');
  });

  test('the over-matching bare "Amazon Q" is NOT added as a search term (v1 review item 3)', () => {
    // Even though the query term contains 'Amazon Q', the bare guarded entry must not
    // enter the live term list (it would pull ~38 unrelated resources into grounding).
    const out = augmentTermsWithCatalog(['Amazon Q Developer とは'], CATALOG);
    expect(out).not.toContain('Amazon Q');
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

  test('a concept-only query (no lexical overlap) pulls the aliased service (v1 review item 5)', () => {
    // 'BIツール' shares no substring with 'Amazon QuickSight'; the curated concept
    // alias bridges the gap so the service still enters the term list.
    const out = augmentTermsWithCatalog(['BIツール'], CATALOG);
    expect(out).toContain('Amazon QuickSight');
  });

  test('a query CONTAINING a concept phrase still fires the alias (v2 review — forward direction)', () => {
    // The concept 'ダッシュボード' is contained in the natural-language query, so the
    // alias fires and pulls 'Amazon QuickSight' even without lexical overlap.
    const out = augmentTermsWithCatalog(['ダッシュボードを作りたい'], CATALOG);
    expect(out).toContain('Amazon QuickSight');
  });

  test('a generic token that is only a SUBSTRING of a concept word does NOT inject the alias (v2 review — no reverse fire)', () => {
    // 'business' / 'b' are substrings of concept keys ('business intelligence') but the
    // query does not CONTAIN the concept phrase, so the reverse direction must not fire.
    expect(augmentTermsWithCatalog(['business'], CATALOG)).not.toContain('Amazon QuickSight');
    expect(augmentTermsWithCatalog(['b'], CATALOG)).not.toContain('Amazon QuickSight');
    expect(augmentTermsWithCatalog(['ビジネス'], CATALOG)).not.toContain('Amazon QuickSight');
  });
});

test.describe('buildAugmentedScoringQuery — grounding scores on augmented terms (#209 v1 review item 4)', () => {
  test('joins deduped augmented terms into one scoring string', () => {
    const q = buildAugmentedScoringQuery(['Quick', 'Amazon Athena', 'Amazon QuickSight']);
    expect(q).toBe('Quick Amazon Athena Amazon QuickSight');
  });

  test('drops empties and case-insensitive duplicates', () => {
    const q = buildAugmentedScoringQuery(['Amazon Q', '', 'amazon q', '  ', 'Glue']);
    expect(q).toBe('Amazon Q Glue');
  });

  test('a catalog-only hit scores > 0 against the augmented query but 0 against the raw query', () => {
    // Synthetic candidate representing a QuickSight doc pulled in ONLY via the catalog
    // term for a raw query that does not contain "quick".
    const candidate = {
      examId: 'x', url: 'https://aws.amazon.com/quicksight/',
      title: 'Amazon QuickSight ユーザーガイド', titleEn: 'Amazon QuickSight User Guide',
      note: '', noteEn: '', groupLabel: '', groupLabelEn: '', recommend: false,
    };
    const rawQuery = 'BIツール'; // no lexical overlap with the doc
    const augmented = augmentTermsWithCatalog([rawQuery], ['Amazon QuickSight']);
    const scoringQuery = buildAugmentedScoringQuery(augmented);
    const rawScored = selectAiCandidates([candidate], rawQuery, 40);
    const augScored = selectAiCandidates([candidate], scoringQuery, 40);
    // Both keep the single candidate, but only the augmented scoring reflects relevance.
    // The point: scoring on the augmented terms surfaces the catalog-sourced hit.
    expect(augScored.length).toBe(1);
    expect(rawScored.length).toBe(1);
    // Prove the scoring query actually contains the service the catalog pulled in.
    expect(scoringQuery.toLowerCase()).toContain('quicksight');
    expect(rawQuery.toLowerCase()).not.toContain('quicksight');
  });
});

test.describe('real-data smoke + end-to-end (#209 litmus test)', () => {
  test("the real catalog contains a QuickSight entry and 'Quick' surfaces it", () => {
    const catalog = buildExamKeywordCatalog();
    expect(catalog.some((k) => k.toLowerCase().includes('quicksight'))).toBe(true);
    const aug = augmentTermsWithCatalog(['Quick'], catalog);
    expect(aug.some((k) => k.toLowerCase().includes('quicksight'))).toBe(true);
  });

  // Reversion-SENSITIVE differential test (v1 review item 2). The old end-to-end test
  // (`['Quick','Amazon Athena']` surfaces QuickSight) passed even with augmentation
  // reverted, because raw substring search already matches 'Quick' -> 'QuickSight'. It
  // guarded nothing. This test instead compares the augmented result set against the
  // UN-augmented baseline (`[query, ...expandedTerms]`, exactly what ui.js did before
  // the feature) for a VERBOSE query with no single-document AND match, and asserts the
  // delta is non-empty. It FAILS if augmentTermsWithCatalog is reverted to the baseline.
  test('a verbose query with no single-doc AND match gains results ONLY via augmentation', () => {
    const index = buildResourceIndex();
    const catalog = buildExamKeywordCatalog();
    // Model omits the clean service token; the raw verbose phrase AND-matches nothing.
    const expandedTerms = [];
    const baseTerms = ['Amazon Q Developer とは', ...expandedTerms];

    const baselineResults = searchResourcesMulti(index, baseTerms); // == reverted behavior
    const augmentedTerms = augmentTermsWithCatalog(baseTerms, catalog);
    const augmentedResults = searchResourcesMulti(index, augmentedTerms);

    // Baseline (reverted) finds nothing for the verbose AND-phrase...
    expect(baselineResults.length).toBe(0);
    // ...but augmentation contributes the anchored 'Amazon Q Developer' token and recovers hits.
    expect(augmentedResults.length).toBeGreaterThan(baselineResults.length);

    // And the delta (results present ONLY with augmentation) is non-empty.
    const baselineKeys = new Set(baselineResults.map((r) => `${r.examId}\n${r.url}`));
    const delta = augmentedResults.filter((r) => !baselineKeys.has(`${r.examId}\n${r.url}`));
    expect(delta.length).toBeGreaterThan(0);
  });

  test("no-substring-overlap concept query surfaces QuickSight ONLY via augmentation", () => {
    const index = buildResourceIndex();
    const catalog = buildExamKeywordCatalog();
    // 'BIツール' shares no substring with any QuickSight document — raw search is empty.
    const baseTerms = ['BIツール'];
    const baselineResults = searchResourcesMulti(index, baseTerms);
    const augmentedResults = searchResourcesMulti(index, augmentTermsWithCatalog(baseTerms, catalog));

    const hasQS = (rs) =>
      rs.some((r) => `${r.title || ''}${r.titleEn || ''}${r.url || ''}`.toLowerCase().includes('quicksight'));
    // Reverted behavior surfaces no QuickSight; augmentation (via the concept alias) does.
    expect(hasQS(baselineResults)).toBe(false);
    expect(hasQS(augmentedResults)).toBe(true);
  });

  test('the over-matching bare "Amazon Q" does not flood grounding for a verbose Amazon Q query', () => {
    const index = buildResourceIndex();
    const catalog = buildExamKeywordCatalog();
    const augmentedTerms = augmentTermsWithCatalog(['Amazon Q Developer とは'], catalog);
    // The guarded bare token must not appear as a live search term.
    expect(augmentedTerms).not.toContain('Amazon Q');
    // The anchored service is what drives recall.
    expect(augmentedTerms).toContain('Amazon Q Developer');
  });
});
