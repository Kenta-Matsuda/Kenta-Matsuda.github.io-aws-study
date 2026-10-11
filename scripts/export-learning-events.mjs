#!/usr/bin/env node
/*
 * scripts/export-learning-events.mjs
 *
 * 問題単位の学習イベント（infra/feedback の POST /events、issue #225 設計書 §9）を
 * DynamoDB から CSV に書き出す。export-feedback.mjs と同じく読み取りは AWS CLI に任せる。
 *
 * 実行: node scripts/export-learning-events.mjs [--table <名前>] [--out <ディレクトリ>] [--profile <名前>]
 *   出力: <out>/learning-events.csv（全イベント）
 *         <out>/unit-summary.csv（試験 × 出題単位ごとの 生成数 / 回答数 / 正答率 / 平均所要時間）
 *   unit-summary は Amazon Quick 等でそのまま可視化できる形（1 行 = 1 出題単位）。
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const STACK_NAME = 'aws-study-feedback';
const REGION = 'ap-northeast-1';

function parseArgs(argv) {
  const args = { out: 'feedback-export' };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i].replace(/^--/, '');
    args[key] = argv[i + 1];
    i += 1;
  }
  return args;
}

function aws(args, profile) {
  const full = [...args, '--region', REGION, '--output', 'json'];
  if (profile) full.push('--profile', profile);
  return JSON.parse(execFileSync('aws', full, { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }));
}

function resolveTableName(profile) {
  const out = aws(['cloudformation', 'describe-stacks', '--stack-name', STACK_NAME], profile);
  const table = out.Stacks?.[0]?.Outputs?.find((o) => o.OutputKey === 'TableName')?.OutputValue;
  if (!table) throw new Error(`TableName output not found on stack ${STACK_NAME}`);
  return table;
}

function unmarshal(item) {
  const obj = {};
  for (const [k, v] of Object.entries(item)) {
    if ('S' in v) obj[k] = v.S;
    else if ('N' in v) obj[k] = Number(v.N);
    else if ('BOOL' in v) obj[k] = v.BOOL;
  }
  return obj;
}

function toCsv(rows, columns) {
  const esc = (v) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.join(',')];
  for (const r of rows) lines.push(columns.map((c) => esc(r[c])).join(','));
  return `﻿${lines.join('\n')}\n`; // BOM so spreadsheets read Japanese correctly
}

// Scan only learning events (pk begins with "event#"), following pagination.
function scanEvents(table, profile) {
  const items = [];
  let startKey = null;
  do {
    const args = ['dynamodb', 'scan', '--table-name', table,
      '--filter-expression', 'begins_with(pk, :p)',
      '--expression-attribute-values', JSON.stringify({ ':p': { S: 'event#' } })];
    if (startKey) args.push('--exclusive-start-key', JSON.stringify(startKey));
    const out = aws(args, profile);
    items.push(...(out.Items || []).map(unmarshal));
    startKey = out.LastEvaluatedKey || null;
  } while (startKey);
  return items;
}

function summarizeByUnit(events) {
  const byUnit = new Map();
  for (const e of events) {
    const unit = e.unitId || e.taskId || '(none)';
    const key = `${e.exam_id}|${unit}`;
    if (!byUnit.has(key)) byUnit.set(key, { exam_id: e.exam_id, unit_id: unit, task_id: e.taskId || '', generated: 0, answered: 0, correct: 0, elapsed_sum: 0, elapsed_n: 0, judge_sum: 0, judge_n: 0 });
    const row = byUnit.get(key);
    if (e.event_type === 'question_generated') {
      row.generated += 1;
      if (Number.isFinite(e.judgeScore)) { row.judge_sum += e.judgeScore; row.judge_n += 1; }
    }
    if (e.event_type === 'question_answered') {
      row.answered += 1;
      if (e.is_correct === true) row.correct += 1;
      if (Number.isFinite(e.elapsedMs)) { row.elapsed_sum += e.elapsedMs; row.elapsed_n += 1; }
    }
  }
  return [...byUnit.values()].map((r) => ({
    exam_id: r.exam_id,
    unit_id: r.unit_id,
    task_id: r.task_id,
    generated: r.generated,
    answered: r.answered,
    correct: r.correct,
    accuracy: r.answered ? (r.correct / r.answered).toFixed(3) : '',
    avg_elapsed_ms: r.elapsed_n ? Math.round(r.elapsed_sum / r.elapsed_n) : '',
    avg_judge_score: r.judge_n ? (r.judge_sum / r.judge_n).toFixed(1) : '',
  })).sort((a, b) => a.exam_id.localeCompare(b.exam_id) || b.answered - a.answered);
}

const args = parseArgs(process.argv.slice(2));
const table = args.table || resolveTableName(args.profile);
const events = scanEvents(table, args.profile);
mkdirSync(args.out, { recursive: true });

const eventColumns = ['received_at', 'event_type', 'exam_id', 'mode', 'setId', 'questionId', 'domainId', 'taskId', 'unitId', 'cardId', 'is_correct', 'userAnswer', 'elapsedMs', 'judgeScore', 'score', 'total', 'value', 'reason', 'schema'];
writeFileSync(join(args.out, 'learning-events.csv'), toCsv(events, eventColumns), 'utf8');
const summary = summarizeByUnit(events);
writeFileSync(join(args.out, 'unit-summary.csv'), toCsv(summary, ['exam_id', 'unit_id', 'task_id', 'generated', 'answered', 'correct', 'accuracy', 'avg_elapsed_ms', 'avg_judge_score']), 'utf8');
console.log(`table=${table} events=${events.length} units=${summary.length} -> ${args.out}/learning-events.csv, ${args.out}/unit-summary.csv`);
