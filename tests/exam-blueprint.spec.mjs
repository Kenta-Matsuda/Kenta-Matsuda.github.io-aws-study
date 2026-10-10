import { test, expect } from '@playwright/test';
import {
  assignTaskTargets,
  assignAnswerLetters,
  buildAnswerPositionHint,
  buildGeneralQuizUserPrompt,
  rankTaskResources,
  selectTaskResources,
  buildResourceGroundingHint,
  appendMissingResourceRefs,
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
      expect(p).toContain('[Reference Resources]');
      expect(p).toMatch(/\n1\. .+ — https:\/\//);
      const m = p.match(/Place the correct answer at choice ([A-D])/);
      expect(m).not.toBeNull();
      letters.push(m[1]);
    }
    const counts = ['A', 'B', 'C', 'D'].map((l) => letters.filter((x) => x === l).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
});

test.describe('recommended-resource grounding (#225 Step B)', () => {
  const task = {
    resources: [
      { key: 'blackbelts', items: [{ title: 'BB', url: 'https://bb', recommend: true }] },
      { key: 'blogs', items: [{ title: 'Blog', url: 'https://blog', recommend: true }] },
      { key: 'docs', items: [
        { title: 'Doc1', url: 'https://doc1' },
        { title: 'Doc2', url: 'https://doc2', recommend: true },
        { title: 'NoUrl' },
      ] },
      { key: 'whitepapers', items: [{ title: 'WP', url: 'https://wp' }] },
    ],
  };

  test('ranks docs > whitepapers > blogs, recommended first, skips Black Belt and url-less items', () => {
    expect(rankTaskResources(task).map((r) => r.title)).toEqual(['Doc2', 'Doc1', 'WP', 'Blog']);
    expect(rankTaskResources({})).toEqual([]);
  });

  test('selection window rotates across occurrences of the same task', () => {
    expect(selectTaskResources(task, 0, 2).map((r) => r.title)).toEqual(['Doc2', 'Doc1']);
    expect(selectTaskResources(task, 1, 2).map((r) => r.title)).toEqual(['WP', 'Blog']);
    expect(selectTaskResources(task, 2, 2).map((r) => r.title)).toEqual(['Doc2', 'Doc1']);
    expect(selectTaskResources(task, 5, 10)).toHaveLength(4);
  });

  test('every task in the real exam data yields at least one citable resource', async () => {
    const fs = await import('node:fs');
    const files = fs.readdirSync('js/data').filter((f) => /^[a-z]{3}-c0\d\.js$/.test(f));
    const empty = [];
    for (const f of files) {
      const mod = await import(`../js/data/${f}`);
      const ex = Object.values(mod)[0];
      for (const d of ex.domains || []) for (const t of d.tasks || []) {
        if (selectTaskResources(t).length === 0) empty.push(`${ex.code} ${t.id}`);
      }
    }
    expect(empty).toEqual([]);
  });

  test('hint lists resources; explanation gets links only when none are cited', () => {
    const res = [{ title: 'Doc2', url: 'https://doc2', note: 'n' }];
    const hint = buildResourceGroundingHint(res);
    expect(hint).toContain('1. Doc2 — https://doc2 (n)');
    expect(buildResourceGroundingHint([])).toBe('');
    expect(appendMissingResourceRefs('see https://doc2', res)).toBe('see https://doc2');
    expect(appendMissingResourceRefs('no cite', res)).toContain('- [Doc2](https://doc2)');
    expect(appendMissingResourceRefs('x', [])).toBe('x');
  });
});

// End-to-end for the task-card quiz (single question): the prompt carries that
// task's recommended resources and, when the model cites none of them, the
// explanation shows them as recommended resources.
test.describe('task quiz uses the task\'s recommended resources (#225 Step B)', () => {
  test('prompt lists resources and the explanation falls back to them', async ({ page }) => {
    const { CLF_C02 } = await import('../js/data/clf-c02.js');
    const firstTask = CLF_C02.domains[0].tasks[0];
    const expected = selectTaskResources(firstTask)[0];
    const prompts = [];
    await page.addInitScript(() => {
      localStorage.setItem('gemini_api_key', 'test-key-not-used');
      localStorage.setItem('ai_provider', 'gemini');
      localStorage.setItem('asn_locale', 'ja');
      localStorage.setItem('asn_study_state_v1', JSON.stringify({
        schemaVersion: 2,
        profile: { name: 'testuser' },
        xp: { total: 0, history: [], weekRing: [] },
        quizHistory: [],
      }));
    });
    await page.route('**generativelanguage.googleapis.com/**', async (route) => {
      const body = route.request().postDataJSON() || {};
      prompts.push((body.contents || []).flatMap((c) => c.parts || []).map((p) => p.text || '').join('\n'));
      const quiz = JSON.stringify({ question: 'Q?', choices: ['A. a', 'B. b', 'C. c', 'D. d'], correct: 'A', explanation: '解説本文' });
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/event-stream; charset=utf-8' },
        body: `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: quiz }] } }] })}\n\n`,
      });
    });

    await page.goto('/#clf');
    await page.waitForSelector('#siteTitle');
    await page.locator('#domainTabs button', { hasText: 'Domain 1' }).first().click();
    const quizBtn = page.locator(`button[data-action="quiz"][data-task-id="${firstTask.id}"]`).first();
    await quizBtn.scrollIntoViewIfNeeded();
    await quizBtn.click();
    await page.waitForSelector('#quizQuestion:not(.hidden)', { timeout: 10000 });

    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain('【参照リソース】');
    expect(prompts[0]).toContain(expected.url);

    // Answer to reveal the explanation.
    await page.locator('#quizChoices button').first().click();
    await expect(page.locator('#quizExplanation')).toContainText('参考リソース');
    await expect(page.locator(`#quizExplanation a[href="${expected.url}"]`)).toHaveCount(1);
  });
});
