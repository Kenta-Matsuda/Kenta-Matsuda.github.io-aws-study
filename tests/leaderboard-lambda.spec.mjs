import { test, expect } from '@playwright/test';
import { createHandler } from '../infra/feedback/src/index.mjs';
import {
  isoWeek,
  periodInfo,
  publicIdForToken,
  rankEntries,
  sanitizeDisplayName,
  validateXpSubmission,
  MAX_XP_PER_DAY,
  MAX_XP_PER_REQUEST,
} from '../infra/feedback/src/leaderboard.mjs';

/**
 * Global XP leaderboard routes on the feedback collector Lambda (issue #32).
 * Pure logic (no browser). DynamoDB is an in-memory fake that understands the
 * exact condition / update expressions the handler issues, including
 * TransactWriteItems cancellation reasons.
 */

const ORIGIN = 'https://kenta-matsuda.github.io';
const TOKEN_A = 'a'.repeat(32);
const TOKEN_B = 'b'.repeat(32);
const TOKEN_C = 'c'.repeat(32);

function makeEnv(overrides = {}) {
  return { TABLE_NAME: 'tbl', ALLOWED_ORIGINS: `${ORIGIN},http://localhost:8877`, ACCEPT_SUBMISSIONS: 'true', HASH_SALT: 'salt', ...overrides };
}

function makeDdb({ pageSize = 1000 } = {}) {
  const items = new Map();
  const counters = new Map();
  const calls = { query: 0, transact: 0 };
  const keyOf = (k) => `${k.pk.S}|${k.sk.S}`;

  function conditionHolds(existing, cond, vals) {
    if (!cond) return true;
    if (cond === 'attribute_not_exists(pk)') return !existing;
    if (cond === 'attribute_not_exists(xp) OR xp <= :lim') return !existing?.xp || Number(existing.xp.N) <= Number(vals[':lim'].N);
    throw new Error(`fake ddb: unsupported condition ${cond}`);
  }

  function applyUpdate(existing, u) {
    const item = existing ? structuredClone(existing) : { pk: u.Key.pk, sk: u.Key.sk };
    const names = u.ExpressionAttributeNames || {};
    const vals = u.ExpressionAttributeValues || {};
    const m = u.UpdateExpression.match(/^ADD (\S+) (:\w+) SET (.+)$/);
    if (!m) throw new Error(`fake ddb: unsupported update ${u.UpdateExpression}`);
    const attr = (a) => names[a] || a;
    item[attr(m[1])] = { N: String(Number(item[attr(m[1])]?.N || 0) + Number(vals[m[2]].N)) };
    for (const pair of m[3].split(',')) {
      const [a, v] = pair.split('=').map((s) => s.trim());
      item[attr(a)] = vals[v];
    }
    return item;
  }

  return {
    items,
    calls,
    async updateItem(p) {
      // Only the per-IP rate limiter uses plain UpdateItem.
      const key = keyOf(p.Key);
      const n = counters.get(key) || 0;
      if (n >= Number(p.ExpressionAttributeValues[':max'].N)) {
        const err = new Error('cond');
        err.name = 'ConditionalCheckFailedException';
        throw err;
      }
      counters.set(key, n + 1);
    },
    async putItem(p) { items.set(keyOf(p.Item), p.Item); },
    async batchWrite(_t, list) { for (const it of list) items.set(keyOf(it), it); },
    async batchDelete(_t, keys) { for (const k of keys) items.delete(keyOf(k)); },
    async getItem(p) { return { Item: items.get(keyOf(p.Key)) }; },
    async transactWrite(tx) {
      calls.transact += 1;
      const reasons = tx.map((op) => {
        const o = op.Put || op.Update;
        const existing = items.get(keyOf(op.Put ? o.Item : o.Key));
        return { Code: conditionHolds(existing, o.ConditionExpression, o.ExpressionAttributeValues) ? 'None' : 'ConditionalCheckFailed' };
      });
      if (reasons.some((r) => r.Code !== 'None')) {
        const err = new Error('Transaction cancelled');
        err.name = 'TransactionCanceledException';
        err.CancellationReasons = reasons;
        throw err;
      }
      for (const op of tx) {
        if (op.Put) items.set(keyOf(op.Put.Item), op.Put.Item);
        else items.set(keyOf(op.Update.Key), applyUpdate(items.get(keyOf(op.Update.Key)), op.Update));
      }
    },
    async query(p) {
      calls.query += 1;
      const pk = p.ExpressionAttributeValues[':pk'].S;
      const all = [...items.values()].filter((it) => it.pk.S === pk).sort((a, b) => a.sk.S.localeCompare(b.sk.S));
      const start = p.ExclusiveStartKey ? all.findIndex((it) => it.sk.S === p.ExclusiveStartKey.sk.S) + 1 : 0;
      const page = all.slice(start, start + pageSize);
      const more = start + pageSize < all.length;
      return { Items: page, LastEvaluatedKey: more ? { pk: page.at(-1).pk, sk: page.at(-1).sk } : undefined };
    },
  };
}

