// Global XP leaderboard (issue #32): daily / weekly / monthly / all-time.
//
//   POST /leaderboard/xp     { token, name, xp, batchId }   -> 202 { ok, accepted, duplicate?, capped? }
//   POST /leaderboard/leave  { token }                       -> 200 { ok, removed }
//   GET  /leaderboard?period=daily|weekly|monthly|all&limit=50&me=<publicId>
//
// Participation is opt-in on the client. A participant is identified only by a
// random 128-bit `token` generated in the browser (no account). The token is
// a write credential and never leaves the request body; what is stored and
// shown is the public id = sha256("lb|" + token)[0..20], which the client can
// compute too (to find itself in the list) but which cannot be used to write.
//
// Data model (same single table as feedback/votes, pk/sk + TTL):
//   pk lb#daily#2026-10-13   sk <publicId>  { xp, name, updated_at, ttl }   period buckets,
//   pk lb#weekly#2026-W42    sk <publicId>  { ... }                          one item per participant
//   pk lb#monthly#2026-10    sk <publicId>  { ... }
//   pk lb#all                sk <publicId>  { xp, name, updated_at }        (no TTL)
//   pk lbu#<publicId>        sk day#2026-10-13 { xp, ttl }                  per-user daily cap counter
//   pk lbb#<publicId>        sk <batchId>      { ttl }                      idempotency marker
//
// One accepted submission is a single TransactWriteItems (marker + cap counter
// + 4 buckets), so a retry of the same batchId never double counts and a
// partial failure never leaves the buckets out of sync.
//
// Period boundaries are UTC (daily resets at 00:00 UTC = 09:00 JST; weeks are
// ISO 8601 weeks starting Monday 00:00 UTC). The server clock decides which
// bucket XP lands in; client timestamps are ignored so XP cannot be backdated.
//
// Reading: a period bucket is Queried in full (participants are opt-in, so a
// bucket is expected to hold hundreds to a few thousand small items), sorted
// in memory and cached per Lambda container for READ_CACHE_MS.

import { createHash } from 'node:crypto';
import { HttpError, json } from './http.mjs';

export const LEADERBOARD_PERIODS = ['daily', 'weekly', 'monthly', 'all'];
export const MAX_XP_PER_REQUEST = 1000;
export const MAX_XP_PER_DAY = 5000;
export const MAX_DISPLAY_NAME_LENGTH = 30;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;
export const READ_CACHE_MS = 30 * 1000;
export const MAX_READ_PAGES = 10;

const DAY_MS = 86400 * 1000;
// How long a finished period bucket is kept before TTL removes it.
const BUCKET_GRACE_DAYS = { daily: 2, weekly: 7, monthly: 31 };
const BATCH_MARKER_TTL_DAYS = 3;

const TOKEN_RE = /^[a-f0-9]{32}$/;
const PUBLIC_ID_RE = /^[a-f0-9]{20}$/;
const BATCH_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

const pad = (n, w = 2) => String(n).padStart(w, '0');

/** Public id shown on the leaderboard for a client token (also computable by the client). */
export function publicIdForToken(token) {
  return createHash('sha256').update(`lb|${token}`).digest('hex').slice(0, 20);
}

/** ISO 8601 week-numbering year and week of a date (UTC). */
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay() || 7; // Mon=1 .. Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dow); // Thursday of the same ISO week
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / DAY_MS + 1) / 7);
  return { year, week };
}

/**
 * The bucket a moment falls in for a period (UTC boundaries).
 * @returns {{ period: string, key: string, pk: string, start: Date|null, end: Date|null }}
 */
export function periodInfo(period, date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const dayStart = Date.UTC(y, m, date.getUTCDate());
  if (period === 'daily') {
    const key = `${y}-${pad(m + 1)}-${pad(date.getUTCDate())}`;
    return { period, key, pk: `lb#daily#${key}`, start: new Date(dayStart), end: new Date(dayStart + DAY_MS) };
  }
  if (period === 'weekly') {
    const { year, week } = isoWeek(date);
    const dow = date.getUTCDay() || 7;
    const start = dayStart - (dow - 1) * DAY_MS;
    const key = `${year}-W${pad(week)}`;
    return { period, key, pk: `lb#weekly#${key}`, start: new Date(start), end: new Date(start + 7 * DAY_MS) };
  }
  if (period === 'monthly') {
    const key = `${y}-${pad(m + 1)}`;
    return { period, key, pk: `lb#monthly#${key}`, start: new Date(Date.UTC(y, m, 1)), end: new Date(Date.UTC(y, m + 1, 1)) };
  }
  if (period === 'all') return { period, key: 'all', pk: 'lb#all', start: null, end: null };
  throw new HttpError(400, 'invalid_period');
}

