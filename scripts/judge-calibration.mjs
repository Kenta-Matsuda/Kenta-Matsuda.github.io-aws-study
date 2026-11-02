#!/usr/bin/env node
/**
 * judge-calibration.mjs — Judge の較正（issue #241 / #225 設計書 §8.2）。
 *
 * 人間が採点した約 30 問と Judge のスコアを突き合わせ、軸ごとの一致度と
 * 合格閾値（全軸 ≥ PASS_MIN_AXIS かつ合計 ≥ PASS_MIN_TOTAL）の妥当性を出す。
 * このスクリプトは結果を捏造しない: 人間の採点表が空なら何も計算しない。
 *
 * 手順（詳細は docs/design/exam-generation-pipeline.md §8.5）:
 *   1) 素材を作る（実キーが必要。人間が実行）:
 *        GEMINI_API_KEY=... node scripts/eval-exam-pipeline.mjs --exam aib-c01 --count 20 --out <dir>/aib.json
 *        GEMINI_API_KEY=... node scripts/eval-exam-pipeline.mjs --exam saa-c03 --count 20 --out <dir>/saa.json
 *   2) 30 問を層化抽出し、人間用の問題冊子と空の採点表を作る（API 不要）:
 *        node scripts/judge-calibration.mjs sample --from <dir>/aib.json,<dir>/saa.json --n 30 --seed 1 --out <dir>/calib
 *      → <dir>/calib/items.md（Judge のスコアは載せない）/ human-scores.csv（空欄）/ judge-scores.json / sample.json
 *   2') 素材に Judge のスコアが無い場合（--no-judge で作った等）だけ、Judge を当て直す（実キーが必要）:
 *        GEMINI_API_KEY=... node scripts/judge-calibration.mjs judge --dir <dir>/calib
 *   3) 人間が items.md を読み、human-scores.csv の各行に 1〜5 と verdict（pass|fix|reject）を記入する。
 *   4) 一致度を計算する（API 不要）:
 *        node scripts/judge-calibration.mjs agree --dir <dir>/calib [--out <dir>/calib/agreement.json]
 *
 * 出力物（採点表・結果）は API キーを含まないが、生成問題を含むため既定ではリポジトリ外に置く。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import {
  AXES, HUMAN_COLUMNS, stratifiedSample, toCsv, parseCsv, normalizeHumanRows, computeAgreement,
} from './lib/judge-calibration-stats.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [cmd, ...rest] = process.argv.slice(2);
const opt = (name, dflt) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : dflt; };

function usage(code = 2) {
  console.error('usage: node scripts/judge-calibration.mjs <sample|judge|agree> [options]  (see the header comment)');
  process.exit(code);
}

const stripLabel = (s) => String(s ?? '').replace(/^\s*[A-Da-d][.)、．]\s*/, '').trim();

function loadEvalItems(files) {
  const items = [];
  for (const f of files) {
    const data = JSON.parse(readFileSync(f, 'utf8'));
    const qs = Array.isArray(data) ? data : data.questions;
    if (!Array.isArray(qs)) throw new Error(`${f}: no "questions" array (expected the --out file of eval-exam-pipeline.mjs)`);
    qs.forEach((q, i) => items.push({ ...q, examId: q.examId || data.examId || null, level: data.level || null, source: `${path.basename(f)}#${i + 1}` }));
  }
  return items;
}

function renderItemsMarkdown(sample) {
  const lines = [
    '# Judge 較正用 問題冊子',
    '',
    '各問を読み、`human-scores.csv` の同じ id の行に 5 軸（1=悪い〜5=優れている）と verdict を記入してください。',
    'Judge のスコアはこの冊子にも CSV にも載せていません（先入観を避けるため）。',
    '',
    '| 軸 | 見るもの |',
    '|---|---|',
    '| accuracy | AWS 公式の事実と矛盾せず、正解キーが実際に正しい |',
    '| uniqueness | 正解が 1 つに決まり、他の選択肢を正解だと主張できない |',
    '| distractors | 誤答がもっともらしく、かつ明確に誤り（実際の誤解・不採用案に基づく） |',
    '| fit | 指定の出題単位・試験レベルに合っている |',
    '| cues | 手がかり漏れがない（正解だけ長い・極端語・文法の不一致がない） |',
    '',
    'verdict: `pass`（そのまま出題してよい）/ `fix`（直せば使える）/ `reject`（正解が誤り・修復不能）。',
    '',
  ];
  for (const it of sample) {
    lines.push(`## ${it.id}`, '');
    lines.push(`- 試験: ${it.examId || '-'} / タスク: ${it.taskId || '-'} / 出題単位: ${it.unitId || '-'}`, '');
    lines.push(String(it.question || '').trim(), '');
    (it.choices || []).forEach((c, i) => lines.push(`${'ABCD'[i]}. ${stripLabel(c)}`));
    lines.push('', `**正解: ${'ABCD'[it.correctIndex] || '?'}**`, '');
    lines.push('<details><summary>解説</summary>', '', String(it.explanation || '').trim(), '', '</details>', '');
  }
  return lines.join('\n');
}

