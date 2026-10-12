#!/usr/bin/env node
/**
 * check-card-coverage.mjs — カード在庫（js/data/cards/<exam>.js）が各試験の
 * 出題数を賄えるかを検査する（読み取り専用）。issue #225 設計書 §4。
 *
 * 判定: 出題単位（判断ポイント / セル / 概念）の数 ≥ 問題数 × 1.5、かつ全タスクに
 * 1 件以上の単位が紐づく。足りない試験はパイプラインがタスクステートメントへ
 * フォールバックするため「失敗」ではなく「要整備」として表示する。
 *
 * 使い方:
 *   node scripts/check-card-coverage.mjs            # 全試験
 *   node scripts/check-card-coverage.mjs --only saa-c03
 *   node scripts/check-card-coverage.mjs --strict   # 不足があれば exit 1（CI 用）
 */
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { validateCards, coverageReport } from '../js/cards.js';
import { EXAM_MOCK_CONFIG } from '../js/quiz.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const strict = args.includes('--strict');

const dataDir = path.join(root, 'js', 'data');
const cardsDir = path.join(dataDir, 'cards');
const examFiles = readdirSync(dataDir).filter((f) => /^[a-z]{3}-c0\d\.js$/.test(f));

let insufficient = 0;
let invalid = 0;
for (const file of examFiles.sort()) {
  const examId = file.replace(/\.js$/, '');
  if (only && examId !== only) continue;
  const mod = await import(pathToFileURL(path.join(dataDir, file)).href);
  const exam = Object.values(mod).find((v) => v && v.domains);
  if (!exam) continue;
  const taskIds = exam.domains.flatMap((d) => (d.tasks || []).map((t) => String(t.id)));
  const questionCount = EXAM_MOCK_CONFIG[examId]?.questionCount || 65;

  const cardFile = path.join(cardsDir, `${examId}.js`);
  if (!existsSync(cardFile)) {
    console.log(`${examId.padEnd(8)} cards: (none)        units 0 / required ${Math.ceil(questionCount * 1.5)}  → fallback to task statements`);
    insufficient++;
    continue;
  }
  const cardMod = await import(pathToFileURL(cardFile).href);
  const cardData = Object.values(cardMod).find((v) => v && (Array.isArray(v) || Array.isArray(v.cards)));
  const problems = validateCards(cardData, { taskIds });
  const report = coverageReport(cardData, { questionCount, taskIds });
  const kinds = Object.entries(report.byKind).map(([k, n]) => `${k}=${n}`).join(',') || '-';
  const status = report.sufficient ? 'OK' : '要整備';
  console.log(`${examId.padEnd(8)} cards: ${kinds.padEnd(14)} units ${String(report.units).padStart(3)} / required ${report.required}  tasks ${report.tasksCovered}/${report.tasksTotal}  ${status}`);
  if (report.uncoveredTasks.length) console.log(`         uncovered tasks: ${report.uncoveredTasks.join(', ')}`);
  for (const p of problems) console.log(`         INVALID: ${p}`);
  if (problems.length) invalid++;
  if (!report.sufficient) insufficient++;
}

if (invalid) {
  console.error(`\n${invalid} card file(s) have schema problems.`);
  process.exit(1);
}
if (strict && insufficient) {
  console.error(`\n${insufficient} exam(s) below the coverage requirement.`);
  process.exit(1);
}