/**
 * Display names are user-chosen free text shown to everyone: drop control and
 * invisible format characters (bidi overrides, zero-width joiners), collapse
 * whitespace and cap the length in code points. '' means "anonymous".
 */
export function sanitizeDisplayName(name) {
  return Array.from(
    String(name ?? '')
      .normalize('NFC')
      .replace(/[\p{Cc}\p{Cf}\p{Co}\p{Cn}]/gu, '')
      .replace(/\s+/gu, ' ')
      .trim(),
  ).slice(0, MAX_DISPLAY_NAME_LENGTH).join('').trim();
}

export function validateXpSubmission(body) {
  const token = String(body?.token ?? '');
  if (!TOKEN_RE.test(token)) throw new HttpError(400, 'invalid_token');
  const batchId = String(body?.batchId ?? '');
  if (!BATCH_ID_RE.test(batchId)) throw new HttpError(400, 'invalid_batch_id');
  const xp = body?.xp;
  if (typeof xp !== 'number' || !Number.isInteger(xp) || xp < 1 || xp > MAX_XP_PER_REQUEST) throw new HttpError(400, 'invalid_xp');
  return { token, publicId: publicIdForToken(token), batchId, xp, name: sanitizeDisplayName(body?.name) };
}

/**
 * Sort participants (xp desc, earlier achiever first on ties) and assign
 * standard competition ranks (1, 2, 2, 4). Zero-XP rows are not listed.
 * @param {{ id: string, name: string, xp: number, updatedAt?: string }[]} rows
 */
export function rankEntries(rows) {
  const sorted = rows
    .filter((r) => Number(r.xp) > 0)
    .sort((a, b) => (b.xp - a.xp)
      || String(a.updatedAt || '').localeCompare(String(b.updatedAt || ''))
      || a.id.localeCompare(b.id));
  let rank = 0;
  return sorted.map((r, i) => {
    if (i === 0 || r.xp !== sorted[i - 1].xp) rank = i + 1;
    return { rank, id: r.id, name: r.name, xp: r.xp };
  });
}

function isTransactionCancelled(err) {
  return err?.name === 'TransactionCanceledException';
}

function cancellationCodes(err) {
  return (err?.CancellationReasons || []).map((r) => r?.Code || 'None');
}

