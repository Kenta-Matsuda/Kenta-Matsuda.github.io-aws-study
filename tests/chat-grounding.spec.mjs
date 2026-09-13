import { test, expect } from '@playwright/test';
import {
  getExamOfficialRefs,
  getExamById,
  getExamCategoryLabel,
  getExamServiceKeywords,
} from '../js/exams.js';
import { buildExamGroundingPrompt } from '../js/chat.js';

// Pure-logic spec (no browser) for issue #202 and its maintainer follow-up.
//
// #202: the AI tutor answered with an outdated / wrong service name for AIB-C01
// instead of the current one, and did not clearly ground on the official exam
// guide. The maintainer's follow-up (2026-09-12) clarified the intended answer
// was "Amazon Quick" — a service released in June 2026 that the model has no
// training data for — and suggested extracting the exam guide's target-service
// list and injecting it directly into the chat prompt.
//
// The chat already injects the exam's AWS primary sources (official exam guide +
// official page) via getExamOfficialRefs, and now also injects the exam's
// in-scope AWS service list via getExamServiceKeywords (js/exams.js). The prompt
// text is assembled by the pure, DOM/i18n-free buildExamGroundingPrompt
// (js/chat.js, mirroring the js/markdown.js / js/aiErrors.js extraction pattern).
// These assertions guard against a regression of #202:
//   1. getExamOfficialRefs('aib-c01') returns the AIB-C01 exam guide URL.
//   2. getExamServiceKeywords('aib-c01') surfaces the newer-than-training-cutoff
//      service "Amazon Quick" from the exam data.
//   3. The system prompt built for AIB-C01 embeds the guide URL, the in-scope
//      service list (including Amazon Quick), and an explicit instruction that
//      some in-scope services are newer than the model's knowledge and must not
//      be denied or silently swapped for an older service.

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
  const serviceKeywords = getExamServiceKeywords(exam?.id, { locale });
  return buildExamGroundingPrompt(exam, { isJa, categoryLabel, officialRefs, serviceKeywords });
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

  test('getExamServiceKeywords surfaces the exam target-service list incl. Amazon Quick', () => {
    const ja = getExamServiceKeywords('aib-c01', { locale: 'ja' });
    const en = getExamServiceKeywords('aib-c01', { locale: 'en' });

    expect(Array.isArray(ja)).toBe(true);
    expect(ja).toContain('Amazon Quick');
    expect(ja).toContain('Amazon Bedrock');
    expect(en).toContain('Amazon Quick');

    // Program/marketing names must not leak in as "services".
    expect(ja).not.toContain('AWS Certified');
    expect(ja.every((s) => !s.startsWith('AWS Certified'))).toBe(true);

    // Null-safe on unknown/empty IDs.
    expect(getExamServiceKeywords('does-not-exist')).toEqual([]);
    expect(getExamServiceKeywords('')).toEqual([]);
  });

  test('Japanese system prompt embeds the guide URL, service list and newest-service rule', () => {
    const prompt = buildPromptFor('aib-c01', true);
    expect(prompt).toContain(AIB_GUIDE_URL_JA);
    // The exam's target-service list is injected as grounding context.
    expect(prompt).toContain('この試験の対象 AWS サービス');
    expect(prompt).toContain('Amazon Quick');
    // Must warn that some in-scope services are newer than the model's knowledge.
    expect(prompt).toContain('2026 年にリリース');
    // Existing grounding constraints must remain intact.
    expect(prompt).toContain('記憶でAWS公式ドキュメントを上書きしないでください');
  });

  test('English system prompt embeds the guide URL, service list and newest-service rule', () => {
    const prompt = buildPromptFor('aib-c01', false);
    expect(prompt).toContain(AIB_GUIDE_URL_EN);
    expect(prompt).toContain('In-scope AWS services for this exam');
    expect(prompt).toContain('Amazon Quick');
    expect(prompt).toContain('released in 2026');
    expect(prompt).toContain('NEWER than your training data');
    // Existing grounding constraint must remain intact.
    expect(prompt).toContain('Never override AWS documentation with your own recollection');
  });

  test('buildExamGroundingPrompt omits the grounding blocks when no data is given', () => {
    const prompt = buildExamGroundingPrompt(
      { code: 'AIB-C01', shortLabel: 'AI', title: 'x' },
      { isJa: true, categoryLabel: null, officialRefs: [], serviceKeywords: [] },
    );
    // Without official refs there is no primary-sources section, so no guide URL.
    expect(prompt).not.toContain(AIB_GUIDE_URL_JA);
    // Without a service list there is no in-scope service block.
    expect(prompt).not.toContain('この試験の対象 AWS サービス');
  });
});
