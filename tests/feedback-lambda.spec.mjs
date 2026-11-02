import { test, expect } from '@playwright/test';
import {
  buildIssue,
  createHandler,
  GITHUB_TIMEOUT_MS,
  sanitizeForIssue,
  validateVotes,
} from '../infra/feedback/src/index.mjs';

/**
 * Pure-logic spec (no browser) for the feedback collector Lambda
 * (infra/feedback/src/index.mjs, issues #162 / #167). DynamoDB, SSM and the
 * GitHub API are replaced with in-memory fakes injected via createHandler().
 */

const ORIGIN = 'https://kenta-matsuda.github.io';

function makeEnv(overrides = {}) {
  return {
    TABLE_NAME: 'tbl',
    GITHUB_REPO: 'owner/repo',
    ALLOWED_ORIGINS: `${ORIGIN},http://localhost:8877`,
    ACCEPT_SUBMISSIONS: 'true',
    HASH_SALT: 'salt',
    ...overrides,
  };
}

// In-memory DynamoDB fake that honours the rate-limit ConditionExpression.
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
    async putItem(p) {
      puts.push(p.Item);
    },
    async batchWrite(_table, items) {
      puts.push(...items);
    },
  };
}

function makeFetch({ ok = true } = {}) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return {
      ok,
      status: ok ? 201 : 500,
      json: async () => ({ number: 42, html_url: 'https://github.com/owner/repo/issues/42' }),
      text: async () => 'err',
    };
  };
  fn.calls = calls;
  return fn;
}

function post(path, body, { origin = ORIGIN, ip = '203.0.113.5' } = {}) {
  return {
    rawPath: path,
    headers: { origin },
    requestContext: { http: { method: 'POST', sourceIp: ip } },
    body: JSON.stringify(body),
  };
}

const validFeedback = { category: 'bug_report', text: 'ボタンが押せません', elapsedMs: 5000, lang: 'ja' };

