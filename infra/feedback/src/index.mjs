// Feedback / vote collector for AWS Study Navigator (issues #162, #167).
//
// Exposed through a Lambda Function URL (no API Gateway) so the whole stack
// stays inside the AWS always-free tier at this site's traffic level.
//
//   POST /feedback  { category, text, lang, appVersion, page, elapsedMs, website, images? }
//     -> stores the feedback in DynamoDB and, when a GitHub token is configured
//        in SSM, files it as a GitHub issue on the user's behalf (no account).
//        Optional screenshots (base64) go to a private S3 bucket and are
//        embedded in the issue through CloudFront.
//   POST /votes     { events: [{ targetType, targetId, action, value, at, meta }] }
//     -> appends Good/Bad vote events to DynamoDB for later analysis.
//   POST /events    { events: [{ type, at, examId, mode, setId, questionId, taskId, unitId, ... }] }
//     -> appends per-question learning events (issue #225 design §9) for
//        aggregation by exam + unit/task. Ids only; no question text.
//   POST /leaderboard/xp, POST /leaderboard/leave, GET /leaderboard?period=...
//     -> opt-in global XP leaderboard (issue #32), see leaderboard.mjs.
//   GET  /health
//
// CORS is handled by the Function URL config (template.yaml); this handler
// must NOT add Access-Control-* headers itself or browsers see duplicates.
//
// Zero dependencies: the AWS SDK v3 ships with the nodejs runtime, and GitHub
// is called with the built-in fetch. The handler is built by createHandler()
// so tests can inject fakes for DynamoDB / SSM / fetch / clock.

import { createHash, randomBytes } from 'node:crypto';
import { HttpError, json } from './http.mjs';
import { createLeaderboard } from './leaderboard.mjs';

export const FEEDBACK_MAX_LENGTH = 1000;
export const MAX_URLS_IN_FEEDBACK = 3;
export const MIN_COMPOSE_MS = 2000;
export const MAX_VOTE_EVENTS = 50;
export const MAX_LEARNING_EVENTS = 100;
export const MAX_IMAGES = 3;
export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
// Function URLs accept up to 6 MB; 3 base64 images of 1.5 MB fit under this.
export const MAX_BODY_BYTES = 5.5 * 1024 * 1024;

// The client re-encodes screenshots before upload, but never trust the
// declared type: detect it from the file signature instead.
const IMAGE_SIGNATURES = [
  { type: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/png', ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: 'image/webp', ext: 'webp', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
];

const FEEDBACK_TTL_DAYS = 400;
const VOTE_TTL_DAYS = 800;
const LEARNING_EVENT_TTL_DAYS = 800;

// Per-IP limits: [bucket seconds, max requests per bucket]
const RATE_LIMITS = {
  feedback: [600, 3],
  votes: [60, 30],
  events: [60, 60],
  leaderboard: [60, 20],
  leaderboard_leave: [600, 5],
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
    images: validateImages(body.images),
    lang: clip(body.lang, 10),
    appVersion: clip(body.appVersion, 40),
    page: clip(body.page, 200),
  };
}

