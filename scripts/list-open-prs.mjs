#!/usr/bin/env node
/*
 * scripts/list-open-prs.mjs
 *
 * `github-issue-resolver` エージェント（.kiro/agents/github-issue-resolver.md）の
 * 「レビュー / マージ待ちで滞留しているオープン PR」を俯瞰するための読み取り専用スクリプト。
 *
 * 背景（なぜこれが必要か）:
 *  - クライアント側で完成した PR が `mergeable_state: blocked`（コンフリクトではなく
 *    単独メンテナのレビュー / マージ待ち）のまま滞留しても、その状況を一覧で俯瞰できる
 *    恒久的な成果物が無かった。結果として「完成済みだが誰も気づかない PR」が積み上がり、
 *    新規 issue の実装 PR を重ねると PR 乱立・マージ滞留を悪化させるだけになっていた。
 *  - 既存の `scripts/issue-triage.mjs` はオープン PR 監査を持つが、それは実行時に
 *    要約を吐くトリアージ用途であり、リポジトリに残る索引ではない。
 *  - そこで `scripts/list-action-required.mjs` → `docs/action-required/CHECKLIST.md` と
 *    同じ「スクリプトで機械生成した Markdown 索引」パターンに合わせ、
 *    レビュー待ち PR のキューを `docs/wiki/open-prs-review-queue.md` として恒久化する。
 *
 * 使い方（NODE_OPTIONS が存在しない preload を指す環境では前置きが必要）:
 *   node scripts/list-open-prs.mjs            # レビューキューの要約を標準出力へ
 *   node scripts/list-open-prs.mjs --write     # docs/wiki/open-prs-review-queue.md を再生成
 *   node scripts/list-open-prs.mjs --help
 *   env -u NODE_OPTIONS node scripts/list-open-prs.mjs --write
 *
 * 出力する各 PR の情報:
 *   番号・タイトル・head ブランチ・base・mergeable_state（人間に分かる区分つき）・
 *   紐づく issue（本文の `Closes #N` / `Refs #N` などから抽出、無ければ head ブランチ名
 *   `.../issue-<N>-...` から抽出）。
 *
 * mergeable_state の区分:
 *   clean   = マージ可（レビュー / チェックを満たしマージできる状態）
 *   blocked = レビュー・チェック待ち（コンフリクトではなく、レビュー / 必須チェック待ちで滞留）
 *   behind  = main に遅れ（最新 main の取り込みが必要）
 *   dirty   = コンフリクト（main と衝突。解消が必要）
 *   unstable / has_hooks = チェック進行中 / フックあり
 *   unknown = 判定中（GitHub が計算中。mergeable は null）
 *
 * 副作用:
 *   --write 指定時のみ docs/wiki/open-prs-review-queue.md を上書きする。
 *   それ以外は読み取り専用（ファイルを変更しない）。`gh api` は GET のみを実行し、
 *   ラベル付与・コメント投稿・PR 作成などの書き込み系エンドポイントは呼ばない。
 *   外部依存なし（Node 標準モジュールと gh CLI のみ）。
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const OUT_FILE = join(REPO_ROOT, 'docs', 'wiki', 'open-prs-review-queue.md');

const DEFAULT_REPO = 'Kenta-Matsuda/Kenta-Matsuda.github.io-aws-study';
const PER_PAGE = 100;
const MAX_PAGES = 10;

// ---- 引数パース ---------------------------------------------------------

function parseArgs(argv) {
  const opts = { repo: DEFAULT_REPO, write: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--write') opts.write = true;
    else if (arg === '--repo') opts.repo = argv[++i];
    else throw new Error(`未知のオプション: ${arg}（--help で使い方を表示）`);
  }
  return opts;
}

const USAGE = `使い方: node scripts/list-open-prs.mjs [オプション]

  --repo <owner/repo>   対象リポジトリ（既定: ${DEFAULT_REPO}）
  --write               docs/wiki/open-prs-review-queue.md を再生成する
  --help                このヘルプ

--write 無しなら標準出力にレビューキューの要約を出す（読み取り専用）。
gh api の GET のみを実行し、書き込み操作は行わない。`;

// ---- gh api ラッパ ------------------------------------------------------

/** gh api で単一リソースを取得する。失敗時は null を返す。 */
async function ghGet(path) {
  try {
    const { stdout } = await execFileAsync('gh', ['api', path], {
      maxBuffer: 64 * 1024 * 1024,
    });
    return JSON.parse(stdout);
  } catch (err) {
    process.stderr.write(`[warn] gh api ${path} 失敗: ${shortError(err)}\n`);
    return null;
  }
}

/** 配列を返すエンドポイントを明示的にページングして全件取得する。 */
async function ghGetAll(pathWithoutPage) {
  const out = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const sep = pathWithoutPage.includes('?') ? '&' : '?';
    const path = `${pathWithoutPage}${sep}per_page=${PER_PAGE}&page=${page}`;
    const chunk = await ghGet(path);
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    out.push(...chunk);
    if (chunk.length < PER_PAGE) break;
  }
  return out;
}

