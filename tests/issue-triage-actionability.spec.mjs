import assert from 'node:assert/strict';
import { computeActionability } from '../scripts/issue-triage.mjs';

// 純ロジック spec（ブラウザ不要）。scripts/issue-triage.mjs の computeActionability()
// が「今回、新規に着手すべきものがあるか」を決定論的に集計することを検証する。
//
// この環境（INTEGRATIONS_ONLY）では Playwright（npx playwright test）は
// ブラウザ / npm を取得できず走らないため、@playwright/test には依存せず
// `env -u NODE_OPTIONS node tests/issue-triage-actionability.spec.mjs` で
// 直接実行できる自走式の tiny ランナーにしている（tests/quiz-csv.spec.mjs と
// 同じ「モジュールを直接 import して node:assert で検証する」純ロジックの型）。

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// 判定値だけを持つ最小のフェイク結果 / 監査エントリ。
const issue = (verdict) => ({ verdict });
const pr = (verdict) => ({ verdict });

test('全クリア（OPEN_PR + SKIP の issue と PR_OK の監査のみ）は total=0', () => {
  const a = computeActionability(
    [issue('OPEN_PR'), issue('OPEN_PR'), issue('SKIP'), issue('SKIP'), issue('SKIP')],
    [pr('PR_OK'), pr('PR_OK'), pr('PR_OK')],
  );
  assert.equal(a.total, 0);
  assert.equal(a.actionableIssues, 0);
  assert.equal(a.actionablePrs, 0);
});

test('TRIAGE の issue は着手対象として数える', () => {
  const a = computeActionability([issue('TRIAGE'), issue('OPEN_PR'), issue('SKIP')], [pr('PR_OK')]);
  assert.equal(a.actionableIssues, 1);
  assert.equal(a.issueBreakdown.TRIAGE, 1);
  assert.equal(a.total, 1);
});

test('PR_CONFLICT の監査エントリは着手対象として数える', () => {
  const a = computeActionability([issue('OPEN_PR')], [pr('PR_CONFLICT'), pr('PR_OK')]);
  assert.equal(a.actionablePrs, 1);
  assert.equal(a.prBreakdown.PR_CONFLICT, 1);
  assert.equal(a.total, 1);
});

test('PR_FOLLOWUP は issue 側・PR 監査側の両方で数える', () => {
  const a = computeActionability([issue('PR_FOLLOWUP'), issue('SKIP')], [pr('PR_FOLLOWUP'), pr('PR_OK')]);
  assert.equal(a.issueBreakdown.PR_FOLLOWUP, 1);
  assert.equal(a.prBreakdown.PR_FOLLOWUP, 1);
  assert.equal(a.actionableIssues, 1);
  assert.equal(a.actionablePrs, 1);
  assert.equal(a.total, 2);
});

test('RECHECK / PR_BEHIND / PR_UNKNOWN も着手対象として数える', () => {
  const a = computeActionability(
    [issue('RECHECK')],
    [pr('PR_BEHIND'), pr('PR_UNKNOWN')],
  );
  assert.equal(a.issueBreakdown.RECHECK, 1);
  assert.equal(a.prBreakdown.PR_BEHIND, 1);
  assert.equal(a.prBreakdown.PR_UNKNOWN, 1);
  assert.equal(a.actionableIssues, 1);
  assert.equal(a.actionablePrs, 2);
  assert.equal(a.total, 3);
});

test('OPEN_PR / SKIP / PR_OK は決して着手対象に数えない', () => {
  const a = computeActionability(
    [issue('OPEN_PR'), issue('SKIP')],
    [pr('PR_OK'), pr('PR_OK')],
  );
  assert.equal(a.total, 0);
  // 内訳にも着手対象カテゴリは現れない。
  assert.equal(a.issueBreakdown.PR_FOLLOWUP, 0);
  assert.equal(a.issueBreakdown.RECHECK, 0);
  assert.equal(a.issueBreakdown.TRIAGE, 0);
  assert.equal(a.prBreakdown.PR_CONFLICT, 0);
});

test('空配列・非配列入力でも total=0 を返す（防御的）', () => {
  assert.equal(computeActionability([], []).total, 0);
  assert.equal(computeActionability(undefined, undefined).total, 0);
});

// tiny ランナー: 全 test を順に実行し、1 件でも落ちれば非ゼロ終了する。
let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    process.stdout.write(`ok - ${name}\n`);
  } catch (err) {
    failed += 1;
    process.stdout.write(`not ok - ${name}\n  ${err && err.message ? err.message : err}\n`);
  }
}
process.stdout.write(`\n1..${tests.length} (${tests.length - failed} passed / ${failed} failed)\n`);
if (failed > 0) process.exitCode = 1;