function post(path, body, { origin = ORIGIN, ip = '203.0.113.5' } = {}) {
  return { rawPath: path, headers: { origin }, requestContext: { http: { method: 'POST', sourceIp: ip } }, body: JSON.stringify(body) };
}

function get(query, { origin = ORIGIN } = {}) {
  return { rawPath: '/leaderboard', headers: { origin }, queryStringParameters: query, requestContext: { http: { method: 'GET', sourceIp: '203.0.113.5' } } };
}

function setup({ env = {}, pageSize, start = '2026-10-13T03:00:00Z' } = {}) {
  const ddb = makeDdb({ pageSize });
  const clock = { t: new Date(start) };
  const handler = createHandler({ ddb, fetchImpl: async () => ({ ok: false }), getGithubToken: async () => null, env: makeEnv(env), now: () => clock.t });
  let n = 0;
  const send = (token, xp, extra = {}) => handler(post('/leaderboard/xp', { token, xp, name: 'user', batchId: `batch_${(n += 1)}_x`, ...extra }, { ip: `198.51.100.${n % 250}` }));
  return { ddb, clock, handler, send };
}

const body = (res) => JSON.parse(res.body);

test.describe('leaderboard periods (UTC, ISO weeks)', () => {
  test('daily / weekly / monthly keys and boundaries', () => {
    const d = new Date('2026-10-13T03:00:00Z'); // Tuesday
    expect(periodInfo('daily', d)).toMatchObject({ key: '2026-10-13', pk: 'lb#daily#2026-10-13' });
    expect(periodInfo('daily', d).end.toISOString()).toBe('2026-10-14T00:00:00.000Z');
    const w = periodInfo('weekly', d);
    expect(w).toMatchObject({ key: '2026-W42', pk: 'lb#weekly#2026-W42' });
    expect(w.start.toISOString()).toBe('2026-10-12T00:00:00.000Z'); // Monday
    expect(w.end.toISOString()).toBe('2026-10-19T00:00:00.000Z');
    const m = periodInfo('monthly', d);
    expect(m).toMatchObject({ key: '2026-10', pk: 'lb#monthly#2026-10' });
    expect(m.end.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(periodInfo('all', d)).toMatchObject({ key: 'all', pk: 'lb#all', start: null, end: null });
    expect(() => periodInfo('yearly', d)).toThrow(/invalid_period/);
    // 08:59 JST is still the previous UTC day.
    expect(periodInfo('daily', new Date('2026-10-13T08:59:00+09:00')).key).toBe('2026-10-12');
    expect(periodInfo('daily', new Date('2026-10-13T09:00:00+09:00')).key).toBe('2026-10-13');
  });

  test('ISO week numbering across year boundaries', () => {
    expect(isoWeek(new Date('2026-01-01T00:00:00Z'))).toEqual({ year: 2026, week: 1 }); // Thursday
    expect(isoWeek(new Date('2027-01-01T00:00:00Z'))).toEqual({ year: 2026, week: 53 }); // Friday
    expect(isoWeek(new Date('2024-12-30T00:00:00Z'))).toEqual({ year: 2025, week: 1 }); // Monday
    expect(isoWeek(new Date('2026-10-18T23:59:59Z'))).toEqual({ year: 2026, week: 42 }); // Sunday
    expect(isoWeek(new Date('2026-10-19T00:00:00Z'))).toEqual({ year: 2026, week: 43 });
    expect(periodInfo('weekly', new Date('2027-01-01T00:00:00Z')).start.toISOString()).toBe('2026-12-28T00:00:00.000Z');
  });
});

test.describe('leaderboard validation', () => {
  test('display names are stripped of control / invisible characters and capped', () => {
    expect(sanitizeDisplayName('  matsu  ')).toBe('matsu');
    expect(sanitizeDisplayName('a‮evil​\u0000b')).toBe('aevilb');
    expect(sanitizeDisplayName('a \n\t b')).toBe('a b');
    expect(sanitizeDisplayName('😀'.repeat(40))).toBe('😀'.repeat(30));
    expect(sanitizeDisplayName(null)).toBe('');
    expect(sanitizeDisplayName('<b>x</b>')).toBe('<b>x</b>'); // rendered as text by the client
  });

  test('validateXpSubmission enforces token, batch id and XP range', () => {
    const ok = validateXpSubmission({ token: TOKEN_A, xp: 10, batchId: 'abcdefgh', name: ' n ' });
    expect(ok).toMatchObject({ xp: 10, name: 'n', publicId: publicIdForToken(TOKEN_A) });
    expect(ok.publicId).toMatch(/^[a-f0-9]{20}$/);
    expect(() => validateXpSubmission({ token: 'short', xp: 10, batchId: 'abcdefgh' })).toThrow(/invalid_token/);
    expect(() => validateXpSubmission({ token: TOKEN_A, xp: 10, batchId: 'a b' })).toThrow(/invalid_batch_id/);
    for (const xp of [0, -5, 1.5, '10', MAX_XP_PER_REQUEST + 1, null]) {
      expect(() => validateXpSubmission({ token: TOKEN_A, xp, batchId: 'abcdefgh' })).toThrow(/invalid_xp/);
    }
  });

  test('rankEntries uses competition ranking and hides zero XP', () => {
    const ranked = rankEntries([
      { id: 'c', name: 'C', xp: 50, updatedAt: '2026-10-13T02:00:00Z' },
      { id: 'a', name: 'A', xp: 100, updatedAt: '2026-10-13T01:00:00Z' },
      { id: 'b', name: 'B', xp: 50, updatedAt: '2026-10-13T01:00:00Z' },
      { id: 'd', name: 'D', xp: 10 },
      { id: 'z', name: 'Z', xp: 0 },
    ]);
    expect(ranked.map((r) => [r.id, r.rank])).toEqual([['a', 1], ['b', 2], ['c', 2], ['d', 4]]);
  });
});

test.describe('leaderboard routes (#32)', () => {
  test('POST /leaderboard/xp adds to all four period buckets in one transaction', async () => {
    const { ddb, send } = setup();
    const res = await send(TOKEN_A, 30, { name: '  まつ‮ ' });
    expect(res.statusCode).toBe(202);
    const pid = publicIdForToken(TOKEN_A);
    expect(body(res)).toEqual({ ok: true, accepted: 30, capped: false, id: pid });
    expect(ddb.calls.transact).toBe(1);
    for (const pk of ['lb#daily#2026-10-13', 'lb#weekly#2026-W42', 'lb#monthly#2026-10', 'lb#all']) {
      const item = ddb.items.get(`${pk}|${pid}`);
      expect(item, pk).toBeTruthy();
      expect(item.xp.N).toBe('30');
      expect(item.name.S).toBe('まつ');
    }
    // Period buckets expire after a grace period; all-time never does.
    expect(Number(ddb.items.get(`lb#daily#2026-10-13|${pid}`).ttl.N)).toBe(Date.parse('2026-10-16T00:00:00Z') / 1000);
    expect(Number(ddb.items.get(`lb#weekly#2026-W42|${pid}`).ttl.N)).toBe(Date.parse('2026-10-26T00:00:00Z') / 1000);
    expect(ddb.items.get(`lb#all|${pid}`).ttl).toBeUndefined();
    // The write token itself is never stored.
    expect(JSON.stringify([...ddb.items.values()])).not.toContain(TOKEN_A);
  });

  test('retrying the same batchId is idempotent', async () => {
    const { ddb, handler } = setup();
    const req = post('/leaderboard/xp', { token: TOKEN_A, xp: 40, name: 'u', batchId: 'same_batch_1' });
    expect(body(await handler(req))).toMatchObject({ accepted: 40 });
    const again = await handler(req);
    expect(again.statusCode).toBe(200);
    expect(body(again)).toMatchObject({ ok: true, accepted: 0, duplicate: true });
    expect(ddb.items.get(`lb#all|${publicIdForToken(TOKEN_A)}`).xp.N).toBe('40');
  });

  test('the per-user daily cap clamps and then drops XP, and resets the next UTC day', async () => {
    const { ddb, clock, send } = setup();
    const pid = publicIdForToken(TOKEN_A);
    for (let i = 0; i < 4; i++) expect(body(await send(TOKEN_A, 1000)).accepted).toBe(1000);
    expect(body(await send(TOKEN_A, 700)).accepted).toBe(700);
    const clamped = body(await send(TOKEN_A, 1000));
    expect(clamped).toMatchObject({ accepted: MAX_XP_PER_DAY - 4700, capped: true });
    expect(body(await send(TOKEN_A, 10))).toMatchObject({ accepted: 0, capped: true });
    expect(ddb.items.get(`lb#daily#2026-10-13|${pid}`).xp.N).toBe(String(MAX_XP_PER_DAY));

    clock.t = new Date('2026-10-14T00:00:01Z');
    expect(body(await send(TOKEN_A, 10)).accepted).toBe(10);
    expect(ddb.items.get(`lb#daily#2026-10-14|${pid}`).xp.N).toBe('10');
    expect(ddb.items.get(`lb#weekly#2026-W42|${pid}`).xp.N).toBe(String(MAX_XP_PER_DAY + 10));
  });

  test('GET /leaderboard ranks a period, returns the caller row and caches reads', async () => {
    const { ddb, clock, handler, send } = setup();
    await send(TOKEN_A, 100, { name: 'Alice' });
    await send(TOKEN_B, 300, { name: 'Bob' });
    await send(TOKEN_C, 200, { name: 'Carol' });
    clock.t = new Date('2026-10-14T03:00:00Z'); // next day: daily resets, weekly keeps adding
    await send(TOKEN_A, 500, { name: 'Alice2' });

    const daily = body(await handler(get({ period: 'daily' })));
    expect(daily).toMatchObject({ ok: true, period: 'daily', periodKey: '2026-10-14', timezone: 'UTC', participants: 1, periodEnd: '2026-10-15T00:00:00.000Z' });
    expect(daily.entries).toEqual([{ rank: 1, id: publicIdForToken(TOKEN_A), name: 'Alice2', xp: 500 }]);

    const weekly = body(await handler(get({ period: 'weekly', limit: '2', me: publicIdForToken(TOKEN_C) })));
    expect(weekly.participants).toBe(3);
    expect(weekly.entries.map((e) => [e.name, e.xp, e.rank])).toEqual([['Alice2', 600, 1], ['Bob', 300, 2]]);
    expect(weekly.me).toMatchObject({ rank: 3, name: 'Carol', xp: 200 });
    expect(weekly.entries[0]).not.toHaveProperty('token');

    // Cached for READ_CACHE_MS per period; a write in this container invalidates.
    const before = ddb.calls.query;
    await handler(get({ period: 'weekly' }));
    expect(ddb.calls.query).toBe(before);
    await send(TOKEN_B, 1);
    await handler(get({ period: 'weekly' }));
    expect(ddb.calls.query).toBe(before + 1);

    expect((await handler(get({ period: 'yearly' }))).statusCode).toBe(400);
    expect((await handler(get({ period: 'all' }, { origin: 'https://evil.example' }))).statusCode).toBe(403);
    const all = body(await handler(get({ period: 'all', me: 'not-an-id' })));
    expect(all).toMatchObject({ periodKey: 'all', periodStart: null, periodEnd: null, me: null });
  });

  test('reads every page of a large bucket', async () => {
    const { handler, send } = setup({ pageSize: 2 });
    for (const t of [TOKEN_A, TOKEN_B, TOKEN_C, 'd'.repeat(32), 'e'.repeat(32)]) await send(t, 10);
    const res = body(await handler(get({ period: 'monthly' })));
    expect(res.participants).toBe(5);
    expect(res.truncated).toBe(false);
  });

  test('POST /leaderboard/leave removes the participant from the current buckets', async () => {
    const { ddb, handler, send } = setup();
    await send(TOKEN_A, 100);
    await send(TOKEN_B, 50);
    const res = await handler(post('/leaderboard/leave', { token: TOKEN_A }));
    expect(res.statusCode).toBe(200);
    const pid = publicIdForToken(TOKEN_A);
    expect([...ddb.items.keys()].filter((k) => k.startsWith('lb#') && k.endsWith(pid))).toEqual([]);
    const all = body(await handler(get({ period: 'all' })));
    expect(all.entries.map((e) => e.id)).toEqual([publicIdForToken(TOKEN_B)]);
    expect((await handler(post('/leaderboard/leave', { token: 'nope' }))).statusCode).toBe(400);
  });

  test('kill switch stops XP writes but not reads or leaving', async () => {
    const { handler, send } = setup({ env: { ACCEPT_SUBMISSIONS: 'false' } });
    expect((await send(TOKEN_A, 10)).statusCode).toBe(503);
    expect((await handler(get({ period: 'daily' }))).statusCode).toBe(200);
    expect((await handler(post('/leaderboard/leave', { token: TOKEN_A }))).statusCode).toBe(200);
  });

  test('rate-limits XP submissions per IP and rejects bad payloads', async () => {
    const { handler } = setup();
    let last;
    for (let i = 0; i < 21; i++) {
      last = await handler(post('/leaderboard/xp', { token: TOKEN_A, xp: 1, batchId: `rate_batch_${i}` }));
    }
    expect(last.statusCode).toBe(429);
    expect((await handler(post('/leaderboard/xp', { token: TOKEN_A, xp: 5000, batchId: 'abcdefgh' }, { ip: '192.0.2.9' }))).statusCode).toBe(400);
    expect((await handler(post('/leaderboard/xp', { token: TOKEN_A, xp: 1, batchId: 'abcdefgh' }, { origin: 'https://evil.example' }))).statusCode).toBe(403);
    const other = { rawPath: '/leaderboards', headers: { origin: ORIGIN }, requestContext: { http: { method: 'GET' } } };
    expect((await handler(other)).statusCode).toBe(404);
  });
});
