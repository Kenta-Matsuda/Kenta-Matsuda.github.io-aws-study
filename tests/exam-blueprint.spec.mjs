import { test, expect } from '@playwright/test';
import {
  assignTaskTargets,
  assignAnswerLetters,
  buildAnswerPositionHint,
  buildGeneralQuizUserPrompt,
} from '../js/quiz.js';
import { SAA_C03 as exam } from '../js/data/saa-c03.js';

// Pure-logic spec for the deterministic exam blueprint (issue #225, Step A):
// task-level question allocation and balanced correct-answer positions.

// Deterministic PRNG so allocations are reproducible.
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

test.describe('assignTaskTargets (#225)', () => {
  test('keeps domain weights and spreads each domain evenly across its tasks', () => {
    const targets = assignTaskTargets(exam.domains, 65, seeded(7));
    expect(targets).toHaveLength(65);

    // Domain totals follow the weights (30/26/24/20 of 65 → 19/17/16/13 by largest remainder).
    const perDomain = countBy(targets, (x) => x.domain.id);
    expect([...perDomain.values()].reduce((a, b) => a + b, 0)).toBe(65);
    for (const d of exam.domains) {
      const n = perDomain.get(d.id);
      expect(Math.abs(n - (65 * d.weight) / 100)).toBeLessThan(1);

      // Within a domain, task counts differ by at most 1 and every task is used
      // when the domain has at least as many slots as tasks.
      const perTask = countBy(targets.filter((x) => x.domain === d), (x) => x.task.id);
      const counts = [...perTask.values()];
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
      if (n >= d.tasks.length) expect(perTask.size).toBe(d.tasks.length);
      for (const id of perTask.keys()) expect(d.tasks.map((t) => t.id)).toContain(id);
    }
  });

  test('domains without tasks yield task=null; empty domains yield nulls', () => {
    const targets = assignTaskTargets([{ id: 1, weight: 1 }], 3, seeded(1));
    expect(targets.map((x) => x.task)).toEqual([null, null, null]);
    expect(assignTaskTargets([], 2)).toEqual([null, null]);
  });
});

test.describe('assignAnswerLetters (#225)', () => {
  test('balances A-D (counts differ by at most 1)', () => {
    for (const n of [1, 4, 10, 65, 75]) {
      const letters = assignAnswerLetters(n, seeded(n));
      expect(letters).toHaveLength(n);
      const counts = ['A', 'B', 'C', 'D'].map((l) => letters.filter((x) => x === l).length);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    }
  });

  test('a single question can land on any letter', () => {
    const seen = new Set();
    for (let s = 1; s <= 50; s++) seen.add(assignAnswerLetters(1, seeded(s))[0]);
    expect([...seen].sort()).toEqual(['A', 'B', 'C', 'D']);
  });
});

test.describe('prompt building (#225)', () => {
  test('answer-position hint names the letter; invalid letters add nothing', () => {
    expect(buildAnswerPositionHint('C')).toContain('"correct": "C"');
    expect(buildAnswerPositionHint('E')).toBe('');
    expect(buildAnswerPositionHint(undefined)).toBe('');
  });

  test('general prompt names the assigned task and includes its task statement', () => {
    const domain = exam.domains[0];
    const task = domain.tasks[0];
    const prompt = buildGeneralQuizUserPrompt(exam.code, domain, task);
    expect(prompt).toContain(`Task ${task.id}`);
    expect(prompt).toContain(task.descriptionEn[0]);
    expect(prompt).not.toContain('Pick one at random');
    // Without a task the previous random-pick prompt is unchanged.
    expect(buildGeneralQuizUserPrompt(exam.code, domain)).toContain('Pick one at random');
  });
});

// End-to-end: run the real pre-generation flow (10-question speed run from the
// dashboard) against a stubbed Gemini endpoint and inspect the prompts sent.
test.describe('pre-generation sends assigned task + answer position (#225)', () => {
  test('each speed-run prompt names a task and an answer letter, letters balanced', async ({ page }) => {
    const prompts = [];
    await page.addInitScript(() => {
      localStorage.setItem('gemini_api_key', 'test-key-not-used');
      localStorage.setItem('ai_provider', 'gemini');
      localStorage.setItem('asn_locale', 'en');
      localStorage.setItem('asn_study_state_v1', JSON.stringify({
        schemaVersion: 2,
        profile: { name: 'testuser' },
        xp: { total: 0, history: [], weekRing: [] },
        quizHistory: [],
      }));
    });
    await page.route('**generativelanguage.googleapis.com/**', async (route) => {
      const body = route.request().postDataJSON() || {};
      const text = (body.contents || []).flatMap((c) => c.parts || []).map((p) => p.text || '').join('\n');
      prompts.push(text);
      const quiz = JSON.stringify({ question: `Q${prompts.length}?`, choices: ['A. a', 'B. b', 'C. c', 'D. d'], correct: 'A', explanation: 'e' });
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream; charset=utf-8' },
        body: `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: quiz }] } }] })}\n\n`,
      });
    });

    await page.goto('/#saa');
    await page.waitForSelector('#siteTitle');
    await page.click('#mainStudyCtaBtn');
    await page.click('.quiz-mode-card[data-quiz-mode="speed"]');
    await page.click('#quizModeStartBtn');
    await expect.poll(() => prompts.length, { timeout: 20000 }).toBe(10);

    const letters = [];
    for (const p of prompts) {
      expect(p).toMatch(/on Task \d+\.\d+:/);
      expect(p).toContain('[Task Statement]');
      const m = p.match(/Place the correct answer at choice ([A-D])/);
      expect(m).not.toBeNull();
      letters.push(m[1]);
    }
    const counts = ['A', 'B', 'C', 'D'].map((l) => letters.filter((x) => x === l).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
});
