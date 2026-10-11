// Feedback / vote collector for AWS Study Navigator (issues #162, #167).
//
// Exposed through a Lambda Function URL (no API Gateway) so the whole stack
// stays inside the AWS always-free tier at this site's traffic level.
//
//   POST /feedback  { category, text, lang, appVersion, page, elapsedMs, website }
//     -> stores the feedback in DynamoDB and, when a GitHub token is configured
//        in SSM, files it as a GitHub issue on the user's behalf (no account).
//   POST /votes     { events: [{ targetType, targetId, action, value, at, meta }] }
//     -> appends Good/Bad vote events to DynamoDB for later analysis.
//   GET  /health
//
// CORS is handled by the Function URL config (template.yaml); this handler
// must NOT add Access-Control-* headers itself or browsers see duplicates.
//
// Zero dependencies: the AWS SDK v3 ships with the nodejs runtime, and GitHub
// is called with the built-in fetch. The handler is built by createHandler()
// so tests can inject fakes for DynamoDB / SSM / fetch / clock.

import { createHash, randomBytes } from 'node:crypto';

export const FEEDBACK_MAX_LENGTH = 1000;
export const MAX_URLS_IN_FEEDBACK = 3;
export const MIN_COMPOSE_MS = 2000;
export const MAX_VOTE_EVENTS = 50;
export const MAX_BODY_BYTES = 32 * 1024;

const FEEDBACK_TTL_DAYS = 400;
const VOTE_TTL_DAYS = 800;

// Per-IP limits: [bucket seconds, max requests per bucket]
const RATE_LIMITS = {
  feedback: [600, 3],
  votes: [60, 30],
};

const CATEGORIES = {
  general: { ja: '全般', label: '' },
  resource_request: { ja: '学習リソースの追加', label: '' },
  feature_request: { ja: '機能追加リクエスト', label: 'enhancement' },
  bug_report: { ja: '不具合', label: 'bug' },
  ai_quality: { ja: 'AI機能の品質', label: '' },
  ui_ux: { ja: 'UI / 使いやすさ', label: '' },
  other: { ja: 'その他', label: '' },
};

const VOTE_META_KEYS = [
  'exam_id', 'ai_kind', 'ai_term', 'ai_task_id', 'ai_task_title', 'domain_id',
  'task_id', 'task_title', 'resource_section', 'resource_title', 'resource_url',
];

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function json(status, body) {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
}

function clip(value, max) {
  return String(value ?? '').slice(0, max);
}

function randomSuffix() {
  return randomBytes(6).toString('hex');
}

export function hashIp(ip, salt) {
  return createHash('sha256').update(`${salt}|${ip}`).digest('hex').slice(0, 32);
}

// Neutralise @mentions so a submission cannot ping arbitrary GitHub users, and
// keep the user's text out of any HTML comment / details structure.
export function sanitizeForIssue(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/@(?=[A-Za-z0-9-])/g, '@​')
    .replace(/<!--|-->/g, '');
}

