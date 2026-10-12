#!/usr/bin/env node
/**
 * eval-exam-pipeline.mjs — 問題生成パイプラインの回帰評価（issue #225 設計書 §8.4）。
 *
 * 実際の Gemini API で 1 セット生成し、多様性（正解のクラスタ）・項目網羅率・
 * 査読通過率・再生成回数・呼び出し回数を出力する。プロンプト・モデル・カードを
 * 変えたら必ず回し、数字で比較する。
 *
 * 使い方（API キーは環境変数で渡す。リポジトリには一切書かない）:
 *   GEMINI_API_KEY=... node scripts/eval-exam-pipeline.mjs --exam aib-c01 --count 20
 *   GEMINI_API_KEY=... node scripts/eval-exam-pipeline.mjs --exam saa-c03 --count 65 --mode mock --out /tmp/saa.json
 *   オプション: --no-judge（査読段を省略） --locale en
 *   モデルは js/config.js の GEMINI_MODEL_CANDIDATES を順に試す（アプリと同じ）。
 *
 * 目標（設計書 §8.4）: 最大クラスタ ≤ 2、出題単位の網羅率 ≥ 90%、査読通過率 ≥ 85%。
 */
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const examId = opt('exam', 'aib-c01');
const count = Number(opt('count', 20));
const mode = opt('mode', 'speed');
const locale = opt('locale', 'ja');
const outFile = opt('out', null);
const judgeEnabled = !args.includes('--no-judge');
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY が未設定です。環境変数で渡してください。');
  process.exit(2);
}

// Browser globals the app modules touch (only inside functions).
const store = new Map([['gemini_api_key', apiKey], ['ai_provider', 'gemini'], ['asn_locale', locale]]);
globalThis.localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.document = { documentElement: { lang: '' }, querySelectorAll: () => [] };
Object.defineProperty(globalThis, 'navigator', { value: { language: locale }, configurable: true });

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mod = (p) => import(pathToFileURL(path.join(root, p)).href);
const { initI18n, getLocalizedUrl } = await mod('js/i18n.js');
initI18n({ ja: {}, en: {} }, {});
const quiz = await mod('js/quiz.js');
const { generateExamQuestions } = await mod('js/examGenerator.js');
const { listUnits, indexUnitsByTask, coverageReport } = await mod('js/cards.js');
const gemini = await mod('js/gemini.js');

const examMod = await mod(`js/data/${examId}.js`);
const exam = Object.values(examMod).find((v) => v && v.domains);
if (!exam) { console.error(`試験データが見つかりません: ${examId}`); process.exit(2); }
const level = quiz.getExamLevel(examId);
let unitsByTask = null;
let cardInfo = 'なし';
if (existsSync(path.join(root, 'js', 'data', 'cards', `${examId}.js`))) {
  const cardMod = await mod(`js/data/cards/${examId}.js`);
  const data = Object.values(cardMod).find((v) => v && (Array.isArray(v) || Array.isArray(v.cards)));
  const units = listUnits(data);
  unitsByTask = indexUnitsByTask(units);
  const taskIds = exam.domains.flatMap((d) => d.tasks.map((t) => String(t.id)));
  const rep = coverageReport(data, { questionCount: count, taskIds });
  cardInfo = `${units.length} units, tasks ${rep.tasksCovered}/${rep.tasksTotal}`;
}

const systemPrompt = mode === 'mock'
  ? quiz.buildMockQuizSystemPrompt(exam.code, exam.shortLabel, level)
  : mode === 'speed'
    ? quiz.buildSpeedQuizSystemPrompt(exam.code, exam.shortLabel)
    : quiz.buildQuizSystemPrompt(exam.code, exam.shortLabel);

const resourcesFor = (slot, occurrence) => {
  if (!slot.task) return [];
  const en = locale === 'en';
  return quiz.selectTaskResources(slot.task, occurrence).map((item) => ({
    title: en ? (item.titleEn || item.title) : (item.title || item.titleEn),
    url: getLocalizedUrl(item.url, item.urlEn),
    note: en ? (item.noteEn || item.note || '') : (item.note || item.noteEn || ''),
  }));
};

let tokensIn = 0;
const callModel = async ({ systemPrompt: sp, userPrompt, kind }) => {
  tokensIn += Math.round((sp.length + userPrompt.length) / 3); // rough: chars/3
  const text = await gemini.callGemini({ userPrompt, systemPrompt: sp, onRequireApiKey: () => {} });
  process.stdout.write(kind[0]);
  return text;
};

console.log(`exam=${exam.code} count=${count} mode=${mode} level=${level} locale=${locale} judge=${judgeEnabled} cards=${cardInfo}`);
const started = Date.now();
const result = await generateExamQuestions({
  exam, count, level, unitsByTask, systemPrompt,
  baseUserPrompt: (slot) => quiz.buildGeneralQuizUserPrompt(exam.code, slot.domain, slot.task),
  resourcesFor, callModel,
  judge: { enabled: judgeEnabled, dropRejected: false },
  hooks: { onProgress: ({ stage, done, total }) => { if (stage === 'planning') process.stdout.write('[plan]'); } },
});
console.log('');

const m = result.metrics;
const unitsPlanned = new Set(result.blueprint.map((s) => s.unit?.id || s.item)).size;
const unitsCovered = new Set(result.questions.map((q) => q.unitId)).size;
const coverage = unitsPlanned ? unitsCovered / unitsPlanned : 0;
const passRate = m.judged ? m.passed / m.judged : null;
const elapsedSec = Math.round((Date.now() - started) / 1000);

const verdict = (ok) => (ok ? 'OK' : 'NG');
console.log('--- metrics ---');
console.log(`generated ${m.generated}/${m.requested}  errors ${m.errors}  parseFailures ${m.parseFailures}  duplicatesRegenerated ${m.duplicatesRegenerated}  rejected ${m.rejected}  fixed ${m.fixed}`);
console.log(`plan: ${m.planFailed ? 'FAILED (blueprint only)' : `ok, ${m.planDuplicates} duplicate concept(s) dropped`}`);
console.log(`diversity: clusters ${m.clusters}  largestCluster ${m.largestCluster}  (${verdict(m.largestCluster <= 2)} target ≤2)  example: ${m.largestClusterExample}`);
console.log(`coverage: ${unitsCovered}/${unitsPlanned} planned units = ${(coverage * 100).toFixed(0)}%  (${verdict(coverage >= 0.9)} target ≥90%)`);
console.log(`judge: judged ${m.judged} passed ${m.passed} unjudged ${m.unjudged} avgScore ${m.avgJudgeScore}  passRate ${passRate === null ? '-' : `${(passRate * 100).toFixed(0)}%`}  (${passRate === null ? '-' : verdict(passRate >= 0.85)} target ≥85%)`);
console.log(`calls: ${JSON.stringify(m.calls)}  ~input chars/3 ≈ ${tokensIn} tokens  elapsed ${elapsedSec}s`);
console.log('--- answers ---');
result.questions.forEach((q, i) => {
  const ans = String(q.choices?.[q.correctIndex] || '').replace(/^\s*[A-D][.)]\s*/, '');
  console.log(`${String(i + 1).padStart(2)}. [${q.judge?.outcome || '-'}${q.judge?.score ? ` ${q.judge.score}` : ''}] ${ans.slice(0, 80)}`);
});

if (outFile) {
  writeFileSync(outFile, JSON.stringify({ examId, count, mode, level, locale, judgeEnabled, metrics: m, coverage, passRate, elapsedSec, questions: result.questions }, null, 2), 'utf8');
  console.log(`wrote ${outFile}`);
}
