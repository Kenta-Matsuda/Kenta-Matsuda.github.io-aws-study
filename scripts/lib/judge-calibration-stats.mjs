/**
 * Pure helpers for Judge calibration (issue #241 / #225 design §8.2):
 * stratified sampling, CSV I/O for the human score sheet, and agreement
 * statistics between human and Judge scores. No file system, no network.
 */

export const AXES = ['accuracy', 'uniqueness', 'distractors', 'fit', 'cues'];
export const HUMAN_COLUMNS = ['id', ...AXES, 'verdict', 'notes'];

/** Deterministic PRNG (mulberry32) so a sample can be reproduced from its seed. */
export function seededRng(seed = 1) {
  let a = Number(seed) >>> 0 || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Stratified sample by judge outcome (pass / fix / reject / unjudged) so the
 * human sees the items the Judge disliked as well as the ones it passed.
 * Every non-empty stratum gets at least `minPerStratum` items (when it has them),
 * the rest is allocated proportionally (largest remainder).
 * @param {object[]} items  each with `judge?.outcome`
 * @param {{ n?: number, seed?: number, minPerStratum?: number }} [opts]
 * @returns {object[]}
 */
export function stratifiedSample(items, { n = 30, seed = 1, minPerStratum = 3 } = {}) {
  const rng = seededRng(seed);
  const groups = new Map();
  for (const it of items) {
    const key = it?.judge?.outcome || 'unjudged';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  const total = items.length;
  const target = Math.min(n, total);
  const keys = [...groups.keys()].sort();
  const alloc = new Map(keys.map((k) => [k, Math.min(groups.get(k).length, minPerStratum)]));
  let used = [...alloc.values()].reduce((s, v) => s + v, 0);
  if (used > target) {
    // More strata than room: trim the largest allocations first.
    while (used > target) {
      const k = keys.reduce((best, x) => (alloc.get(x) > alloc.get(best) ? x : best), keys[0]);
      alloc.set(k, alloc.get(k) - 1);
      used--;
    }
  } else {
    const remaining = target - used;
    const spare = keys.map((k) => ({ k, room: groups.get(k).length - alloc.get(k) }));
    const roomTotal = spare.reduce((s, x) => s + x.room, 0);
    if (roomTotal > 0) {
      const shares = spare.map((x) => ({ ...x, exact: (x.room / roomTotal) * remaining }));
      shares.forEach((x) => { const add = Math.min(x.room, Math.floor(x.exact)); alloc.set(x.k, alloc.get(x.k) + add); used += add; });
      shares.sort((a, b) => (b.exact - Math.floor(b.exact)) - (a.exact - Math.floor(a.exact)));
      for (const x of shares) {
        if (used >= target) break;
        if (alloc.get(x.k) < groups.get(x.k).length) { alloc.set(x.k, alloc.get(x.k) + 1); used++; }
      }
    }
  }
  const picked = [];
  for (const k of keys) picked.push(...shuffle(groups.get(k), rng).slice(0, alloc.get(k)));
  return shuffle(picked, rng); // present in random order so the stratum is not visible
}

// ─── CSV (RFC 4180 subset; UTF-8 with BOM so spreadsheet apps keep Japanese) ───

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows, columns) {
  return `﻿${[columns.join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\r\n')}\r\n`;
}

export function parseCsv(text) {
  const src = String(text || '').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (!nonEmpty.length) return [];
  const header = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

/**
 * Validate and normalize human score rows. Rows with no scores at all are
 * skipped (not yet rated); partially filled rows are reported as problems.
 * @returns {{ rows: Array<{ id: string, scores: Record<string, number>, verdict: string }>, problems: string[], skipped: number }}
 */
export function normalizeHumanRows(raw) {
  const rows = [];
  const problems = [];
  let skipped = 0;
  for (const r of raw) {
    const id = String(r.id || '').trim();
    const filled = AXES.filter((a) => String(r[a] ?? '').trim() !== '');
    if (!filled.length && !String(r.verdict || '').trim()) { skipped++; continue; }
    const scores = {};
    let ok = true;
    for (const a of AXES) {
      const n = Number(r[a]);
      if (!Number.isInteger(n) || n < 1 || n > 5) { problems.push(`${id || '(no id)'}: ${a} must be an integer 1–5 (got "${r[a] ?? ''}")`); ok = false; } else scores[a] = n;
    }
    const verdict = String(r.verdict || '').trim().toLowerCase();
    if (!['pass', 'fix', 'reject'].includes(verdict)) { problems.push(`${id || '(no id)'}: verdict must be pass | fix | reject (got "${r.verdict ?? ''}")`); ok = false; }
    if (!id) { problems.push('row without id'); ok = false; }
    if (ok) rows.push({ id, scores, verdict });
  }
  return { rows, problems, skipped };
}

// ─── Agreement statistics ───

/** Quadratic-weighted Cohen's kappa for ordinal ratings on 1..k. */
export function weightedKappa(a, b, k = 5) {
  const n = a.length;
  if (!n || n !== b.length) return null;
  const O = Array.from({ length: k }, () => new Array(k).fill(0));
  const ra = new Array(k).fill(0);
  const rb = new Array(k).fill(0);
  for (let i = 0; i < n; i++) { O[a[i] - 1][b[i] - 1]++; ra[a[i] - 1]++; rb[b[i] - 1]++; }
  let num = 0;
  let den = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const w = ((i - j) ** 2) / ((k - 1) ** 2);
      num += w * O[i][j];
      den += w * (ra[i] * rb[j]) / n;
    }
  }
  if (den === 0) return num === 0 ? 1 : null; // no variation in either rater
  return 1 - num / den;
}