test.describe('feedback Lambda (#162 / #167)', () => {
  test('files a GitHub issue and stores the feedback', async () => {
    const ddb = makeDdb();
    const fetchImpl = makeFetch();
    const handler = createHandler({ ddb, fetchImpl, getGithubToken: async () => 'tok', env: makeEnv() });

    const res = await handler(post('/feedback', validFeedback));
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body)).toEqual({ ok: true, issueUrl: 'https://github.com/owner/repo/issues/42' });

    expect(fetchImpl.calls).toHaveLength(1);
    expect(fetchImpl.calls[0].url).toBe('https://api.github.com/repos/owner/repo/issues');
    expect(fetchImpl.calls[0].init.headers.authorization).toBe('Bearer tok');
    expect(fetchImpl.calls[0].body.labels).toEqual(['feedback', 'from-app', 'bug']);

    expect(ddb.puts).toHaveLength(1);
    expect(ddb.puts[0].text.S).toBe('ボタンが押せません');
    expect(ddb.puts[0].issue_number.N).toBe('42');
  });

  test('still stores feedback when no GitHub token is configured', async () => {
    const ddb = makeDdb();
    const fetchImpl = makeFetch();
    const handler = createHandler({ ddb, fetchImpl, getGithubToken: async () => null, env: makeEnv() });

    const res = await handler(post('/feedback', validFeedback));
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).issueUrl).toBeNull();
    expect(fetchImpl.calls).toHaveLength(0);
    expect(ddb.puts).toHaveLength(1);
  });

  test('still stores feedback when the GitHub API fails', async () => {
    const ddb = makeDdb();
    const handler = createHandler({ ddb, fetchImpl: makeFetch({ ok: false }), getGithubToken: async () => 'tok', env: makeEnv() });
    const res = await handler(post('/feedback', validFeedback));
    expect(res.statusCode).toBe(201);
    expect(ddb.puts).toHaveLength(1);
    expect(ddb.puts[0].issue_number).toBeUndefined();
  });

  test('issue footer is neutral (#247)', () => {
    const issue = buildIssue({ category: 'general', text: 'hello', lang: 'ja', appVersion: 'v13', page: '#/x' });
    expect(issue.body).toContain('AWS Study Navigator のフィードバックフォームから送信されました。');
    expect(issue.body).not.toMatch(/代理投稿|GitHub アカウント無し/);
    expect(issue.body).toContain('<sub>lang: ja / version: v13 / page: #/x</sub>');
  });

  test('attempts the GitHub issue on every submission (#247)', async () => {
    const ddb = makeDdb();
    const fetchImpl = makeFetch();
    const handler = createHandler({ ddb, fetchImpl, getGithubToken: async () => 'tok', env: makeEnv() });
    await handler(post('/feedback', { ...validFeedback, category: 'general' }));
    await handler(post('/feedback', { ...validFeedback, category: 'other' }, { ip: '198.51.100.9' }));
    expect(fetchImpl.calls).toHaveLength(2);
    expect(ddb.puts).toHaveLength(2);
    expect(ddb.puts.every((p) => p.issue_number?.N === '42')).toBe(true);
  });

  test('gives up on a slow GitHub API and still stores the feedback quickly', async () => {
    const ddb = makeDdb();
    let aborted = false;
    // Never resolves on its own; only the handler's AbortController ends it.
    const fetchImpl = (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        aborted = true;
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      });
    });
    const handler = createHandler({ ddb, fetchImpl, getGithubToken: async () => 'tok', env: makeEnv() });
    const started = Date.now();
    const res = await handler(post('/feedback', validFeedback));
    const elapsed = Date.now() - started;
    expect(aborted).toBe(true);
    expect(elapsed).toBeLessThan(GITHUB_TIMEOUT_MS + 2000);
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).issueUrl).toBeNull();
    expect(ddb.puts).toHaveLength(1);
    expect(ddb.puts[0].issue_number).toBeUndefined();
  });

  test('drops the cached token when GitHub answers 401', async () => {
    let invalidated = 0;
    const fetchImpl = async () => ({ ok: false, status: 401, text: async () => 'bad creds' });
    const handler = createHandler({
      ddb: makeDdb(),
      fetchImpl,
      getGithubToken: async () => 'old',
      invalidateGithubToken: () => { invalidated += 1; },
      env: makeEnv(),
    });
    const res = await handler(post('/feedback', validFeedback));
    expect(res.statusCode).toBe(201);
    expect(invalidated).toBe(1);
  });

  test('rejects bots, empty, oversized and link-spam submissions', async () => {
    const handler = createHandler({ ddb: makeDdb(), fetchImpl: makeFetch(), getGithubToken: async () => 'tok', env: makeEnv() });
    const cases = [
      [{ ...validFeedback, website: 'http://spam' }, 'rejected'],
      [{ ...validFeedback, elapsedMs: 100 }, 'rejected'],
      [{ ...validFeedback, text: '   ' }, 'empty_text'],
      [{ ...validFeedback, text: 'a'.repeat(1001) }, 'text_too_long'],
      [{ ...validFeedback, text: 'http://a http://b http://c http://d' }, 'too_many_links'],
    ];
    for (const [body, code] of cases) {
      const res = await handler(post('/feedback', body));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe(code);
    }
  });

  test('rejects foreign origins and honours the kill switch', async () => {
    const deps = { ddb: makeDdb(), fetchImpl: makeFetch(), getGithubToken: async () => 'tok' };
    const foreign = await createHandler({ ...deps, env: makeEnv() })(post('/feedback', validFeedback, { origin: 'https://evil.example' }));
    expect(foreign.statusCode).toBe(403);

    const paused = await createHandler({ ...deps, env: makeEnv({ ACCEPT_SUBMISSIONS: 'false' }) })(post('/feedback', validFeedback));
    expect(paused.statusCode).toBe(503);
  });

  test('rate-limits feedback per IP (3 per 10 minutes)', async () => {
    const handler = createHandler({ ddb: makeDdb(), fetchImpl: makeFetch(), getGithubToken: async () => null, env: makeEnv() });
    for (let i = 0; i < 3; i += 1) {
      expect((await handler(post('/feedback', validFeedback))).statusCode).toBe(201);
    }
    expect((await handler(post('/feedback', validFeedback))).statusCode).toBe(429);
    // A different IP is unaffected.
    expect((await handler(post('/feedback', validFeedback, { ip: '198.51.100.7' }))).statusCode).toBe(201);
  });

  test('stores vote events with whitelisted metadata only', async () => {
    const ddb = makeDdb();
    const handler = createHandler({ ddb, fetchImpl: makeFetch(), getGithubToken: async () => null, env: makeEnv() });
    const res = await handler(post('/votes', {
      events: [
        { targetType: 'ai', targetId: 'quiz|clf-c02|1.1', action: 'set', value: 'good', at: '2026-10-01T00:00:00Z', meta: { exam_id: 'clf-c02', email: 'x@example.com' } },
        { targetType: 'resource', targetId: 'r1', action: 'clear', value: 'bad', meta: {} },
      ],
    }));
    expect(res.statusCode).toBe(202);
    expect(ddb.puts).toHaveLength(2);
    expect(ddb.puts[0].pk.S).toBe('vote#ai#quiz|clf-c02|1.1');
    expect(ddb.puts[0].exam_id.S).toBe('clf-c02');
    expect(ddb.puts[0].email).toBeUndefined();
    expect(ddb.puts[1].action.S).toBe('clear');
  });

  test('validateVotes rejects malformed events', () => {
    expect(() => validateVotes({ events: [] })).toThrow();
    expect(() => validateVotes({ events: [{ targetType: 'x', targetId: 'a', value: 'good' }] })).toThrow();
    expect(() => validateVotes({ events: [{ targetType: 'ai', targetId: 'a', value: 'meh' }] })).toThrow();
    expect(() => validateVotes({ events: Array(51).fill({ targetType: 'ai', targetId: 'a', value: 'good' }) })).toThrow();
  });

  test('issue body neutralises @mentions and HTML comments', () => {
    expect(sanitizeForIssue('hi @octocat <!-- x -->')).toBe('hi @​octocat  x ');
    const issue = buildIssue({ category: 'feature_request', text: '@someone please', lang: 'ja' });
    expect(issue.title).toBe('[Feedback] 機能追加リクエスト');
    expect(issue.body).toContain('@​someone please');
    expect(issue.labels).toEqual(['feedback', 'from-app', 'enhancement']);
  });

  test('uploads screenshots and embeds them in the issue', async () => {
    const ddb = makeDdb();
    const fetchImpl = makeFetch();
    const uploads = [];
    const handler = createHandler({
      ddb,
      fetchImpl,
      getGithubToken: async () => 'tok',
      putImage: async (key, bytes, type) => uploads.push({ key, bytes, type }),
      env: makeEnv({ IMAGES_BASE_URL: 'https://cdn.example/' }),
    });
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16)]);

    const res = await handler(post('/feedback', {
      ...validFeedback,
      images: [{ data: png.toString('base64') }, { data: jpeg.toString('base64') }],
    }));
    expect(res.statusCode).toBe(201);
    expect(uploads.map((u) => u.type)).toEqual(['image/png', 'image/jpeg']);
    expect(uploads[0].key).toMatch(/^fb\/\d{4}\/\d{2}\/[0-9a-f]{32}\.png$/);
    const body = fetchImpl.calls[0].body.body;
    expect(body).toContain(`![screenshot 1](https://cdn.example/${uploads[0].key})`);
    expect(body).toContain(`![screenshot 2](https://cdn.example/${uploads[1].key})`);
    expect(ddb.puts[0].image_urls.L).toHaveLength(2);
  });

  test('rejects non-image, oversized and too many attachments', async () => {
    const uploads = [];
    const handler = createHandler({
      ddb: makeDdb(),
      fetchImpl: makeFetch(),
      getGithubToken: async () => null,
      putImage: async (key) => uploads.push(key),
      env: makeEnv({ IMAGES_BASE_URL: 'https://cdn.example' }),
    });
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);
    const cases = [
      [[{ data: Buffer.from('<svg onload=alert(1)></svg>').toString('base64') }], 'unsupported_image'],
      [[{ data: 'not base64!' }], 'invalid_image'],
      [[{ data: Buffer.concat([png, Buffer.alloc(1.6 * 1024 * 1024)]).toString('base64') }], 'image_too_large'],
      [Array(4).fill({ data: png.toString('base64') }), 'too_many_images'],
    ];
    for (const [images, code] of cases) {
      const res = await handler(post('/feedback', { ...validFeedback, images }));
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error).toBe(code);
    }
    expect(uploads).toHaveLength(0);
  });

  test('health check and unknown routes', async () => {
    const handler = createHandler({ ddb: makeDdb(), fetchImpl: makeFetch(), getGithubToken: async () => null, env: makeEnv() });
    const health = await handler({ rawPath: '/health', requestContext: { http: { method: 'GET' } } });
    expect(health.statusCode).toBe(200);
    expect((await handler(post('/nope', {}))).statusCode).toBe(404);
  });
});