// images: [{ data: '<base64>' }] -> [{ bytes: Buffer, type, ext }]
export function validateImages(images) {
  if (images === undefined || images === null) return [];
  if (!Array.isArray(images)) throw new HttpError(400, 'invalid_images');
  if (images.length > MAX_IMAGES) throw new HttpError(400, 'too_many_images');
  return images.map((img) => {
    const data = String(img?.data || '');
    if (!data || !/^[A-Za-z0-9+/]+=*$/.test(data)) throw new HttpError(400, 'invalid_image');
    const bytes = Buffer.from(data, 'base64');
    if (bytes.length > MAX_IMAGE_BYTES) throw new HttpError(400, 'image_too_large');
    const sig = IMAGE_SIGNATURES.find((s) => bytes.length >= 12 && s.test(bytes));
    if (!sig) throw new HttpError(400, 'unsupported_image');
    return { bytes, type: sig.type, ext: sig.ext };
  });
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

const LEARNING_EVENT_TYPES = ['question_generated', 'question_shown', 'question_answered', 'question_voted', 'set_completed'];
// Wire field (camelCase, design §9) -> stored attribute (snake_case, like votes/feedback).
const LEARNING_EVENT_ID_KEYS = { mode: 'mode', setId: 'set_id', questionId: 'question_id', domainId: 'domain_id', taskId: 'task_id', unitId: 'unit_id', cardId: 'card_id', reason: 'reason' };
const LEARNING_EVENT_NUM_KEYS = { userAnswer: ['user_answer', -1, 10], elapsedMs: ['elapsed_ms', 0, 3600000], judgeScore: ['judge_score', 0, 25], score: ['score', 0, 1], total: ['total', 0, 500], schema: ['schema', 0, 100] };

// Learning events (issue #225 §9): a fixed allow-list of types and fields, ids
// clipped, numbers range-checked. Anything else is dropped, never stored.
// Invalid events are rejected INDIVIDUALLY (not the whole batch): a client
// retries only on transient errors, so one bad event must not block the rest.
export function validateLearningEvents(body) {
  const events = Array.isArray(body.events) ? body.events : null;
  if (!events || events.length === 0) throw new HttpError(400, 'no_events');
  if (events.length > MAX_LEARNING_EVENTS) throw new HttpError(400, 'too_many_events');

  const valid = [];
  let rejected = 0;
  for (const e of events) {
    const type = String(e?.type || '');
    const examId = String(e?.examId || '').trim().toLowerCase();
    if (!LEARNING_EVENT_TYPES.includes(type) || !/^[a-z0-9_-]{1,32}$/.test(examId)) { rejected += 1; continue; }
    const at = Number.isNaN(Date.parse(e?.at)) ? null : new Date(e.at).toISOString();
    const out = { type, exam_id: examId, at };
    for (const [key, attr] of Object.entries(LEARNING_EVENT_ID_KEYS)) {
      const v = e?.[key];
      if (v !== undefined && v !== null && String(v) !== '') out[attr] = clip(v, 120);
    }
    for (const [key, [attr, min, max]] of Object.entries(LEARNING_EVENT_NUM_KEYS)) {
      const n = Number(e?.[key]);
      if (e?.[key] !== undefined && e?.[key] !== null && Number.isFinite(n) && n >= min && n <= max) out[attr] = n;
    }
    if (typeof e?.isCorrect === 'boolean') out.is_correct = e.isCorrect;
    if (e?.value === 'good' || e?.value === 'bad') out.value = e.value;
    valid.push(out);
  }
  if (valid.length === 0) throw new HttpError(400, 'no_valid_events');
  return { events: valid, rejected };
}

export function buildIssue({ category, text, lang, appVersion, page, imageUrls = [] }) {
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
    ...imageUrls.flatMap((url, i) => [`![screenshot ${i + 1}](${url})`, '']),
    '---',
    'AWS Study Navigator アプリのフィードバックフォームから、GitHub アカウント無しで送信されました（Lambda 経由の代理投稿）。',
    context ? `<sub>${context.replace(/[<>]/g, '')}</sub>` : '',
  ].filter((line, i, arr) => !(line === '' && i === arr.length - 1)).join('\n');
  const labels = ['feedback', 'from-app', cat.label].filter(Boolean);
  return { title, body, labels };
}

