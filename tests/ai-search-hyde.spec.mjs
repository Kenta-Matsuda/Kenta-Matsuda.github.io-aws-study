import { test, expect } from '@playwright/test';
import { buildResourceIndex, searchResources, searchResourcesMulti } from '../js/resourceSearch.js';

// Pure-logic spec (no browser) for issue #201 (HyDE — Hypothetical Document
// Embeddings). AI search used to run a keyword search on the raw query FIRST and
// only re-rank those hits, so a vague query like "分析用のAIサービス" matched no
// keyword, produced zero candidates, and the AI never ran. The fix expands the
// vague query (via the model, wired in js/ui.js) into concrete AWS service names /
// keywords, then unions searchResources over those expanded terms so vague queries
// yield candidates. The union/dedupe merge is the pure, testable part and lives in
// searchResourcesMulti(); this spec exercises it directly (the AI call itself is
// browser-only and is verified manually — see PR findings).

// A small synthetic index (same record shape as buildResourceIndex output) so the
// assertions are deterministic and independent of the real exam data set.
function makeRecord(over) {
  return {
    examId: 'x',
    examCode: 'X',
    examTitle: 'X',
    examShortLabel: 'X',
    stepId: 's',
    stepTitle: 'Step',
    stepJpTitle: 'Step',
    taskId: null,
    taskTitle: null,
    taskJpTitle: null,
    groupKey: 'guide',
    groupLabel: 'ガイド',
    groupLabelEn: 'Guide',
    iconClass: '',
    iconColorClass: '',
    title: '',
    titleEn: '',
    url: '',
    urlEn: '',
    note: '',
    noteEn: '',
    recommend: false,
    ...over,
  };
}

const SYNTHETIC = [
  makeRecord({ title: 'Amazon SageMaker 開発者ガイド', titleEn: 'Amazon SageMaker Developer Guide', url: 'https://docs.aws.amazon.com/sagemaker/' }),
  makeRecord({ title: 'Amazon Bedrock ユーザーガイド', titleEn: 'Amazon Bedrock User Guide', url: 'https://docs.aws.amazon.com/bedrock/', recommend: true }),
  makeRecord({ title: 'Amazon Comprehend とは', titleEn: 'What is Amazon Comprehend', url: 'https://docs.aws.amazon.com/comprehend/' }),
  makeRecord({ title: 'Amazon S3 ユーザーガイド', titleEn: 'Amazon S3 User Guide', url: 'https://docs.aws.amazon.com/s3/' }),
];

test.describe('searchResourcesMulti — HyDE union/dedupe (#201)', () => {
  test('a vague query that matches nothing yields candidates once expanded', () => {
    // The raw vague query matches no keyword in any record's haystack.
    const direct = searchResources(SYNTHETIC, '分析用のAIサービス');
    expect(direct.length).toBe(0);

    // The model would expand it into concrete AWS service keywords. Searching the
    // union of those expanded terms now returns real candidates.
    const expanded = ['Amazon SageMaker', 'Amazon Bedrock', 'Amazon Comprehend'];
    const merged = searchResourcesMulti(SYNTHETIC, expanded);
    expect(merged.length).toBe(3);
    const urls = merged.map((r) => r.url);
    expect(urls).toContain('https://docs.aws.amazon.com/sagemaker/');
    expect(urls).toContain('https://docs.aws.amazon.com/bedrock/');
    expect(urls).toContain('https://docs.aws.amazon.com/comprehend/');
    // The unrelated S3 record must not appear.
    expect(urls).not.toContain('https://docs.aws.amazon.com/s3/');
  });

  test('dedupes records that multiple expanded terms hit', () => {
    // Two terms that both match the SageMaker record; it must appear only once.
    const merged = searchResourcesMulti(SYNTHETIC, ['Amazon SageMaker', 'SageMaker']);
    const sageMakerHits = merged.filter((r) => r.url === 'https://docs.aws.amazon.com/sagemaker/');
    expect(sageMakerHits.length).toBe(1);
  });

  test('recommend:true records are ordered first', () => {
    const merged = searchResourcesMulti(SYNTHETIC, ['Amazon SageMaker', 'Amazon Bedrock']);
    expect(merged.length).toBe(2);
    // Bedrock is the recommend:true record and must come first.
    expect(merged[0].url).toBe('https://docs.aws.amazon.com/bedrock/');
  });

  test('ignores empty / whitespace-only terms and returns [] when no term matches', () => {
    expect(searchResourcesMulti(SYNTHETIC, ['', '   ']).length).toBe(0);
    expect(searchResourcesMulti(SYNTHETIC, ['does-not-exist-anywhere']).length).toBe(0);
  });

  test('respects the examId scope option', () => {
    const scoped = searchResourcesMulti(SYNTHETIC, ['Amazon SageMaker'], { examId: 'nope' });
    expect(scoped.length).toBe(0);
    const inScope = searchResourcesMulti(SYNTHETIC, ['Amazon SageMaker'], { examId: 'x' });
    expect(inScope.length).toBe(1);
  });

  test('the real index also gains candidates from expanded terms', () => {
    // Smoke check against the real data set: even if a raw vague phrase misses,
    // concrete service keywords should surface published resources.
    const index = buildResourceIndex();
    const merged = searchResourcesMulti(index, ['S3', 'IAM']);
    expect(merged.length).toBeGreaterThan(0);
  });
});