/** Cohen's kappa for two binary (boolean) raters. */
export function binaryKappa(a, b) {
  const n = a.length;
  if (!n || n !== b.length) return null;
  let agree = 0; let pa = 0; let pb = 0;
  for (let i = 0; i < n; i++) { if (a[i] === b[i]) agree++; if (a[i]) pa++; if (b[i]) pb++; }
  const po = agree / n;
  const pe = (pa / n) * (pb / n) + (1 - pa / n) * (1 - pb / n);
  if (pe === 1) return po === 1 ? 1 : null;
  return (po - pe) / (1 - pe);
}

/** Spearman rank correlation (average ranks for ties). */
export function spearman(a, b) {
  const n = a.length;
  if (n < 2 || n !== b.length) return null;
  const rank = (v) => {
    const idx = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]);
    const r = new Array(n);
    for (let i = 0; i < n;) {
      let j = i;
      while (j + 1 < n && idx[j + 1][0] === idx[i][0]) j++;
      for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
      i = j + 1;
    }
    return r;
  };
  const ra = rank(a); const rb = rank(b);
  const mean = (n + 1) / 2;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < n; i++) { num += (ra[i] - mean) * (rb[i] - mean); da += (ra[i] - mean) ** 2; db += (rb[i] - mean) ** 2; }
  return da && db ? num / Math.sqrt(da * db) : null;
}

/** Judge "pass" under a given threshold pair (same shape as PASS_MIN_AXIS / PASS_MIN_TOTAL). */
export function passesThreshold(scores, { minAxis, minTotal }) {
  const vals = AXES.map((a) => scores[a]);
  return vals.every((v) => v >= minAxis) && vals.reduce((s, v) => s + v, 0) >= minTotal;
}

/**
 * Compare human and Judge ratings item by item.
 * @param {Array<{ id: string, scores: Record<string, number>, verdict: string }>} human
 * @param {Record<string, { scores: Record<string, number>, verdict?: string|null }>} judgeById
 * @param {{ current?: { minAxis: number, minTotal: number } }} [opts]
 */
export function computeAgreement(human, judgeById, { current = { minAxis: 3, minTotal: 18 } } = {}) {
  const pairs = human.filter((h) => judgeById[h.id]?.scores && AXES.every((a) => Number.isFinite(judgeById[h.id].scores[a])))
    .map((h) => ({ id: h.id, h, j: judgeById[h.id] }));
  const missing = human.filter((h) => !pairs.some((p) => p.id === h.id)).map((h) => h.id);
  const perAxis = {};
  for (const a of AXES) {
    const hs = pairs.map((p) => p.h.scores[a]);
    const js = pairs.map((p) => p.j.scores[a]);
    const exact = pairs.filter((p) => p.h.scores[a] === p.j.scores[a]).length;
    const within1 = pairs.filter((p) => Math.abs(p.h.scores[a] - p.j.scores[a]) <= 1).length;
    const bias = pairs.length ? pairs.reduce((s, p) => s + (p.j.scores[a] - p.h.scores[a]), 0) / pairs.length : null;
    perAxis[a] = { n: pairs.length, exact: pairs.length ? exact / pairs.length : null, within1: pairs.length ? within1 / pairs.length : null, kappaQW: weightedKappa(hs, js), spearman: spearman(hs, js), meanBias: bias };
  }
  const total = (s) => AXES.reduce((t, a) => t + s[a], 0);
  const totals = { spearman: spearman(pairs.map((p) => total(p.h.scores)), pairs.map((p) => total(p.j.scores))) };

  const humanPass = pairs.map((p) => p.h.verdict === 'pass');
  const verdictPairs = pairs.filter((p) => p.j.verdict);
  const verdict = {
    n: verdictPairs.length,
    exact: verdictPairs.length ? verdictPairs.filter((p) => p.j.verdict === p.h.verdict).length / verdictPairs.length : null,
    confusion: Object.fromEntries(['pass', 'fix', 'reject'].map((hv) => [hv, Object.fromEntries(['pass', 'fix', 'reject'].map((jv) => [jv, verdictPairs.filter((p) => p.h.verdict === hv && p.j.verdict === jv).length]))])),
  };

  // Threshold sweep: which (minAxis, minTotal) makes the Judge's score-based pass
  // agree best with the human pass decision?
  const sweep = [];
  for (let minAxis = 2; minAxis <= 4; minAxis++) {
    for (let minTotal = 12; minTotal <= 25; minTotal++) {
      const jp = pairs.map((p) => passesThreshold(p.j.scores, { minAxis, minTotal }));
      const tp = jp.filter((v, i) => v && humanPass[i]).length;
      const fp = jp.filter((v, i) => v && !humanPass[i]).length;
      const fn = jp.filter((v, i) => !v && humanPass[i]).length;
      sweep.push({
        minAxis, minTotal,
        agreement: pairs.length ? jp.filter((v, i) => v === humanPass[i]).length / pairs.length : null,
        kappa: binaryKappa(jp, humanPass),
        // Precision of "pass" matters most: a passed item the human would fix reaches learners.
        passPrecision: tp + fp ? tp / (tp + fp) : null,
        passRecall: tp + fn ? tp / (tp + fn) : null,
      });
    }
  }
  const rankable = sweep.filter((s) => s.kappa !== null);
  rankable.sort((x, y) => (y.kappa - x.kappa) || ((y.passPrecision ?? 0) - (x.passPrecision ?? 0)) || (y.minTotal - x.minTotal));
  const currentRow = sweep.find((s) => s.minAxis === current.minAxis && s.minTotal === current.minTotal) || null;
  return { n: pairs.length, missing, perAxis, totals, verdict, current: currentRow, best: rankable.slice(0, 5), humanPassRate: pairs.length ? humanPass.filter(Boolean).length / pairs.length : null };
}