async function cmdSample() {
  const from = String(opt('from', '')).split(',').map((s) => s.trim()).filter(Boolean);
  const out = opt('out', null);
  if (!from.length || !out) usage();
  const n = Number(opt('n', 30));
  const seed = Number(opt('seed', 1));
  const items = loadEvalItems(from);
  if (!items.length) { console.error('no items in the input files'); process.exit(1); }
  const picked = stratifiedSample(items, { n, seed }).map((it, i) => ({ ...it, id: `C${String(i + 1).padStart(2, '0')}` }));
  mkdirSync(out, { recursive: true });
  writeFileSync(path.join(out, 'sample.json'), JSON.stringify({ createdAt: new Date().toISOString(), seed, from: from.map((f) => path.basename(f)), items: picked }, null, 2), 'utf8');
  writeFileSync(path.join(out, 'items.md'), renderItemsMarkdown(picked), 'utf8');
  const csvPath = path.join(out, 'human-scores.csv');
  if (existsSync(csvPath)) console.warn(`kept existing ${csvPath} (delete it to regenerate an empty sheet)`);
  else writeFileSync(csvPath, toCsv(picked.map((it) => ({ id: it.id })), HUMAN_COLUMNS), 'utf8');
  // Items the Editor repaired carry the scores of the PRE-edit text: those must be
  // re-judged (`judge` subcommand), never compared against the edited item.
  const judge = Object.fromEntries(picked.map((it) => [it.id, it.judge?.scores && !it.judge.fixed ? { scores: it.judge.scores, verdict: verdictOf(it.judge), outcome: it.judge.outcome || null, score: it.judge.score ?? null } : null]));
  writeFileSync(path.join(out, 'judge-scores.json'), JSON.stringify(judge, null, 2), 'utf8');
  const strata = picked.reduce((m, it) => { const k = it.judge?.outcome || 'unjudged'; m[k] = (m[k] || 0) + 1; return m; }, {});
  const unscored = Object.values(judge).filter((v) => !v).length;
  console.log(`sampled ${picked.length} of ${items.length} items (seed ${seed}) by judge outcome: ${JSON.stringify(strata)}`);
  console.log(`wrote ${out}/items.md, human-scores.csv, judge-scores.json, sample.json`);
  if (unscored) console.log(`${unscored} item(s) have no Judge scores: run \`node scripts/judge-calibration.mjs judge --dir ${out}\` with GEMINI_API_KEY before "agree".`);
}

// Judge outcome → the rubric verdict the human also gives. The generator stores
// the combined outcome (pass / fix / reject / unjudged), which is what ships.
function verdictOf(judge) {
  if (!judge) return null;
  if (['pass', 'fix', 'reject'].includes(judge.verdict)) return judge.verdict;
  return ['pass', 'fix', 'reject'].includes(judge.outcome) ? judge.outcome : null;
}

async function cmdJudge() {
  const dir = opt('dir', null);
  if (!dir) usage();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error('GEMINI_API_KEY が未設定です。環境変数で渡してください。'); process.exit(2); }
  const locale = opt('locale', 'ja');
  const store = new Map([['gemini_api_key', apiKey], ['ai_provider', 'gemini'], ['asn_locale', locale]]);
  globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  globalThis.document = { documentElement: { lang: '' }, querySelectorAll: () => [] };
  Object.defineProperty(globalThis, 'navigator', { value: { language: locale }, configurable: true });
  const mod = (p) => import(pathToFileURL(path.join(root, p)).href);
  const { initI18n } = await mod('js/i18n.js');
  initI18n({ ja: {}, en: {} }, {});
  const J = await mod('js/examJudge.js');
  const { callGemini } = await mod('js/gemini.js');

  const sample = JSON.parse(readFileSync(path.join(dir, 'sample.json'), 'utf8'));
  const judgePath = path.join(dir, 'judge-scores.json');
  const judge = existsSync(judgePath) ? JSON.parse(readFileSync(judgePath, 'utf8')) : {};
  const force = rest.includes('--force');
  let done = 0;
  for (const it of sample.items) {
    if (judge[it.id] && !force) continue;
    const q = { question: it.question, choices: it.choices, correctIndex: it.correctIndex, explanation: it.explanation };
    const solver = J.parseSolverResponse(await callGemini({ ...J.buildSolverPrompt(q), onRequireApiKey: () => {} }));
    const res = J.parseJudgeResponse(await callGemini({ ...J.buildJudgePrompt({ question: q, level: it.level || '', solver: { letter: solver.letter } }), onRequireApiKey: () => {} }));
    if (!res) { console.warn(`${it.id}: judge response not parseable; skipped`); continue; }
    const v = J.decideVerdict({ flags: J.runDeterministicChecks(q), judge: res, solverLetter: solver.letter, correctLetter: 'ABCD'[q.correctIndex] });
    judge[it.id] = { scores: res.scores, verdict: res.verdict, outcome: v.outcome, score: res.total };
    done++;
    process.stdout.write('j');
  }
  writeFileSync(judgePath, JSON.stringify(judge, null, 2), 'utf8');
  console.log(`\njudged ${done} item(s); wrote ${judgePath}`);
}

