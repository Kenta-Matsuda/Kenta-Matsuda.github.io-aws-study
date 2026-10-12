import { test, expect } from '@playwright/test';
import {
  runDeterministicChecks,
  parseSolverResponse,
  parseJudgeResponse,
  decideVerdict,
  buildJudgePrompt,
  buildSolverPrompt,
  buildEditorPrompt,
  summarizeJudging,
  JUDGE_MARKER,
  SOLVER_MARKER,
  EDITOR_MARKER,
} from '../js/examJudge.js';
import { generateExamQuestions } from '../js/examGenerator.js';
import { PLAN_MARKER } from '../js/examPipeline.js';
import { AIB_C01 } from '../js/data/aib-c01.js';

/**
 * Quality evaluation (issue #225, design §8): deterministic checks, solver,
 * judge, editor — and the generator that orchestrates them with a fake model.
 */

const q = (over = {}) => ({
  question: 'A company wants X. What should the architect do?',
  choices: ['A. Use Amazon S3', 'B. Use Amazon EBS', 'C. Use Amazon EFS', 'D. Use instance store'],
  correctIndex: 0,
  explanation: 'S3 is the answer. https://docs.aws.amazon.com/s3/',
  ...over,
});

test.describe('deterministic checks', () => {
  test('clean item has no flags; structural problems are flagged', () => {
    expect(runDeterministicChecks(q(), { expectedLetter: 'A' })).toEqual([]);
    expect(runDeterministicChecks(q({ choices: ['A. a', 'B. a', 'C. c'] }))).toEqual(expect.arrayContaining(['choice-count', 'duplicate-choices']));
    expect(runDeterministicChecks(q({ choices: ['A. a', 'B. b', 'C. c', 'D. All of the above'] }))).toContain('all-of-the-above');
    expect(runDeterministicChecks(q({ correctIndex: 7 }))).toContain('correct-index');
    expect(runDeterministicChecks(q({ explanation: '' }))).toContain('missing-explanation');
  });

  test('cue leak (longest key), letter mismatch and foreign URLs are flagged', () => {
    const long = q({ choices: ['A. Use Amazon S3 with versioning, replication and lifecycle policies configured', 'B. Use EBS', 'C. Use EFS', 'D. Use instance store'] });
    expect(runDeterministicChecks(long)).toContain('longest-is-correct');
    expect(runDeterministicChecks(q(), { expectedLetter: 'C' })).toContain('letter-mismatch');
    expect(runDeterministicChecks(q(), { allowedUrls: ['https://docs.aws.amazon.com/ebs/'] })).toContain('url-not-allowed');
    expect(runDeterministicChecks(q(), { allowedUrls: ['https://docs.aws.amazon.com/s3/'] })).not.toContain('url-not-allowed');
  });
});

test.describe('prompts and parsers', () => {
  test('prompts carry their markers and the item; parsers are tolerant', () => {
    expect(buildSolverPrompt(q()).userPrompt).toContain(SOLVER_MARKER);
    expect(buildSolverPrompt(q()).userPrompt).not.toContain('S3 is the answer');
    const jp = buildJudgePrompt({ question: q(), material: 'MAT', design: 'DES', level: 'Associate', solver: { letter: 'B', agrees: false } });
    expect(jp.userPrompt).toContain(JUDGE_MARKER);
    expect(jp.userPrompt).toContain('MAT');
    expect(jp.userPrompt).toMatch(/answered B|B と答えました/);
    expect(buildEditorPrompt({ question: q(), issues: ['too long'] }).userPrompt).toContain(EDITOR_MARKER);
    expect(parseSolverResponse('```json\n{"answer":"c","confidence":4}\n```')).toEqual({ letter: 'C', confidence: 4 });
    expect(parseSolverResponse('I think B.')).toEqual({ letter: null, confidence: null });
    const judge = parseJudgeResponse('{"accuracy":5,"uniqueness":4,"distractors":3,"fit":4,"cues":5,"verdict":"pass","issues":[],"fix":""}');
    expect(judge.total).toBe(21);
    expect(judge.verdict).toBe('pass');
    expect(parseJudgeResponse('{"accuracy":"x"}')).toBeNull();
  });
});