export function countUrls(text) {
  return (String(text).match(/https?:\/\//gi) || []).length;
}

export function parseBody(event) {
  let raw = event?.body ?? '';
  if (event?.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf8');
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) throw new HttpError(413, 'payload_too_large');
  try {
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not object');
    return parsed;
  } catch {
    throw new HttpError(400, 'invalid_json');
  }
}

export function validateFeedback(body) {
  // Honeypot: real users never see or fill the `website` field.
  if (String(body.website || '').trim()) throw new HttpError(400, 'rejected');
  const elapsed = Number(body.elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed < MIN_COMPOSE_MS) throw new HttpError(400, 'rejected');

  const text = String(body.text ?? '').trim();
  if (!text) throw new HttpError(400, 'empty_text');
  if (text.length > FEEDBACK_MAX_LENGTH) throw new HttpError(400, 'text_too_long');
  if (countUrls(text) > MAX_URLS_IN_FEEDBACK) throw new HttpError(400, 'too_many_links');

  const category = Object.hasOwn(CATEGORIES, body.category) ? body.category : 'general';
  return {
    category,
    text,
    lang: clip(body.lang, 10),
    appVersion: clip(body.appVersion, 40),
    page: clip(body.page, 200),
  };
}

export function validateVotes(body) {
  const events = Array.isArray(body.events) ? body.events : null;
  if (!events || events.length === 0) throw new HttpError(400, 'no_events');
  if (events.length > MAX_VOTE_EVENTS) throw new HttpError(400, 'too_many_events');

  return events.map((e) => {
    const targetType = String(e?.targetType || '');
    const targetId = clip(e?.targetId, 300).trim();
    const action = e?.action === 'clear' ? 'clear' : 'set';
    const value = String(e?.value || '');
    if (!['ai', 'resource'].includes(targetType)) throw new HttpError(400, 'invalid_target_type');
    if (!targetId) throw new HttpError(400, 'missing_target_id');
    if (!['good', 'bad'].includes(value)) throw new HttpError(400, 'invalid_value');
    const at = Number.isNaN(Date.parse(e?.at)) ? null : new Date(e.at).toISOString();
    const meta = {};
    for (const key of VOTE_META_KEYS) {
      const v = e?.meta?.[key];
      if (v !== undefined && v !== null && String(v) !== '') meta[key] = clip(v, 300);
    }
    return { targetType, targetId, action, value, at, meta };
  });
}

export function buildIssue({ category, text, lang, appVersion, page }) {
  const cat = CATEGORIES[category] || CATEGORIES.general;
  const title = `[Feedback] ${cat.ja}`;
  const context = [
    lang && `lang: ${lang}`,
    appVersion && `version: ${appVersion}`,
    page && `page: ${page}`,
  ].filter(Boolean).join(' / ');
  const body = [
    `**カテゴリ:** ${cat.ja}`,
    '',
    sanitizeForIssue(text),
    '',
    '---',
    'AWS Study Navigator アプリのフィードバックフォームから、GitHub アカウント無しで送信されました（Lambda 経由の代理投稿）。',
    context ? `<sub>${context.replace(/[<>]/g, '')}</sub>` : '',
  ].filter((line, i, arr) => !(line === '' && i === arr.length - 1)).join('\n');
  const labels = ['feedback', 'from-app', cat.label].filter(Boolean);
  return { title, body, labels };
}

export function createHandler(deps) {
  const {
    ddb, // { updateItem(params), putItem(params), batchWrite(items) }
    getGithubToken, // async () => string | null
    fetchImpl = fetch,
    now = () => new Date(),
    env = process.env,
  } = deps;

  const table = env.TABLE_NAME;
  const repo = env.GITHUB_REPO; // "owner/name"
  const allowedOrigins = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);

  async function enforceRateLimit(kind, ipHash) {
    const [bucketSec, max] = RATE_LIMITS[kind];
    const nowSec = Math.floor(now().getTime() / 1000);
    const bucket = Math.floor(nowSec / bucketSec);
    try {
      await ddb.updateItem({
        TableName: table,
        Key: { pk: { S: `rl#${kind}#${ipHash}` }, sk: { S: String(bucket) } },
        UpdateExpression: 'ADD n :one SET #ttl = :ttl',
        ConditionExpression: 'attribute_not_exists(n) OR n < :max',
        ExpressionAttributeNames: { '#ttl': 'ttl' },
        ExpressionAttributeValues: {
          ':one': { N: '1' },
          ':max': { N: String(max) },
          ':ttl': { N: String((bucket + 2) * bucketSec) },
        },
      });
    } catch (err) {
      if (err?.name === 'ConditionalCheckFailedException') throw new HttpError(429, 'rate_limited');
      throw err;
    }
  }

  async function createGithubIssue(issue) {
    const token = await getGithubToken();
    if (!token || !repo) return null;
    const res = await fetchImpl(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'aws-study-feedback-lambda',
        'content-type': 'application/json',
      },
      body: JSON.stringify(issue),
    });
    if (!res.ok) {
      console.error('github_issue_failed', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = await res.json();
    return { number: data.number, url: data.html_url };
  }

  async function handleFeedback(body, ipHash) {
    const fb = validateFeedback(body);
    await enforceRateLimit('feedback', ipHash);

    const ts = now();
    // Issue creation is best-effort: the submission is never lost because it is
    // persisted below even when GitHub is down or the token is not configured.
    let issue = null;
    try {
      issue = await createGithubIssue(buildIssue(fb));
    } catch (err) {
      console.error('github_issue_error', err);
    }

    const item = {
      pk: { S: 'feedback' },
      sk: { S: `${ts.toISOString()}#${randomSuffix()}` },
      type: { S: 'feedback' },
      category: { S: fb.category },
      text: { S: fb.text },
      ip_hash: { S: ipHash },
      ttl: { N: String(Math.floor(ts.getTime() / 1000) + FEEDBACK_TTL_DAYS * 86400) },
    };
    if (fb.lang) item.lang = { S: fb.lang };
    if (fb.appVersion) item.app_version = { S: fb.appVersion };
    if (fb.page) item.page = { S: fb.page };
    if (issue) {
      item.issue_number = { N: String(issue.number) };
      item.issue_url = { S: issue.url };
    }
    await ddb.putItem({ TableName: table, Item: item });

    return json(201, { ok: true, issueUrl: issue?.url ?? null });
  }

  async function handleVotes(body, ipHash) {
    const events = validateVotes(body);
    await enforceRateLimit('votes', ipHash);

    const ts = now();
    const ttl = String(Math.floor(ts.getTime() / 1000) + VOTE_TTL_DAYS * 86400);
    const items = events.map((e) => {
      const item = {
        pk: { S: `vote#${e.targetType}#${e.targetId}` },
        sk: { S: `${e.at || ts.toISOString()}#${randomSuffix()}` },
        type: { S: 'vote' },
        target_type: { S: e.targetType },
        target_id: { S: e.targetId },
        action: { S: e.action },
        value: { S: e.value },
        received_at: { S: ts.toISOString() },
        ip_hash: { S: ipHash },
        ttl: { N: ttl },
      };
      for (const [k, v] of Object.entries(e.meta)) item[k] = { S: v };
      return item;
    });
    await ddb.batchWrite(table, items);
    return json(202, { ok: true, accepted: items.length });
  }

  return async function handler(event) {
    const method = event?.requestContext?.http?.method || 'GET';
    const path = String(event?.rawPath || '/').replace(/\/+$/, '') || '/';

    try {
      if (method === 'GET' && path === '/health') return json(200, { ok: true });
      if (method !== 'POST') throw new HttpError(404, 'not_found');

      // Kill switch: flip ACCEPT_SUBMISSIONS to "false" to stop all writes.
      if (env.ACCEPT_SUBMISSIONS !== 'true') throw new HttpError(503, 'paused');

      // Function URL CORS stops browsers on other origins from reading the
      // response, but not from sending; reject foreign origins outright too.
      const origin = event?.headers?.origin || '';
      if (allowedOrigins.length && !allowedOrigins.includes(origin)) throw new HttpError(403, 'forbidden_origin');

      const ip = event?.requestContext?.http?.sourceIp || 'unknown';
      const ipHash = hashIp(ip, env.HASH_SALT || '');
      const body = parseBody(event);

      if (path === '/feedback') return await handleFeedback(body, ipHash);
      if (path === '/votes') return await handleVotes(body, ipHash);
      throw new HttpError(404, 'not_found');
    } catch (err) {
      if (err instanceof HttpError) return json(err.status, { ok: false, error: err.code });
      console.error('unhandled', err);
      return json(500, { ok: false, error: 'internal' });
    }
  };
}

// --- AWS wiring (only evaluated in Lambda; tests import createHandler) ---

let cachedHandler = null;

async function buildAwsHandler() {
  const { DynamoDBClient, UpdateItemCommand, PutItemCommand, BatchWriteItemCommand } = await import('@aws-sdk/client-dynamodb');
  const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm');
  const dynamo = new DynamoDBClient({});
  const ssm = new SSMClient({});

  let tokenPromise = null;
  const getGithubToken = () => {
    if (!tokenPromise) {
      tokenPromise = ssm
        .send(new GetParameterCommand({ Name: process.env.GITHUB_TOKEN_PARAM, WithDecryption: true }))
        .then((r) => r.Parameter?.Value || null)
        .catch((err) => {
          // Missing parameter = "issue filing not set up yet"; feedback is still stored.
          console.warn('github_token_unavailable', err?.name);
          tokenPromise = null;
          return null;
        });
    }
    return tokenPromise;
  };

  const ddb = {
    updateItem: (p) => dynamo.send(new UpdateItemCommand(p)),
    putItem: (p) => dynamo.send(new PutItemCommand(p)),
    async batchWrite(table, items) {
      for (let i = 0; i < items.length; i += 25) {
        let req = { [table]: items.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } })) };
        for (let attempt = 0; attempt < 3 && req && Object.keys(req).length; attempt += 1) {
          const out = await dynamo.send(new BatchWriteItemCommand({ RequestItems: req }));
          req = out.UnprocessedItems;
        }
      }
    },
  };

  return createHandler({ ddb, getGithubToken });
}

export async function handler(event) {
  if (!cachedHandler) cachedHandler = await buildAwsHandler();
  return cachedHandler(event);
}
