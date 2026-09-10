import { test, expect } from '@playwright/test';
import { getExamOfficialRefs, getExamById, getExamCategoryLabel } from '../js/exams.js';
import { buildExamGroundingPrompt } from '../js/chat.js';

// Pure-logic spec (no browser) for issue #202: the AI tutor answered with an
// outdated service name ("Amazon QuickSight (Q機能)") for AIB-C01 instead of the
// current "Amazon Q in QuickSight" naming, and did not clearly ground on the
// official exam guide.
//
// The chat already injects the exam's AWS primary sources (official exam guide +
// official page) into the system prompt via getExamOfficialRefs (js/exams.js),
// and the prompt text is assembled by the pure, DOM/i18n-free buildExamGroundingPrompt
// (js/chat.js, mirroring the js/markdown.js / js/aiErrors.js extraction pattern).
// This spec verifies two things that guard against a regression of #202:
//   1. getExamOfficialRefs('aib-c01') actually returns the AIB-C01 exam guide URL.
//   2. The system prompt built for AIB-C01 embeds that guide URL AND an explicit
//      instruction to use the current AWS service name from the official docs
//      over the model's (possibly stale) internal knowledge.
// The assertions use a real URL/service name from js/data/aib-c01.js, so the test
// would fail if the grounding regressed to omitting the guide or the naming rule.

const AIB_GUIDE_URL_JA =
  'https://docs.aws.amazon.com/ja_jp/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html';
const AIB_GUIDE_URL_EN =
  'https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html';

function buildPromptFor(examId, isJa) {
  const exam = getExamById(examId);
  const locale = isJa ? 'ja' : 'en';
  const category = getExamCategoryLabel(exam?.id);
  const categoryLabel = category ? (isJa ? category.labelJa : category.labelEn) : null;
  const officialRefs = getExamOfficialRefs(exam?.id, { locale });
  return buildExamGroundingPrompt(exam, { isJa, categoryLabel, officialRefs });
}

test.describe('AIB-C01 chat grounding (#202)', () => {
  test('getExamOfficialRefs includes the AIB-C01 exam guide URL (ja + en)', () => {
    const ja = getExamOfficialRefs('aib-c01', { locale: 'ja' });
    const en = getExamOfficialRefs('aib-c01', { locale: 'en' });

    expect(Array.isArray(ja)).toBe(true);
    expect(ja.length).toBeGreaterThan(0);
    const jaGuide = ja.find((r) => r.key === 'guide');
    expect(jaGuide).toBeTruthy();
    expect(jaGuide.url).toBe(AIB_GUIDE_URL_JA);

    const enGuide = en.find((r) => r.key === 'guide');
    expect(enGuide).toBeTruthy();
    expect(enGuide.url).toBe(AIB_GUIDE_URL_EN);
  });

  test('Japanese system prompt embeds the guide URL and the current-service-name rule', () => {
    const prompt = buildPromptFor('aib-c01', true);
    expect(prompt).toContain(AIB_GUIDE_URL_JA);
    // Must instruct the model to prefer the current service name from official docs.
    expect(prompt).toContain('現在の正式なサービス名');
    expect(prompt).toContain('Amazon Q in QuickSight');
    // Existing grounding constraints must remain intact.
    expect(prompt).toContain('記憶でAWS公式ドキュメントを上書きしないでください');
  });

  test('English system prompt embeds the guide URL and the current-service-name rule', () => {
    const prompt = buildPromptFor('aib-c01', false);
    expect(prompt).toContain(AIB_GUIDE_URL_EN);
    expect(prompt).toContain('CURRENT service name');
    expect(prompt).toContain('Amazon Q in QuickSight');
    // Existing grounding constraint must remain intact.
    expect(prompt).toContain('Never override AWS documentation with your own recollection');
  });

  test('buildExamGroundingPrompt omits the primary-sources block when no refs are given', () => {
    const prompt = buildExamGroundingPrompt({ code: 'AIB-C01', shortLabel: 'AI', title: 'x' }, {
      isJa: true,
      categoryLabel: null,
      officialRefs: [],
    });
    // Without official refs there is no primary-sources section, so no guide URL
    // and no naming rule (guards against accidentally hard-coding the block).
    expect(prompt).not.toContain('現在の正式なサービス名');
  });
});