function shortError(err) {
  const msg = String(err?.stderr || err?.message || err).trim();
  return msg.split('\n')[0].slice(0, 200);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- 判定ロジック（純ロジック / テスト容易化のため副作用なし） -------------

/**
 * PR に紐づく issue 番号を抽出する。
 * 本文の `Closes #N` / `Fixes #N` / `Resolves #N` / `Refs #N` / `Related to #N` と、
 * head ブランチ名 `<接頭辞>/issue-<N>-...` の両方から集める（重複は除去し昇順）。
 *
 * @param {{body?: string|null, head?: {ref?: string}}} pr
 * @returns {number[]}
 */
function linkedIssues(pr) {
  const nums = new Set();
  const body = pr.body ?? '';
  for (const m of body.matchAll(/(?:closes|fixes|resolves|refs|references|related to)\s+#(\d+)/gi)) {
    nums.add(Number(m[1]));
  }
  const head = pr.head?.ref ?? '';
  const hm = head.match(/^[a-z]+\/issue-(\d+)(?:\b|-)/i);
  if (hm) nums.add(Number(hm[1]));
  return [...nums].filter((n) => Number.isInteger(n) && n > 0).sort((a, b) => a - b);
}

/**
 * mergeable_state を人間に分かる区分ラベルへ対応づける。
 * @param {string|null|undefined} state
 * @returns {string}
 */
function mergeStateLabel(state) {
  switch (state) {
    case 'clean':
      return 'マージ可';
    case 'blocked':
      return 'レビュー・チェック待ち';
    case 'behind':
      return 'main に遅れ';
    case 'dirty':
      return 'コンフリクト';
    case 'unstable':
      return 'チェック進行中 / 一部失敗';
    case 'has_hooks':
      return 'マージ可（フックあり）';
    case 'draft':
      return 'ドラフト';
    case 'unknown':
    default:
      return '判定中';
  }
}

// レビュー待ちで滞留しているものを先頭に、コンフリクトなど別対応が要るものは後ろへ。
const STATE_ORDER = ['blocked', 'clean', 'has_hooks', 'unstable', 'behind', 'dirty', 'unknown'];

function stateRank(state) {
  const i = STATE_ORDER.indexOf(state);
  return i === -1 ? STATE_ORDER.length : i;
}

// ---- 収集 ---------------------------------------------------------------

/**
 * PR 単体 API からマージ可能状態を取得する。
 * 一覧 API には `mergeable` / `mergeable_state` が含まれないため単体で叩く。
 * `mergeable === null`（計算中）は数秒待って再取得する。
 */
async function fetchMergeState(repo, number, { attempts = 3, waitMs = 3000 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const pr = await ghGet(`repos/${repo}/pulls/${number}`);
    if (!pr) return { mergeable: null, mergeableState: 'unknown' };
    if (pr.mergeable !== null || i === attempts - 1) {
      return { mergeable: pr.mergeable, mergeableState: pr.mergeable_state ?? 'unknown' };
    }
    await sleep(waitMs);
  }
  return { mergeable: null, mergeableState: 'unknown' };
}

/** すべてのオープン PR を収集して、索引に必要な情報へ正規化する。 */
async function collectOpenPrs(repo) {
  const openPrs = await ghGetAll(`repos/${repo}/pulls?state=open`);
  const rows = [];
  for (const pr of openPrs) {
    const state = pr.draft ? { mergeable: null, mergeableState: 'draft' } : await fetchMergeState(repo, pr.number);
    rows.push({
      number: pr.number,
      title: pr.title,
      head: pr.head?.ref ?? null,
      base: pr.base?.ref ?? null,
      draft: Boolean(pr.draft),
      mergeableState: state.mergeableState,
      linkedIssues: linkedIssues(pr),
      url: pr.html_url,
    });
  }
  rows.sort(
    (a, b) => stateRank(a.mergeableState) - stateRank(b.mergeableState) || a.number - b.number,
  );
  return rows;
}

// ---- Markdown 生成 ------------------------------------------------------

/**
 * docs/wiki/README.md のページスキーマ（先頭メタデータブロック + 末尾 `## 更新履歴`）に
 * 従って索引 Markdown を組み立てる。GitHub のタスクリスト記法（`- [ ]` / `- [x]`）は
 * 使わず、通常の箇条書きにする（PR 本文でこれを進捗集計されるのを避ける方針に合わせる）。
 */
function buildMarkdown(repo, rows, today) {
  const issuesOf = (r) => (r.linkedIssues.length ? r.linkedIssues.map((n) => `#${n}`).join(' ') : '（紐づく issue なし）');
  const lines = [];
  lines.push('# レビュー待ちオープン PR キュー');
  lines.push('');
  lines.push(`- 最終更新日: ${today}`);
  lines.push(
    '- 対象範囲: `' +
      repo +
      '` のすべてのオープン PR を、マージ可能状態（`mergeable_state`）と紐づく issue とともに一覧化したもの。とくに完成済みだがレビュー / マージ待ちで滞留している PR を俯瞰するための索引',
  );
  lines.push(
    '- 生成元: `scripts/list-open-prs.mjs`（`gh api` の GET のみで各オープン PR の `mergeable_state` を取得）。`node scripts/list-open-prs.mjs --write` で再生成できます。手で編集せず、スクリプトを実行して再生成してください。',
  );
  lines.push('- 出典/参照: `.kiro/agents/github-issue-resolver.md` / `scripts/list-open-prs.mjs` / `docs/wiki/README.md`');
  lines.push('');
  lines.push(
    '> レビュー待ちで滞留しているオープン PR をメンテナが俯瞰できるようにするための機械生成索引です。ページスキーマ（メタデータ + 更新履歴）は [README](README.md) を参照してください。',
  );
  lines.push('');
  lines.push('## mergeable_state の区分');
  lines.push('');
  lines.push('- `clean`（マージ可）: レビュー / チェックを満たしマージできる状態。');
  lines.push('- `blocked`（レビュー・チェック待ち）: コンフリクトではなく、レビュー / 必須チェック待ちで滞留している状態。**このキューの主対象**。');
  lines.push('- `behind`（main に遅れ）: 最新 `main` の取り込み（マージ）が必要。');
  lines.push('- `dirty`（コンフリクト）: `main` と衝突。コンフリクト解消が必要。');
  lines.push('- `unstable` / `has_hooks`: チェック進行中 / 一部失敗、またはフックあり。');
  lines.push('- `unknown`（判定中）: GitHub が計算中（`mergeable` が `null`）。');
  lines.push('');

  const counts = STATE_ORDER.filter((s) => rows.some((r) => r.mergeableState === s)).map(
    (s) => `${s}=${rows.filter((r) => r.mergeableState === s).length}`,
  );
  lines.push(`合計: ${rows.length} 件${counts.length ? ` / 内訳: ${counts.join(' / ')}` : ''}`);
  lines.push('');

  lines.push('## オープン PR 一覧');
  lines.push('');
  if (rows.length === 0) {
    lines.push('- （現在、オープン PR はありません）');
  } else {
    lines.push('| PR | タイトル | head → base | mergeable_state | 紐づく issue |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const r of rows) {
      const title = r.title.replace(/\|/g, '\\|');
      const label = mergeStateLabel(r.mergeableState);
      lines.push(
        `| #${r.number} | ${title} | \`${r.head}\` → \`${r.base}\` | \`${r.mergeableState}\`（${label}） | ${issuesOf(r)} |`,
      );
    }
  }
  lines.push('');

  lines.push('## 更新履歴');
  lines.push('');
  lines.push(`- ${today}: \`scripts/list-open-prs.mjs\` により生成 / 更新。`);
  lines.push('');
  return lines.join('\n');
}

/** 標準出力向けの短い要約（--write 無しのとき）。 */
function buildSummary(repo, rows) {
  const lines = [];
  lines.push(`レビュー待ちオープン PR キュー: ${repo}`);
  lines.push(`- オープン PR 件数: ${rows.length}`);
  const counts = STATE_ORDER.filter((s) => rows.some((r) => r.mergeableState === s)).map(
    (s) => `${s}=${rows.filter((r) => r.mergeableState === s).length}`,
  );
  if (counts.length) lines.push(`- mergeable_state 内訳: ${counts.join(' / ')}`);
  lines.push('');
  for (const r of rows) {
    const issues = r.linkedIssues.length ? r.linkedIssues.map((n) => `#${n}`).join(' ') : '（紐づく issue なし）';
    lines.push(
      `- PR #${r.number} [${r.mergeableState}/${mergeStateLabel(r.mergeableState)}] ${r.title}` +
        ` — ${r.head} → ${r.base} / issue: ${issues}`,
    );
  }
  lines.push('');
  lines.push('索引を再生成するには: node scripts/list-open-prs.mjs --write');
  return lines.join('\n');
}

// ---- メイン -------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  const rows = await collectOpenPrs(opts.repo);
  const today = new Date().toISOString().slice(0, 10);

  if (opts.write) {
    writeFileSync(OUT_FILE, buildMarkdown(opts.repo, rows, today), 'utf8');
    process.stderr.write(`wrote ${OUT_FILE}\n`);
  } else {
    process.stdout.write(`${buildSummary(opts.repo, rows)}\n`);
  }
}

// 直接実行されたときだけ main() を走らせる。import されたときは純ロジックだけを使える。
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    process.stderr.write(`[error] ${err?.stack || err}\n`);
    process.exitCode = 1;
  });
}

export { linkedIssues, mergeStateLabel, stateRank, buildMarkdown, STATE_ORDER };