export function createLeaderboard({ ddb, table, now, enforceRateLimit }) {
  const cache = new Map(); // pk -> { at, ranked, truncated }

  const epochSec = (ms) => String(Math.floor(ms / 1000));

  function buildTransaction({ publicId, batchId, name, xp }, ts) {
    const day = periodInfo('daily', ts);
    const nowIso = ts.toISOString();
    const items = [
      {
        Put: {
          TableName: table,
          Item: {
            pk: { S: `lbb#${publicId}` },
            sk: { S: batchId },
            type: { S: 'leaderboard_batch' },
            ttl: { N: epochSec(ts.getTime() + BATCH_MARKER_TTL_DAYS * DAY_MS) },
          },
          ConditionExpression: 'attribute_not_exists(pk)',
        },
      },
      {
        Update: {
          TableName: table,
          Key: { pk: { S: `lbu#${publicId}` }, sk: { S: `day#${day.key}` } },
          UpdateExpression: 'ADD xp :d SET #ttl = :ttl',
          ConditionExpression: 'attribute_not_exists(xp) OR xp <= :lim',
          ExpressionAttributeNames: { '#ttl': 'ttl' },
          ExpressionAttributeValues: {
            ':d': { N: String(xp) },
            ':lim': { N: String(MAX_XP_PER_DAY - xp) },
            ':ttl': { N: epochSec(day.end.getTime() + 2 * DAY_MS) },
          },
        },
      },
    ];
    for (const period of LEADERBOARD_PERIODS) {
      const info = periodInfo(period, ts);
      const values = { ':d': { N: String(xp) }, ':n': { S: name }, ':u': { S: nowIso }, ':t': { S: 'leaderboard' } };
      let update = 'ADD xp :d SET #name = :n, updated_at = :u, #type = :t';
      const names = { '#name': 'name', '#type': 'type' };
      if (info.end) {
        update += ', #ttl = :ttl';
        names['#ttl'] = 'ttl';
        values[':ttl'] = { N: epochSec(info.end.getTime() + BUCKET_GRACE_DAYS[period] * DAY_MS) };
      }
      items.push({
        Update: {
          TableName: table,
          Key: { pk: { S: info.pk }, sk: { S: publicId } },
          UpdateExpression: update,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        },
      });
    }
    return items;
  }

  async function handleXp(body, ipHash) {
    const sub = validateXpSubmission(body);
    await enforceRateLimit('leaderboard', ipHash);
    const ts = now();

    let xp = sub.xp;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await ddb.transactWrite(buildTransaction({ ...sub, xp }, ts));
        cache.clear();
        return json(202, { ok: true, accepted: xp, capped: xp < sub.xp, id: sub.publicId });
      } catch (err) {
        if (!isTransactionCancelled(err)) throw err;
        const [marker, cap] = cancellationCodes(err);
        // Same batchId already applied: the client is retrying after a lost response.
        if (marker === 'ConditionalCheckFailed') return json(200, { ok: true, accepted: 0, duplicate: true, id: sub.publicId });
        if (cap !== 'ConditionalCheckFailed') throw err;
        // Daily cap: accept only what is left today (once), then drop the rest.
        if (attempt > 0) break;
        const day = periodInfo('daily', ts);
        const current = await ddb.getItem({
          TableName: table,
          Key: { pk: { S: `lbu#${sub.publicId}` }, sk: { S: `day#${day.key}` } },
          ConsistentRead: true,
        });
        const remaining = MAX_XP_PER_DAY - Number(current?.Item?.xp?.N || 0);
        if (remaining <= 0) break;
        xp = Math.min(xp, remaining);
      }
    }
    return json(202, { ok: true, accepted: 0, capped: true, id: sub.publicId });
  }

  async function handleLeave(body, ipHash) {
    const token = String(body?.token ?? '');
    if (!TOKEN_RE.test(token)) throw new HttpError(400, 'invalid_token');
    await enforceRateLimit('leaderboard_leave', ipHash);
    const publicId = publicIdForToken(token);
    const ts = now();
    // Current and previous bucket of each period (the only ones still listed or
    // about to expire); older buckets are already gone through TTL.
    const previous = { daily: new Date(ts.getTime() - DAY_MS), weekly: new Date(ts.getTime() - 7 * DAY_MS) };
    const pks = new Set();
    for (const period of LEADERBOARD_PERIODS) {
      const info = periodInfo(period, ts);
      pks.add(info.pk);
      if (period === 'monthly') pks.add(periodInfo(period, new Date(info.start.getTime() - 1)).pk);
      else if (previous[period]) pks.add(periodInfo(period, previous[period]).pk);
    }
    const keys = [...pks].map((pk) => ({ pk: { S: pk }, sk: { S: publicId } }));
    await ddb.batchDelete(table, keys);
    cache.clear();
    return json(200, { ok: true, removed: keys.length });
  }

  async function loadRanked(pk) {
    const hit = cache.get(pk);
    if (hit && now().getTime() - hit.at < READ_CACHE_MS) return hit;
    const rows = [];
    let startKey;
    let pages = 0;
    do {
      const out = await ddb.query({
        TableName: table,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': { S: pk } },
        ProjectionExpression: 'sk, xp, #name, updated_at',
        ExpressionAttributeNames: { '#name': 'name' },
        ExclusiveStartKey: startKey,
      });
      for (const item of out?.Items || []) {
        rows.push({ id: item.sk.S, name: item.name?.S || '', xp: Number(item.xp?.N || 0), updatedAt: item.updated_at?.S || '' });
      }
      startKey = out?.LastEvaluatedKey;
      pages += 1;
    } while (startKey && pages < MAX_READ_PAGES);
    const entry = { at: now().getTime(), ranked: rankEntries(rows), truncated: Boolean(startKey) };
    cache.set(pk, entry);
    return entry;
  }

  async function handleRead(query) {
    const period = String(query?.period || 'weekly');
    if (!LEADERBOARD_PERIODS.includes(period)) throw new HttpError(400, 'invalid_period');
    const limitRaw = Number(query?.limit ?? DEFAULT_LIMIT);
    const limit = Number.isFinite(limitRaw) ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(limitRaw))) : DEFAULT_LIMIT;
    const me = PUBLIC_ID_RE.test(String(query?.me || '')) ? String(query.me) : null;

    const ts = now();
    const info = periodInfo(period, ts);
    const { ranked, truncated } = await loadRanked(info.pk);
    return json(200, {
      ok: true,
      period,
      periodKey: info.key,
      periodStart: info.start ? info.start.toISOString() : null,
      periodEnd: info.end ? info.end.toISOString() : null,
      timezone: 'UTC',
      participants: ranked.length,
      truncated,
      entries: ranked.slice(0, limit),
      me: me ? (ranked.find((r) => r.id === me) || null) : null,
      generatedAt: ts.toISOString(),
    });
  }

  return { handleXp, handleLeave, handleRead };
}
