#!/usr/bin/env node
/*
 * tests/issue-triage-redundant-skip.test.mjs
 *
 * scripts/issue-triage.mjs の重複スキップコメント検知（computeRedundantSkipSignal）
 * に対する純ロジックのアサーション。ブラウザや外部ネットワークを必要としないため、
 * INTEGRATIONS_ONLY のサンドボックスでも `node` で直接実行できる。
 *
 * 実行: env -u NODE_OPTIONS node tests/issue-triage-redundant-skip.test.mjs
 *
 * 目的（issue #32）: SKIP 判定の issue に対して既存の `🤖 agent:skipped` コメントを
 * 数え上げ、再コメント不要の助言（reSkipAdvice）が出ることを保証する。この検知が
 * 失われる（例: skip 接頭辞ではなく isAgentMarker を数える、SKIP 以外でも助言を出す）
 * とアサーションが落ちる。
 */

import assert from 'node:assert/strict';
import { computeRedundantSkipSignal, isSkipMarker } from '../scripts/issue-triage.mjs';

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  process.stdout.write(`ok - ${name}\n`);
};

// 合成コメント配列: normalizeComment 相当の最小形（isSkipMarker のみ利用）。
const skip = (n) => Array.from({ length: n }, () => ({ isSkipMarker: true }));
const human = (n) => Array.from({ length: n }, () => ({ isSkipMarker: false }));

check('SKIP 判定では skip 接頭辞のコメント件数を数え、助言を出す', () => {
  const comments = [...skip(2), ...human(3)];
  // 第3引数は hasSkipLabel（ラベル有無）。
  const { agentSkipCommentCount, reSkipAdvice } = computeRedundantSkipSignal(comments, 'SKIP', true);
  assert.equal(agentSkipCommentCount, 2, '既存スキップコメントは 2 件');
  assert.ok(reSkipAdvice, 'SKIP では reSkipAdvice が設定される');
  assert.match(reSkipAdvice, /再コメント禁止/, '再コメント禁止の助言を含む');
  assert.match(reSkipAdvice, /2 件/, '件数を助言に含める');
  assert.match(reSkipAdvice, /スキップラベル: あり/, 'ラベル有無を件数とは別に述べる');
});

check('対応済み（done）マーカーは skip 件数に数えない', () => {
  // isSkipMarker=false の done コメントが混ざっても skip 件数は増えない。
  const comments = [{ isSkipMarker: true }, { isSkipMarker: false }, { isSkipMarker: false }];
  const { agentSkipCommentCount } = computeRedundantSkipSignal(comments, 'SKIP', true);
  assert.equal(agentSkipCommentCount, 1, 'skip 接頭辞のみを 1 件として数える');
});

check('SKIP 以外の判定では reSkipAdvice を出さない', () => {
  for (const verdict of ['RECHECK', 'TRIAGE', 'OPEN_PR', 'PR_FOLLOWUP']) {
    const { reSkipAdvice, agentSkipCommentCount } = computeRedundantSkipSignal(skip(2), verdict, true);
    assert.equal(reSkipAdvice, null, `${verdict} では reSkipAdvice は null`);
    assert.equal(agentSkipCommentCount, 2, `${verdict} でも件数自体は数える`);
  }
});

check('コメントが無い場合は 0 件・ラベル無しを別々に述べ、齟齬を生まない', () => {
  const { agentSkipCommentCount, reSkipAdvice } = computeRedundantSkipSignal([], 'SKIP', false);
  assert.equal(agentSkipCommentCount, 0);
  assert.match(reSkipAdvice, /0 件/, '件数 0 を明示する');
  assert.match(reSkipAdvice, /スキップラベル: なし/, 'ラベル無しを明示する');
  // 齟齬防止: 件数 0 件のときに「マーカーあり」等と矛盾する表現を出さない。
  assert.doesNotMatch(
    reSkipAdvice,
    /マーカーあり/,
    '0 件なのに「マーカーあり」と述べる矛盾した文面を出さない',
  );
});

check('件数 0 かつラベルありでも「0 件 + マーカーあり」の齟齬を生まない', () => {
  // 旧実装では hasSkipLabel 由来の alreadySkipMarked が真だと
  // 「既存スキップコメント 0 件 / ラベル・マーカーあり」と件数と矛盾しえた。
  const { agentSkipCommentCount, reSkipAdvice } = computeRedundantSkipSignal([], 'SKIP', true);
  assert.equal(agentSkipCommentCount, 0);
  assert.match(reSkipAdvice, /0 件/, '件数 0 を明示する');
  assert.match(reSkipAdvice, /スキップラベル: あり/, 'ラベルありを件数とは別に述べる');
  assert.doesNotMatch(
    reSkipAdvice,
    /マーカーあり/,
    '件数と矛盾する「マーカーあり」の表現を出さない',
  );
});

check('isSkipMarker は skip 接頭辞のみ真、done 接頭辞は偽', () => {
  assert.equal(isSkipMarker('🤖 agent:skipped — バックエンドが必要'), true);
  assert.equal(isSkipMarker('  🤖 agent:skipped 前置き空白あり'), true);
  assert.equal(isSkipMarker('🤖 対応済み'), false);
  assert.equal(isSkipMarker('通常の人間コメント'), false);
});

process.stdout.write(`\n1..${passed}\nall ${passed} assertions passed\n`);
