import { test, expect } from '@playwright/test';
import { PLAN_MARKER } from '../js/examPipeline.js';
import { JUDGE_MARKER, SOLVER_MARKER, EDITOR_MARKER } from '../js/examJudge.js';

/**
 * Judging in the real pre-generation flow (issue #225, design §8). Judging is
 * off by default for a speed run, so `asn_pipeline_judge = 'on'` switches it
 * on; the Gemini stub answers planner / writer / solver / judge by marker.
 */

const STATE = { schemaVersion: 2, profile: { name: 'testuser' }, xp: { total: 0, history: [], weekRing: [] }, quizHistory: [] };
const CONCEPTS = [
  'エグゼクティブスポンサーを確保して推進力を維持する', 'クロスファンクショナルなチームに説明責任を割り当てる',
  '従業員の懸念に透明なコミュニケーションで対処する', 'リスク回避の文化にリーダーシップで介入する',
  'ハッカソンで全社の AI リテラシーを加速させる', '人の役割を監督・協働へ移行させる機会を特定する',
  'ビジネス成果に紐づく KPI で AI の価値を測る', 'データ基盤の成熟度を評価して投資順序を決める',
  '責任ある AI の原則をベンダー選定に適用する', 'パイロットの成功基準を事前に定義してスケール判断する',
];

test('speed run with judging on: solver + judge per question, metrics saved on the set', async ({ page }) => {
  const calls = { planner: 0, writer: 0, solver: 0, judge: 0, editor: 0 };
  await page.addInitScript((state) => {
    localStorage.setItem('gemini_api_key', 'test-key-not-used');
    localStorage.setItem('ai_provider', 'gemini');
    localStorage.setItem('asn_locale', 'ja');
    localStorage.setItem('asn_pipeline_judge', 'on');
    localStorage.setItem('asn_study_state_v1', JSON.stringify(state));
    indexedDB.deleteDatabase('asn-exam-sets');
  }, STATE);

  const json = (obj) => ({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] } }] }) });
  const sse = (text) => ({ status: 200, headers: { 'content-type': 'text/event-stream; charset=utf-8' }, body: `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n` });
  await page.route('**generativelanguage.googleapis.com/**', async (route) => {
    const body = route.request().postDataJSON() || {};
    const prompt = (body.contents || []).flatMap((c) => c.parts || []).map((p) => p.text || '').join('\n');
    const stream = route.request().url().includes('streamGenerateContent');
    const reply = (text) => route.fulfill(stream ? sse(text) : json(text));
    if (prompt.includes(PLAN_MARKER)) {
      calls.planner++;
      const n = (prompt.match(/^\d+\. /gm) || []).length;
      return reply(JSON.stringify(Array.from({ length: n }, (_, i) => ({ slot: i + 1, concept: `計画概念 ${i + 1}: ${CONCEPTS[i % CONCEPTS.length]}`, scenario: 's', distractors: ['d1'] }))));
    }
    if (prompt.includes(SOLVER_MARKER)) { calls.solver++; return reply('{"answer":"A","confidence":4}'); }
    if (prompt.includes(JUDGE_MARKER)) { calls.judge++; return reply('{"accuracy":5,"uniqueness":5,"distractors":4,"fit":4,"cues":4,"verdict":"pass","issues":[],"fix":""}'); }
    if (prompt.includes(EDITOR_MARKER)) { calls.editor++; return reply(prompt.slice(prompt.lastIndexOf('{'))); }
    calls.writer++;
    const pinned = (prompt.match(/正解が問う概念（これに限定する）: (.+)/) || [])[1] || `概念 ${calls.writer}`;
    const letter = (prompt.match(/正解は選択肢 ([A-D]) に配置/) || [, 'A'])[1];
    const choices = ['A', 'B', 'C', 'D'].map((l, k) => `${l}. ${l === letter ? pinned : `誤答 ${calls.writer}: ${CONCEPTS[(calls.writer + k) % CONCEPTS.length]}`}`);
    return reply(JSON.stringify({ question: `問題 ${calls.writer}: ${pinned}?`, choices, correct: letter, explanation: '解説' }));
  });

  await page.goto('/#aib');
  await page.waitForSelector('#siteTitle');
  await page.click('#mainStudyCtaBtn');
  await page.click('.quiz-mode-card[data-quiz-mode="speed"]');
  await page.click('#quizModeStartBtn');
  await expect(page.locator('#quizQuestion')).toBeVisible({ timeout: 30000 });

  expect(calls).toEqual({ planner: 1, writer: 10, solver: 10, judge: 10, editor: 0 });

  const sets = await page.evaluate(async () => {
    const m = await import('/js/examSets.js');
    return (await m.listExamSets()).map((s) => ({ status: s.status, n: s.questions.length, metrics: s.metrics, outcomes: s.questions.map((q) => q.judge?.outcome) }));
  });
  expect(sets).toHaveLength(1);
  expect(sets[0]).toMatchObject({ status: 'ready', n: 10 });
  expect(sets[0].metrics).toMatchObject({ judged: 10, passed: 10, rejected: 0, fixed: 0 });
  expect(sets[0].metrics.calls).toEqual({ planner: 1, writer: 10, solver: 10, judge: 10, editor: 0 });
  expect(sets[0].outcomes.every((o) => o === 'pass')).toBe(true);

  // The set library shows the judge metric.
  await page.click('[data-close-modal="aiModal"]').catch(() => {});
  await page.keyboard.press('Escape');
  await page.click('#mainStudyCtaBtn');
  await page.click('#quizModeSetsBtn');
  await expect(page.locator('#examSetsList [data-set-judge]')).toHaveText('査読通過 10/10');
});
