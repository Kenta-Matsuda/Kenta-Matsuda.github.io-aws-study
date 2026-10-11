#!/usr/bin/env node
/*
 * scripts/export-feedback.mjs
 *
 * フィードバック収集テーブル（infra/feedback, issue #162 / #167）を CSV に書き出す。
 * 出力した CSV は表計算ソフトや Amazon Quick（Free プランのチャットにファイルを
 * 渡して分析させる等）でそのまま扱える。DynamoDB の読み取りは AWS CLI に任せる
 * （このリポジトリには AWS SDK を依存として入れていないため）。
 *
 * 実行: node scripts/export-feedback.mjs [--table <名前>] [--out <ディレクトリ>] [--profile <名前>]
 *   --table 省略時は CloudFormation スタック aws-study-feedback の出力 TableName を使う。
 *   出力: <out>/feedback.csv（自由記述）, <out>/votes.csv（Good/Bad）, <out>/vote-summary.csv（対象ごとの集計）
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

// DynamoDB JSON ({ S: 'x' } / { N: '1' }) -> plain values.
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
  // BOM so Excel opens UTF-8 (Japanese) correctly.
  return `﻿${[columns.join(','), ...rows.map((r) => columns.map((c) => esc(r[c])).join(','))].join('\r\n')}\r\n`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const table = args.table || resolveTableName(args.profile);

  // The CLI paginates the scan itself and returns every item.
  const items = aws(['dynamodb', 'scan', '--table-name', table], args.profile).Items.map(unmarshal);

  const feedback = items
    .filter((i) => i.type === 'feedback')
    .map((i) => ({ ...i, submitted_at: String(i.sk).split('#')[0] }))
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));

  const votes = items
    .filter((i) => i.type === 'vote')
    .map((i) => ({ ...i, voted_at: String(i.sk).split('#')[0] }))
    .sort((a, b) => a.voted_at.localeCompare(b.voted_at));

  // Net score per target: a "set" adds the vote, a "clear" withdraws it.
  const summary = new Map();
  for (const v of votes) {
    const key = `${v.target_type}|${v.target_id}`;
    const row = summary.get(key) || {
      target_type: v.target_type,
      target_id: v.target_id,
      exam_id: v.exam_id,
      title: v.resource_title || v.ai_task_title || v.ai_term || '',
      url: v.resource_url || '',
      good: 0,
      bad: 0,
    };
    row[v.value] += v.action === 'clear' ? -1 : 1;
    summary.set(key, row);
  }
  const summaryRows = [...summary.values()]
    .map((r) => ({ ...r, total: r.good + r.bad, good_ratio: r.good + r.bad > 0 ? (r.good / (r.good + r.bad)).toFixed(2) : '' }))
    .sort((a, b) => b.total - a.total);

  mkdirSync(args.out, { recursive: true });
  writeFileSync(join(args.out, 'feedback.csv'), toCsv(feedback, ['submitted_at', 'category', 'text', 'lang', 'page', 'issue_number', 'issue_url']));
  writeFileSync(join(args.out, 'votes.csv'), toCsv(votes, [
    'voted_at', 'target_type', 'target_id', 'action', 'value', 'exam_id', 'domain_id', 'task_id', 'task_title',
    'ai_kind', 'ai_term', 'ai_task_id', 'ai_task_title', 'resource_section', 'resource_title', 'resource_url',
  ]));
  writeFileSync(join(args.out, 'vote-summary.csv'), toCsv(summaryRows, ['target_type', 'target_id', 'exam_id', 'title', 'url', 'good', 'bad', 'total', 'good_ratio']));

  console.log(`table: ${table}`);
  console.log(`feedback: ${feedback.length} rows, votes: ${votes.length} events, targets: ${summaryRows.length}`);
  console.log(`written to ${args.out}/`);
}

main();
