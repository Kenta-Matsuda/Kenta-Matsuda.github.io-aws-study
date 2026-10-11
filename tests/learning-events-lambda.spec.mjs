import { test, expect } from '@playwright/test';
import { createHandler, validateLearningEvents, MAX_LEARNING_EVENTS } from '../infra/feedback/src/index.mjs';

/**
 * POST /events on the feedback collector Lambda (issue #225, design §9).
 * Same in-memory fakes as tests/feedback-lambda.spec.mjs.
 */

const ORIGIN = 'https://kenta-matsuda.github.io';

function makeEnv(overrides = {}) {
  return { TABLE_NAME: 'tbl', GITHUB_REPO: 'owner/repo', ALLOWED_ORIGINS: `${ORIGIN},http://localhost:8877`, ACCEPT_SUBMISSIONS: 'true', HASH_SALT: 'salt', ...overrides };
}

function makeDdb() {
  const counters = new Map();
  const puts = [];
  return {
    puts,
    async updateItem(p) {
      const key = `${p.Key.pk.S}|${p.Key.sk.S}`;
      const n = counters.get(key) || 0;
      if (n >= Number(p.ExpressionAttributeValues[':max'].N)) {
        const err = new Error('cond');
        err.name = 'ConditionalCheckFailedException';
        throw err;
      }
      counters.set(key, n + 1);
    },
    async putItem(p) { puts.push(p.Item); },
    async batchWrite(_table, items) { puts.push(...items); },
  };
}

function post(path, body, { origin = ORIGIN, ip = '203.0.113.5' } = {}) {
  return { rawPath: path, headers: { origin }, requestContext: { http: { method: 'POST', sourceIp: ip } }, body: JSON.stringify(body) };
}

const answered = { type: 'question_answered', at: '2026-10-12T00:00:00.000Z', examId: 'aib-c01', mode: 'speed', setId: 'set_1', questionId: 'q_1', taskId: '4.3', unitId: 'aib-fw-caf-ai#people-org-alignment-coe', isCorrect: false, userAnswer: 2, elapsedMs: 15000, schema: 1 };

test.describe('learning events Lambda (#225 §9)', () => {
  test('validateLearningEvents keeps allow-listed fields, clips ids, range-checks numbers', () => {
    const { events: [e], rejected } = validateLearningEvents({ events: [{ ...answered, question: 'TEXT MUST NOT PASS', elapsedMs: 99999999, judgeScore: 21, unitId: 'x'.repeat(500) }] });
    expect(rejected).toBe(0);
    expect(e.question).toBeUndefined();
    expect(e.elapsed_ms).toBeUndefined(); // out of range → dropped, not stored
    expect(e.judge_score).toBe(21);
    expect(e.unit_id).toHaveLength(120);
    // Stored attributes are snake_case like votes/feedback; the wire stays camelCase.
    expect(e).toMatchObject({ type: 'question_answered', exam_id: 'aib-c01', is_correct: false, user_answer: 2, schema: 1, set_id: 'set_1', question_id: 'q_1', task_id: '4.3' });
    expect(e.examId).toBeUndefined();
    expect(() => validateLearningEvents({ events: [] })).toThrow();
    expect(() => validateLearningEvents({ events: Array(MAX_LEARNING_EVENTS + 1).fill(answered) })).toThrow();
    // Invalid events are rejected individually, never the whole batch.
    const mixed = validateLearningEvents({ events: [{ type: 'hacked', examId: 'aib-c01' }, { type: 'set_completed', examId: 'DROP TABLE' }, answered] });
    expect(mixed.events).toHaveLength(1);
    expect(mixed.rejected).toBe(2);
    expect(() => validateLearningEvents({ events: [{ type: 'hacked', examId: 'aib-c01' }] })).toThrow(/no_valid_events/);
  });

  test('stores events partitioned by exam + type with the unit as an attribute', async () => {
    const ddb = makeDdb();
    const handler = createHandler({ ddb, fetchImpl: async () => ({ ok: false }), getGithubToken: async () => null, env: makeEnv(), now: () => new Date('2026-10-12T01:00:00Z') });
    const res = await handler(post('/events', { events: [answered, { type: 'set_completed', examId: 'aib-c01', setId: 'set_1', score: 0.8, total: 10 }, { type: 'question_answered', examId: '' }] }));
    expect(res.statusCode).toBe(202);
    expect(JSON.parse(res.body)).toEqual({ ok: true, accepted: 2, rejected: 1 });
    expect(ddb.puts).toHaveLength(2);
    expect(ddb.puts[0].pk.S).toBe('event#aib-c01#question_answered');
    expect(ddb.puts[0].sk.S.startsWith('2026-10-12T00:00:00.000Z#')).toBe(true);
    expect(ddb.puts[0].unit_id.S).toBe(answered.unitId);
    expect(ddb.puts[0].set_id.S).toBe('set_1');
    expect(ddb.puts[0].is_correct.BOOL).toBe(false);
    expect(ddb.puts[0].elapsed_ms.N).toBe('15000');
    expect(ddb.puts[0].unitId).toBeUndefined();
    expect(ddb.puts[0].type.S).toBe('learning_event');
    expect(Number(ddb.puts[0].ttl.N)).toBeGreaterThan(Date.parse('2026-10-12T01:00:00Z') / 1000 + 700 * 86400);
    expect(ddb.puts[1].pk.S).toBe('event#aib-c01#set_completed');
    expect(ddb.puts[1].score.N).toBe('0.8');
    // No IP stored in clear, only the salted hash.
    expect(JSON.stringify(ddb.puts[0])).not.toContain('203.0.113.5');
  });

  test('rejects foreign origins, invalid payloads, and rate-limits per IP', async () => {
    const ddb = makeDdb();
    const handler = createHandler({ ddb, fetchImpl: async () => ({ ok: false }), getGithubToken: async () => null, env: makeEnv() });
    expect((await handler(post('/events', { events: [answered] }, { origin: 'https://evil.example' }))).statusCode).toBe(403);
    expect((await handler(post('/events', { events: [{ type: 'question_answered' }] }))).statusCode).toBe(400); // nothing valid
    let last = null;
    for (let i = 0; i < 61; i++) last = await handler(post('/events', { events: [answered] }));
    expect(last.statusCode).toBe(429);
    expect(ddb.puts).toHaveLength(60);
  });

  test('the kill switch stops writes', async () => {
    const handler = createHandler({ ddb: makeDdb(), fetchImpl: async () => ({ ok: false }), getGithubToken: async () => null, env: makeEnv({ ACCEPT_SUBMISSIONS: 'false' }) });
    expect((await handler(post('/events', { events: [answered] }))).statusCode).toBe(503);
  });
});