export function createHandler(deps) {
  const {
    ddb, // { updateItem, putItem, batchWrite(table, items), transactWrite(items), getItem, query, batchDelete(table, keys) }
    getGithubToken, // async () => string | null
    putImage, // async (key, bytes, contentType) => void
    fetchImpl = fetch,
    now = () => new Date(),
    env = process.env,
  } = deps;

  const table = env.TABLE_NAME;
  const repo = env.GITHUB_REPO; // "owner/name"
  const imagesBaseUrl = String(env.IMAGES_BASE_URL || '').replace(/\/+$/, '');
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

  const leaderboard = createLeaderboard({ ddb, table, now, enforceRateLimit });

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
    // Random, unguessable keys: the images are public via CloudFront once
    // embedded in the (public) issue, but cannot be enumerated.
    const imageKeys = [];
    if (fb.images.length) {
      if (!putImage || !imagesBaseUrl) throw new HttpError(400, 'images_unavailable');
      const month = ts.toISOString().slice(0, 7).replace('-', '/');
      for (const img of fb.images) {
        const key = `fb/${month}/${randomBytes(16).toString('hex')}.${img.ext}`;
        await putImage(key, img.bytes, img.type);
        imageKeys.push(key);
      }
    }
    const imageUrls = imageKeys.map((key) => `${imagesBaseUrl}/${key}`);

    // Issue creation is best-effort: the submission is never lost because it is
    // persisted below even when GitHub is down or the token is not configured.
    let issue = null;
    try {
      issue = await createGithubIssue(buildIssue({ ...fb, imageUrls }));
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
    if (imageUrls.length) item.image_urls = { L: imageUrls.map((u) => ({ S: u })) };
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

  async function handleLearningEvents(body, ipHash) {
    const { events, rejected } = validateLearningEvents(body);
    await enforceRateLimit('events', ipHash);

    const ts = now();
    const ttl = String(Math.floor(ts.getTime() / 1000) + LEARNING_EVENT_TTL_DAYS * 86400);
    const items = events.map((e) => {
      // Partition by exam + type; the unit/task ids are attributes so an export
      // can aggregate per unit (stable across users) rather than per question.
      const item = {
        pk: { S: `event#${e.exam_id}#${e.type}` },
        sk: { S: `${e.at || ts.toISOString()}#${randomSuffix()}` },
        type: { S: 'learning_event' },
        event_type: { S: e.type },
        exam_id: { S: e.exam_id },
        received_at: { S: ts.toISOString() },
        ip_hash: { S: ipHash },
        ttl: { N: ttl },
      };
      for (const attr of Object.values(LEARNING_EVENT_ID_KEYS)) if (e[attr] !== undefined) item[attr] = { S: e[attr] };
      for (const [attr] of Object.values(LEARNING_EVENT_NUM_KEYS)) if (e[attr] !== undefined) item[attr] = { N: String(e[attr]) };
      if (e.is_correct !== undefined) item.is_correct = { BOOL: e.is_correct };
      if (e.value !== undefined) item.value = { S: e.value };
      return item;
    });
    await ddb.batchWrite(table, items);
    return json(202, { ok: true, accepted: items.length, rejected });
  }

  return async function handler(event) {
    const method = event?.requestContext?.http?.method || 'GET';
    const path = String(event?.rawPath || '/').replace(/\/+$/, '') || '/';

    try {
      if (method === 'GET' && path === '/health') return json(200, { ok: true });
      if (method !== 'POST' && !(method === 'GET' && path === '/leaderboard')) throw new HttpError(404, 'not_found');

      // Function URL CORS stops browsers on other origins from reading the
      // response, but not from sending; reject foreign origins outright too.
      const origin = event?.headers?.origin || '';
      if (allowedOrigins.length && !allowedOrigins.includes(origin)) throw new HttpError(403, 'forbidden_origin');

      // Reads (cached per container, no writes) and leaving the leaderboard
      // (a privacy request) keep working while submissions are paused.
      if (method === 'GET') return await leaderboard.handleRead(event?.queryStringParameters || {});

      const ip = event?.requestContext?.http?.sourceIp || 'unknown';
      const ipHash = hashIp(ip, env.HASH_SALT || '');
      const body = parseBody(event);
      if (path === '/leaderboard/leave') return await leaderboard.handleLeave(body, ipHash);

      // Kill switch: flip ACCEPT_SUBMISSIONS to "false" to stop all writes.
      if (env.ACCEPT_SUBMISSIONS !== 'true') throw new HttpError(503, 'paused');

      if (path === '/feedback') return await handleFeedback(body, ipHash);
      if (path === '/votes') return await handleVotes(body, ipHash);
      if (path === '/events') return await handleLearningEvents(body, ipHash);
      if (path === '/leaderboard/xp') return await leaderboard.handleXp(body, ipHash);
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
  const {
    DynamoDBClient, UpdateItemCommand, PutItemCommand, BatchWriteItemCommand,
    TransactWriteItemsCommand, GetItemCommand, QueryCommand,
  } = await import('@aws-sdk/client-dynamodb');
  const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm');
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const dynamo = new DynamoDBClient({});
  const ssm = new SSMClient({});
  const s3 = new S3Client({});

  const putImage = (key, bytes, contentType) => s3.send(new PutObjectCommand({
    Bucket: process.env.IMAGES_BUCKET,
    Key: key,
    Body: bytes,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

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

  async function batchWriteRequests(table, requests) {
    for (let i = 0; i < requests.length; i += 25) {
      let req = { [table]: requests.slice(i, i + 25) };
      for (let attempt = 0; attempt < 3 && req && Object.keys(req).length; attempt += 1) {
        const out = await dynamo.send(new BatchWriteItemCommand({ RequestItems: req }));
        req = out.UnprocessedItems;
      }
    }
  }

  const ddb = {
    updateItem: (p) => dynamo.send(new UpdateItemCommand(p)),
    putItem: (p) => dynamo.send(new PutItemCommand(p)),
    batchWrite: (table, items) => batchWriteRequests(table, items.map((Item) => ({ PutRequest: { Item } }))),
    batchDelete: (table, keys) => batchWriteRequests(table, keys.map((Key) => ({ DeleteRequest: { Key } }))),
    transactWrite: (items) => dynamo.send(new TransactWriteItemsCommand({ TransactItems: items })),
    getItem: (p) => dynamo.send(new GetItemCommand(p)),
    query: (p) => dynamo.send(new QueryCommand(p)),
  };

  return createHandler({ ddb, getGithubToken, putImage });
}

export async function handler(event) {
  if (!cachedHandler) cachedHandler = await buildAwsHandler();
  return cachedHandler(event);
}