test.describe('decideVerdict', () => {
  const good = { scores: { accuracy: 5, uniqueness: 5, distractors: 4, fit: 4, cues: 4 }, total: 22, verdict: 'pass', issues: [], fix: '' };
  test('passes a clean, agreed item; is unjudged without a judge', () => {
    expect(decideVerdict({ flags: [], judge: good, solverLetter: 'A', correctLetter: 'A' }).outcome).toBe('pass');
    expect(decideVerdict({ flags: [], judge: null, solverLetter: null, correctLetter: 'A' }).outcome).toBe('unjudged');
    expect(decideVerdict({ flags: ['duplicate-choices'], judge: null, correctLetter: 'A' }).outcome).toBe('fix');
  });
  test('rejects wrong keys; fixes low axes, judge "fix", ambiguity and cue leaks', () => {
    expect(decideVerdict({ flags: [], judge: { ...good, scores: { ...good.scores, accuracy: 2 } }, correctLetter: 'A' }).outcome).toBe('reject');
    expect(decideVerdict({ flags: [], judge: { ...good, verdict: 'reject' }, correctLetter: 'A' }).outcome).toBe('reject');
    expect(decideVerdict({ flags: [], judge: { ...good, scores: { ...good.scores, distractors: 2 } }, correctLetter: 'A' }).outcome).toBe('fix');
    expect(decideVerdict({ flags: [], judge: { ...good, verdict: 'fix', issues: ['x'] }, correctLetter: 'A' }).issues).toContain('x');
    // Solver disagreement alone is a soft flag; with weak uniqueness it forces a fix.
    expect(decideVerdict({ flags: [], judge: good, solverLetter: 'B', correctLetter: 'A' }).outcome).toBe('pass');
    expect(decideVerdict({ flags: [], judge: good, solverLetter: 'B', correctLetter: 'A' }).flags).toContain('solver-disagrees');
    expect(decideVerdict({ flags: [], judge: { ...good, scores: { ...good.scores, uniqueness: 3 } }, solverLetter: 'B', correctLetter: 'A' }).outcome).toBe('fix');
    expect(decideVerdict({ flags: ['longest-is-correct'], judge: good, correctLetter: 'A' }).outcome).toBe('fix');
  });
  test('summarizeJudging aggregates outcomes', () => {
    const s = summarizeJudging([{ judge: { outcome: 'pass', score: 22 } }, { judge: { outcome: 'pass', score: 20, fixed: true } }, { judge: { outcome: 'unjudged' } }, {}]);
    expect(s).toEqual({ judged: 2, passed: 2, fixed: 1, unjudged: 2, avgScore: 21 });
  });
});

// ─── Generator with a scripted model ────────────────────────

const CONCEPTS = ['経営層のスポンサーを確保する', 'クロスファンクショナルチームに説明責任を置く', '透明なコミュニケーションで懸念に対処する', 'リスク回避の文化に介入する', 'ハッカソンで AI リテラシーを加速する', '人の役割を監督・協働へ移行する'];

function scriptedModel(log, { badSlot = 3, rejectSlot = 4 } = {}) {
  let writerCalls = 0;
  return async ({ userPrompt, kind }) => {
    log.push(kind);
    if (userPrompt.includes(PLAN_MARKER)) {
      const n = (userPrompt.match(/^\d+\. /gm) || []).length;
      return JSON.stringify(Array.from({ length: n }, (_, i) => ({ slot: i + 1, concept: `計画概念 ${i + 1}: ${CONCEPTS[i % CONCEPTS.length]}`, scenario: 's', distractors: ['d1', 'd2'] })));
    }
    if (userPrompt.includes(SOLVER_MARKER)) return '{"answer":"A","confidence":3}';
    if (userPrompt.includes(JUDGE_MARKER)) {
      // The judge sees the design line; use the slot's concept number to script outcomes.
      const m = userPrompt.match(/計画概念 (\d+)/);
      const slotNo = m ? Number(m[1]) : 0;
      if (slotNo === badSlot) return '{"accuracy":4,"uniqueness":4,"distractors":2,"fit":4,"cues":4,"verdict":"fix","issues":["distractors too obvious"],"fix":"make B plausible"}';
      if (slotNo === rejectSlot) return '{"accuracy":1,"uniqueness":2,"distractors":2,"fit":3,"cues":3,"verdict":"reject","issues":["key is wrong"],"fix":""}';
      return '{"accuracy":5,"uniqueness":5,"distractors":4,"fit":4,"cues":4,"verdict":"pass","issues":[],"fix":""}';
    }
    if (userPrompt.includes(EDITOR_MARKER)) {
      const item = JSON.parse(userPrompt.slice(userPrompt.lastIndexOf('{')));
      return JSON.stringify({ ...item, explanation: `${item.explanation} (edited)` });
    }
    // writer
    writerCalls += 1;
    const pinned = (userPrompt.match(/正解が問う概念（これに限定する）: (.+)|The correct answer must test exactly this concept: (.+)/) || []);
    const concept = pinned[1] || pinned[2] || `概念 ${writerCalls}`;
    const letter = (userPrompt.match(/選択肢 ([A-D]) に配置|at choice ([A-D])/) || []);
    const L = letter[1] || letter[2] || 'A';
    // The 2nd writer call repeats the 1st answer to trigger the duplicate regeneration.
    const answer = writerCalls === 2 ? `計画概念 1: ${CONCEPTS[0]}` : concept;
    const choices = ['A', 'B', 'C', 'D'].map((l, k) => `${l}. ${l === L ? answer : `誤答 ${writerCalls}: ${CONCEPTS[(writerCalls + k) % CONCEPTS.length]}`}`);
    return JSON.stringify({ question: `問題 ${writerCalls}: ${concept}?`, choices, correct: L, explanation: `解説 ${writerCalls}` });
  };
}