function pct(x) { return x === null || x === undefined ? '-' : `${(x * 100).toFixed(0)}%`; }
function num(x) { return x === null || x === undefined ? '-' : x.toFixed(2); }

async function cmdAgree() {
  const dir = opt('dir', null);
  const humanPath = opt('human', dir ? path.join(dir, 'human-scores.csv') : null);
  const judgePath = opt('judge', dir ? path.join(dir, 'judge-scores.json') : null);
  if (!humanPath || !judgePath) usage();
  const { rows, problems, skipped } = normalizeHumanRows(parseCsv(readFileSync(humanPath, 'utf8')));
  for (const p of problems) console.error(`INVALID: ${p}`);
  if (problems.length) process.exit(1);
  if (!rows.length) {
    console.error(`no human scores yet in ${humanPath} (${skipped} empty row(s)). Fill it in first — nothing is computed from an empty sheet.`);
    process.exit(1);
  }
  const judge = JSON.parse(readFileSync(judgePath, 'utf8'));
  const { PASS_MIN_AXIS, PASS_MIN_TOTAL } = await import(pathToFileURL(path.join(root, 'js', 'examJudge.js')).href).catch(() => ({ PASS_MIN_AXIS: 3, PASS_MIN_TOTAL: 18 }));
  const current = { minAxis: PASS_MIN_AXIS, minTotal: PASS_MIN_TOTAL };
  const res = computeAgreement(rows, judge, { current });

  console.log(`items: ${res.n} paired (${skipped} unrated, ${res.missing.length} without Judge scores${res.missing.length ? `: ${res.missing.join(', ')}` : ''})`);
  if (res.n < 20) console.warn(`warning: only ${res.n} paired items — agreement statistics are unstable below ~20–30.`);
  console.log('--- per axis (Judge vs human) ---');
  console.log('axis         exact  ±1     kappaQW  spearman  bias(J-H)');
  for (const a of AXES) {
    const r = res.perAxis[a];
    console.log(`${a.padEnd(12)} ${pct(r.exact).padEnd(6)} ${pct(r.within1).padEnd(6)} ${num(r.kappaQW).padEnd(8)} ${num(r.spearman).padEnd(9)} ${num(r.meanBias)}`);
  }
  console.log(`total score spearman: ${num(res.totals.spearman)}`);
  console.log(`verdict exact agreement: ${pct(res.verdict.exact)} (n=${res.verdict.n})  confusion human→judge: ${JSON.stringify(res.verdict.confusion)}`);
  console.log(`human pass rate: ${pct(res.humanPassRate)}`);
  const row = (s) => `minAxis ${s.minAxis} minTotal ${s.minTotal}: agreement ${pct(s.agreement)} kappa ${num(s.kappa)} passPrecision ${pct(s.passPrecision)} passRecall ${pct(s.passRecall)}`;
  console.log('--- pass threshold (score-based Judge pass vs human verdict === pass) ---');
  console.log(`current  ${res.current ? row(res.current) : '-'}`);
  res.best.forEach((s, i) => console.log(`best #${i + 1}  ${row(s)}`));
  console.log('Guide: kappaQW ≥ 0.6 per axis is substantial agreement; change PASS_MIN_* in js/examJudge.js only if a candidate beats the current pair clearly and keeps passPrecision high.');

  const out = opt('out', null);
  if (out) { writeFileSync(out, JSON.stringify({ computedAt: new Date().toISOString(), current, ...res }, null, 2), 'utf8'); console.log(`wrote ${out}`); }
}

if (cmd === 'sample') await cmdSample();
else if (cmd === 'judge') await cmdJudge();
else if (cmd === 'agree') await cmdAgree();
else usage(cmd ? 2 : 0);
