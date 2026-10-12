import { test, expect } from '@playwright/test';
import {
  QUESTION_TYPES,
  PLAN_MARKER,
  PLANNER_MIN_QUESTIONS,
  extractTaskItems,
  buildExamBlueprint,
  compactBlueprint,
  buildPlannerPrompt,
  parsePlan,
  validatePlan,
  textSimilarity,
  buildSlotPromptSuffix,
  buildDuplicateRetryHint,
  correctChoiceText,
  isDuplicateQuestion,
  summarizeDiversity,
} from '../js/examPipeline.js';
import { SAA_C03 } from '../js/data/saa-c03.js';
import { AIB_C01 } from '../js/data/aib-c01.js';

/**
 * Multi-stage exam generation pipeline (issue #225, design §5):
 * blueprint (code) → planner (1 LLM call) → writer (N calls) → duplicate check.
 */

function seeded(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const countBy = (arr, key) => arr.reduce((m, x) => m.set(key(x), (m.get(key(x)) || 0) + 1), new Map());
const q = (answer, i = 0) => ({ question: `Q${i}?`, choices: ['A. x', `B. ${answer}`, 'C. y', 'D. z'], correctIndex: 1, explanation: '' });

test.describe('stage 0 – blueprint', () => {
  test('extractTaskItems returns the knowledge/skill bullets without headers', () => {
    const items = extractTaskItems(SAA_C03.domains[0].tasks[0]);
    expect(items.length).toBeGreaterThan(5);
    for (const it of items) expect(it).not.toMatch(/^(対象知識|対象スキル|Knowledge of|Skills in)/);
    // AIB uses numbered "スキル 4.3.1: …" lines instead of bullets.
    const aibItems = extractTaskItems(AIB_C01.domains[3].tasks.find((t) => t.id === '4.3'));
    expect(aibItems).toHaveLength(6);
    // Node has no saved locale, so the default (English) statement is used.
    expect(aibItems[0]).toMatch(/^(エグゼクティブスポンサーシップ|Establish executive sponsorship)/);
    expect(extractTaskItems({ jpTitle: 'タイトルのみ' })).toEqual(['タイトルのみ']);
    expect(extractTaskItems(null)).toEqual([]);
  });

  test('a 65-question AIB blueprint covers every task and rotates items within a task', () => {
    const bp = buildExamBlueprint({ exam: AIB_C01, count: 65, level: 'Business', rng: seeded(3) });
    expect(bp).toHaveLength(65);
    const tasks = AIB_C01.domains.flatMap((d) => d.tasks);
    expect(new Set(bp.map((s) => s.task.id)).size).toBe(tasks.length);
    // Within one task, no item repeats before all of that task's items were used.
    for (const task of tasks) {
      const items = bp.filter((s) => s.task === task).map((s) => s.item);
      const distinct = extractTaskItems(task).length;
      const firstRound = items.slice(0, Math.min(items.length, distinct));
      expect(new Set(firstRound).size).toBe(firstRound.length);
    }
    // Answer letters balanced; question types all used.
    const letters = countBy(bp, (s) => s.answerLetter);
    expect(Math.max(...letters.values()) - Math.min(...letters.values())).toBeLessThanOrEqual(1);
    expect(new Set(bp.map((s) => s.type.id)).size).toBe(QUESTION_TYPES.length);
    // Business exams get business perspectives.
    expect(bp.some((s) => /CEO|CFO/.test(s.perspective.ja))).toBe(true);
  });

  test('task mode pins every slot to the task; compactBlueprint is id-only', () => {
    const task = SAA_C03.domains[1].tasks[0];
    const bp = buildExamBlueprint({ exam: SAA_C03, count: 5, task, rng: seeded(1) });
    expect(bp.every((s) => s.task === task && s.domain === null)).toBe(true);
    const compact = compactBlueprint(bp);
    expect(compact[0]).toMatchObject({ index: 0, domainId: null, taskId: task.id });
    expect(typeof compact[0].type).toBe('string');
    expect(JSON.parse(JSON.stringify(compact))).toEqual(compact);
  });
});

test.describe('stage 1 – planner', () => {
  test('planner prompt lists one line per slot and carries the marker', () => {
    const bp = buildExamBlueprint({ exam: AIB_C01, count: 6, level: 'Business', rng: seeded(2) });
    const { systemPrompt, userPrompt } = buildPlannerPrompt({ exam: AIB_C01, blueprint: bp });
    expect(userPrompt).toContain(PLAN_MARKER);
    expect(userPrompt.match(/^\d+\. /gm)).toHaveLength(6);
    expect(systemPrompt).toContain('AIB-C01');
    expect(PLANNER_MIN_QUESTIONS).toBe(5);
  });

  test('parsePlan tolerates fences and prose, maps by slot number, rejects garbage', () => {
    const text = 'Here:\n```json\n[{"slot":2,"concept":"B","scenario":"s","distractors":["d1","d2"]},{"slot":1,"concept":"A"}]\n```';
    const rows = parsePlan(text, 3);
    expect(rows).toEqual([
      { concept: 'A', scenario: '', distractors: [] },
      { concept: 'B', scenario: 's', distractors: ['d1', 'd2'] },
      null,
    ]);
    expect(parsePlan('no json here', 2)).toBeNull();
    expect(parsePlan('{"not":"array"}', 2)).toBeNull();
  });

  test('validatePlan drops near-duplicate concepts (Japanese paraphrases included)', () => {
    const rows = [
      { concept: 'AI CoE（Center of Excellence）を設置して全社展開を推進する' },
      { concept: '責任ある AI の原則に基づきバイアス評価の指標を定める' },
      { concept: 'AI CoE（Center of Excellence）を設置して全社展開を進める' },
      null,
    ];
    const { rows: out, duplicates } = validatePlan(rows);
    expect(duplicates).toBe(1);
    expect(out[2]).toBeNull();
    expect(out[0]).toBe(rows[0]);
    expect(out[1]).toBe(rows[1]);
  });

  test('textSimilarity is 1 for identical, high for paraphrase, low for unrelated', () => {
    expect(textSimilarity('abc', 'abc')).toBe(1);
    expect(textSimilarity('AI CoE を設置する', 'B. AI CoE を設置する。')).toBeGreaterThan(0.8);
    expect(textSimilarity('AI CoE を設置する', 'データレイクを S3 に構築する')).toBeLessThan(0.2);
  });
});

test.describe('stage 2 – writer guidance', () => {
  test('suffix carries item, axes, pinned concept and the banned list (capped)', () => {
    const bp = buildExamBlueprint({ exam: AIB_C01, count: 1, level: 'Business', rng: seeded(5) });
    const banned = Array.from({ length: 60 }, (_, i) => `concept ${i}`);
    const text = buildSlotPromptSuffix({ slot: bp[0], plan: { concept: 'PINNED', scenario: 'SCN', distractors: ['d1'] }, banned });
    expect(text).toContain(bp[0].item);
    expect(text).toContain('PINNED');
    expect(text).toContain('SCN');
    expect(text).toContain('d1');
    expect(text.match(/^- concept \d+$/gm)).toHaveLength(40);
    expect(buildSlotPromptSuffix({ slot: bp[0] })).not.toContain('使用済み');
    expect(buildDuplicateRetryHint('AI CoE')).toContain('AI CoE');
  });
});

test.describe('stage 3 – duplicate detection', () => {
  test('flags a repeated correct answer or question text; ignores the label', () => {
    const existing = [q('AI CoE を設置して推進する', 1)];
    expect(correctChoiceText(existing[0])).toBe('AI CoE を設置して推進する');
    expect(isDuplicateQuestion(q('AI CoE を設置して推進します', 2), existing)).toBe(true);
    expect(isDuplicateQuestion(q('バイアス評価指標を定義する', 3), existing)).toBe(false);
    expect(isDuplicateQuestion({ ...q('other', 4), question: 'Q1?' }, existing)).toBe(true);
    expect(isDuplicateQuestion(q('x'), [])).toBe(false);
  });

  test('summarizeDiversity reports the largest answer cluster', () => {
    const d = summarizeDiversity([q('AI CoE を設置して推進する', 1), q('AI CoE を設置して推進します', 2), q('バイアス評価指標を定義する', 3)]);
    expect(d).toMatchObject({ total: 3, clusters: 2, largestCluster: 2 });
  });
});

// ─── Browser: the real pre-generation flow drives the stages ─────

const STATE = { schemaVersion: 2, profile: { name: 'testuser' }, xp: { total: 0, history: [], weekRing: [] }, quizHistory: [] };

test.describe('pipeline – browser (#225)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((state) => {
      localStorage.setItem('gemini_api_key', 'test-key-not-used');
      localStorage.setItem('ai_provider', 'gemini');
      localStorage.setItem('asn_locale', 'ja');
      localStorage.setItem('asn_study_state_v1', JSON.stringify(state));
      indexedDB.deleteDatabase('asn-exam-sets');
    }, STATE);
  });

  test('speed run: 1 planner call, then writers pinned to plan concepts; a duplicate answer is regenerated once', async ({ page }) => {
    const planner = [];
    const writers = [];
    const answers = [];
    const CONCEPTS = [
      'エグゼクティブスポンサーを確保して推進力を維持する', 'クロスファンクショナルなチームに説明責任を割り当てる',
      '従業員の懸念に透明なコミュニケーションで対処する', 'リスク回避の文化にリーダーシップで介入する',
      'ハッカソンで全社の AI リテラシーを加速させる', '人の役割を監督・協働へ移行させる機会を特定する',
      'ビジネス成果に紐づく KPI で AI の価値を測る', 'データ基盤の成熟度を評価して投資順序を決める',
      '責任ある AI の原則をベンダー選定に適用する', 'パイロットの成功基準を事前に定義してスケール判断する',
    ];
    const sse = (text) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\n`;
    await page.route('**generativelanguage.googleapis.com/**', async (route) => {
      const body = route.request().postDataJSON() || {};
      const prompt = (body.contents || []).flatMap((c) => c.parts || []).map((p) => p.text || '').join('\n');
      if (prompt.includes(PLAN_MARKER)) {
        planner.push(prompt);
        const n = (prompt.match(/^\d+\. /gm) || []).length;
        const rows = Array.from({ length: n }, (_, i) => ({ slot: i + 1, concept: `計画概念 ${i + 1}: ${CONCEPTS[i % CONCEPTS.length]}`, scenario: `状況 ${i + 1}`, distractors: ['誤答A', '誤答B'] }));
        await route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(rows) }] } }] }) });
        return;
      }
      writers.push(prompt);
      // Echo the pinned concept as the correct answer — except the 3rd writer
      // call, which repeats the 2nd call's answer to trigger the duplicate check.
      const pinned = (prompt.match(/正解が問う概念（これに限定する）: (.+)/) || [])[1] || `概念 ${writers.length}`;
      const answer = writers.length === 3 ? answers[1] : pinned;
      answers.push(answer);
      const letter = (prompt.match(/正解は選択肢 ([A-D]) に配置/) || [, 'A'])[1];
      const choices = ['A', 'B', 'C', 'D'].map((l) => `${l}. ${l === letter ? answer : `選択肢 ${l} ${writers.length}`}`);
      const quiz = JSON.stringify({ question: `問題 ${writers.length}: ${pinned}?`, choices, correct: letter, explanation: '解説' });
      await route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream; charset=utf-8' }, body: sse(quiz) });
    });

    await page.goto('/#aib');
    await page.waitForSelector('#siteTitle');
    await page.click('#mainStudyCtaBtn');
    await page.click('.quiz-mode-card[data-quiz-mode="speed"]');
    await page.click('#quizModeStartBtn');
    await expect(page.locator('#quizQuestion')).toBeVisible({ timeout: 20000 });

    // Exactly one planner call; 10 slots + 1 regeneration = 11 writer calls.
    expect(planner).toHaveLength(1);
    expect(writers).toHaveLength(11);
    // Every writer prompt carries the design block with its pinned concept.
    for (const p of writers) {
      expect(p).toContain('【出題設計】');
      expect(p).toMatch(/正解が問う概念（これに限定する）: 計画概念 \d+/);
      expect(p).toContain('【参照リソース】');
    }
    // The regeneration prompt names the duplicated answer.
    const retry = writers.filter((p) => p.includes('【再生成】'));
    expect(retry).toHaveLength(1);
    expect(retry[0]).toContain(answers[1]);
    // All concepts distinct across the plan.
    const concepts = planner[0].match(/^\d+\. /gm).length;
    expect(concepts).toBe(10);

    const sets = await page.evaluate(async () => {
      const m = await import('/js/examSets.js');
      return (await m.listExamSets()).map((s) => ({ status: s.status, n: s.questions.length, stage: s.pipeline.stage, plan: s.plan?.length, blueprint: s.blueprint?.length, units: s.questions.map((x) => x.unitId).filter(Boolean).length, metrics: s.metrics }));
    });
    expect(sets).toHaveLength(1);
    expect(sets[0]).toMatchObject({ status: 'ready', n: 10, stage: 'ready', plan: 10, blueprint: 10, units: 10 });
    expect(sets[0].metrics.duplicatesRegenerated).toBe(1);
    expect(sets[0].metrics.largestCluster).toBeLessThanOrEqual(2);
  });
});