test.describe('generateExamQuestions', () => {
  test('runs plan → write → judge → fix, drops rejected items and reports metrics', async () => {
    const log = [];
    const saved = [];
    const result = await generateExamQuestions({
      exam: AIB_C01, count: 6, level: 'Business', rng: () => 0.3,
      systemPrompt: 'SYS',
      baseUserPrompt: (slot) => `BASE ${slot.task?.id}`,
      resourcesFor: () => [{ title: 'CAF', url: 'https://docs.aws.amazon.com/whitepapers/latest/aws-caf-for-ai/aws-caf-for-ai.html', note: '' }],
      callModel: scriptedModel(log),
      judge: { enabled: true, dropRejected: true },
      hooks: { onQuestion: (question, index) => saved.push([index, question.unitId]) },
    });
    const m = result.metrics;
    expect(m.calls.planner).toBe(1);
    expect(m.calls.writer).toBe(7);          // 6 slots + 1 duplicate regeneration
    expect(m.calls.solver).toBe(6);
    expect(m.calls.judge).toBe(6);
    expect(m.calls.editor).toBe(1);          // the "fix" verdict
    expect(m.duplicatesRegenerated).toBe(1);
    expect(m.fixed).toBe(1);
    expect(m.rejected).toBe(1);
    expect(m.generated).toBe(5);
    expect(result.questions).toHaveLength(5);
    expect(saved).toHaveLength(5);
    expect(result.questions.every((x) => x.judge && ['pass', 'unjudged'].includes(x.judge.outcome))).toBe(true);
    const fixedQ = result.questions.find((x) => x.judge.fixed);
    expect(fixedQ.explanation).toContain('(edited)');
    expect(m.passed).toBe(5);
    expect(m.largestCluster).toBe(1);
    // Call order per question: writer(s) → solver → judge (→ editor).
    expect(log.slice(0, 4)).toEqual(['planner', 'writer', 'solver', 'judge']);
  });

  test('without judging only planner and writers are called; a failing planner falls back to the blueprint', async () => {
    const log = [];
    const model = scriptedModel(log);
    const result = await generateExamQuestions({
      exam: AIB_C01, count: 5, level: 'Business', rng: () => 0.6,
      systemPrompt: 'SYS', baseUserPrompt: () => 'BASE',
      callModel: async (req) => (req.kind === 'planner' ? 'not json' : model(req)),
      judge: { enabled: false },
    });
    expect(result.metrics.planFailed).toBe(true);
    expect(result.metrics.calls).toMatchObject({ planner: 1, solver: 0, judge: 0, editor: 0 });
    expect(result.questions).toHaveLength(5);
    expect(result.questions.every((x) => x.judge.outcome === 'unjudged')).toBe(true);
    // Short sessions skip the planner entirely.
    const short = await generateExamQuestions({ exam: AIB_C01, count: 2, level: 'Business', systemPrompt: 'SYS', baseUserPrompt: () => 'BASE', callModel: scriptedModel([]), judge: { enabled: false } });
    expect(short.metrics.calls.planner).toBe(0);
  });
});
