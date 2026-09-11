#!/usr/bin/env node
/*
 * scripts/issue-triage.mjs
 *
 * `github-issue-resolver` エージェント（.kiro/agents/github-issue-resolver.md）の
 * 棚卸し（トリアージ）を 1 コマンドで済ませるための読み取り専用スクリプト。
 *
 * 背景（なぜこれが必要か）:
 *  - エージェントの運用ルールは、どの issue でも着手 / 見送りを判断する前に
 *    (i) issue 自身のコメント、(ii) 関連するすべての PR のコメント 3 種
 *    （ディスカッション / インライン / レビュー）を必ず読むことを要求する。
 *  - これを毎回 LLM が `gh api` の生 JSON を読み下して判断すると、
 *    投入トークンが膨らみ、しかも見落としが起きる（実際に見落としが発生した）。
 *  - 本スクリプトは同じ判定を決定論的に行い、**要約だけ**を出力する。
 *    LLM は要約を読んで「どの issue にどう着手するか」だけを考えればよい。
 *
 * 実行（サンドボックスでは NODE_OPTIONS を外すこと）:
 *   env -u NODE_OPTIONS node scripts/issue-triage.mjs
 *   env -u NODE_OPTIONS node scripts/issue-triage.mjs --issue 138 --issue 32
 *   env -u NODE_OPTIONS node scripts/issue-triage.mjs --json > /tmp/triage.json
 *
 * オプション:
 *   --repo <owner/repo>   対象リポジトリ（既定: Kenta-Matsuda/Kenta-Matsuda.github.io-aws-study）
 *   --issue <n>           対象 issue を限定（複数指定可 / カンマ区切り可）
 *   --body-chars <n>      コメント抜粋の最大文字数（既定: 200 / 0 で本文抜粋なし）
 *   --no-prs              関連 PR の走査を省略（高速・低トークン。コメントファースト判定は不完全になる）
 *   --no-pr-audit         オープン PR 監査（マージ可能状態・未対応コメント）を省略
 *   --json                機械可読な JSON を出力（既定は Markdown 要約）
 *   --help                使い方を表示
 *
 * オープン PR 監査について（2026-09-06 追加）:
 *  - 従来は「open issue に紐づく PR」しか見ていなかったため、issue に紐づかない
 *    ブランチ（`chore/...` / `docs/...` など）の PR が完全に不可視だった。
 *    実際にその状態で PR #157 / #160 の未対応コメントとコンフリクトを見落とした。
 *  - そこで**すべてのオープン PR**について、マージ可能状態（`mergeable_state`）と
 *    未対応コメントを列挙する監査セクションを追加した。
 *  - `mergeable` は一覧 API には含まれないため PR 単体 API を叩く。`unknown` は
 *    GitHub が計算中なので数秒待って再取得する。
 *
 * 重複スキップコメント検知について（2026-09-11 追加）:
 *  - issue #32（グローバルリーダーボード）は、バッチ実行を跨いで `🤖 agent:skipped`
 *    系の見送りコメントが繰り返し積み上がった（同じ「バックエンドが必要なので見送る」
 *    という趣旨のコメントが複数回）。#162 / #167 も同じ蓄積の予備軍だった。
 *  - 従来は `updatedAfterMarker`（マーカー後に人間の更新があったか）しか出しておらず、
 *    「既に何件のスキップコメントが付いているか」を可視化していなかったため、
 *    SKIP 判定の issue に対してエージェントが毎回スキップコメントを重ねて投稿していた。
 *  - そこで各 issue について `🤖 agent:skipped` 接頭辞のコメント件数
 *    （agentSkipCommentCount）を数え、SKIP 判定の issue には「再コメント不要」の
 *    助言（reSkipAdvice）を出すようにした。RECHECK（マーカー後に人間入力あり）の
 *    ときだけ再調査・再コメントする、というルールを機械可読な信号として支援する。
 *
 * 副作用なし: `gh api` の GET のみを実行し、書き込み系エンドポイントは呼ばない。
 * git 操作・ファイル書き込みも行わない。
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_REPO = 'Kenta-Matsuda/Kenta-Matsuda.github.io-aws-study';
const SKIP_LABEL = 'agent:skipped';
const SKIP_MARKER = '🤖 agent:skipped';
const DONE_MARKER = '🤖 対応済み';
const PER_PAGE = 100;
const MAX_PAGES = 10;

// ---- 引数パース ---------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    repo: DEFAULT_REPO,
    issues: [],
    bodyChars: 200,
    withPrs: true,
    withPrAudit: true,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--no-prs') opts.withPrs = false;
    else if (arg === '--no-pr-audit') opts.withPrAudit = false;
    else if (arg === '--repo') opts.repo = argv[++i];
    else if (arg === '--body-chars') opts.bodyChars = Number(argv[++i]) || 0;
    else if (arg === '--issue') {
      const raw = argv[++i] || '';
      raw
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0)
        .forEach((n) => opts.issues.push(n));
    } else {
      throw new Error(`未知のオプション: ${arg}（--help で使い方を表示）`);
    }
  }
  return opts;
}

const USAGE = `使い方: env -u NODE_OPTIONS node scripts/issue-triage.mjs [オプション]

  --repo <owner/repo>   対象リポジトリ（既定: ${DEFAULT_REPO}）
  --issue <n>           対象 issue を限定（複数指定可 / カンマ区切り可）
  --body-chars <n>      コメント抜粋の最大文字数（既定: 200 / 0 で抜粋なし）
  --no-prs              関連 PR の走査を省略（コメントファースト判定は不完全になる）
  --no-pr-audit         オープン PR 監査（マージ可能状態・未対応コメント）を省略
  --json                機械可読な JSON を出力
  --help                このヘルプ

出力する信号（抜粋）:
  - 各 issue の判定（PR_FOLLOWUP / RECHECK / TRIAGE / OPEN_PR / SKIP）
  - 重複スキップコメント検知: 既存の \`🤖 agent:skipped\` コメント件数
    （agentSkipCommentCount）と、SKIP 判定 issue への再コメント不要助言
    （reSkipAdvice）。新規の人間入力が無い限り再度スキップコメントを付けない。

読み取り専用（gh api の GET のみ）。`;

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

/**
 * 配列を返すエンドポイントをページングして全件取得する。
 * `--paginate` は出力が連結された複数 JSON になり得るため、明示的にページを回す。
 */
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

// ---- 判定ロジック -------------------------------------------------------

const isAgentMarker = (body) => {
  const b = (body || '').trimStart();
  return b.startsWith(SKIP_MARKER) || b.startsWith(DONE_MARKER);
};

// スキップ接頭辞（`🤖 agent:skipped`）だけを対象にする。isAgentMarker は
// 対応済み（`🤖 対応済み`）も真になるため、重複スキップコメントの件数計上には使わない。
const isSkipMarker = (body) => (body || '').trimStart().startsWith(SKIP_MARKER);

const ts = (value) => (value ? Date.parse(value) : 0);

/**
 * 既存の `🤖 agent:skipped` コメント件数と、SKIP 判定時の再コメント不要助言を
 * 計算する純ロジック（副作用なし・テスト容易化のため分離）。
 *
 * @param {Array<{isSkipMarker?: boolean}>} comments 正規化済みコメント配列
 * @param {string} verdict トリアージ判定（'SKIP' のときだけ助言を出す）
 * @param {boolean} hasSkipLabel スキップ用ラベルが付与済みか
 * @returns {{agentSkipCommentCount: number, reSkipAdvice: string|null}}
 *
 * 注: 助言の文面はスキップ接頭辞のコメント件数（agentSkipCommentCount）と
 * ラベル有無（hasSkipLabel）をそれぞれ独立に記述する。以前は skipMarkerAt 由来の
 * alreadySkipMarked（対応済みマーカーでも真になりうる）で「ラベル・マーカーあり」と
 * 表示していたため、「既存スキップコメント 0 件 / ラベル・マーカーあり」のように
 * 件数と齟齬する文面になりうる問題があった。ここでは件数とラベルを別々に、
 * 実態どおりに述べることで齟齬を無くす。
 */
function computeRedundantSkipSignal(comments, verdict, hasSkipLabel) {
  const agentSkipCommentCount = (comments || []).filter((c) => c && c.isSkipMarker).length;
  let reSkipAdvice = null;
  if (verdict === 'SKIP') {
    reSkipAdvice =
      `既に SKIP 判定済み（スキップラベル: ${hasSkipLabel ? 'あり' : 'なし'} / ` +
      `既存スキップコメント ${agentSkipCommentCount} 件）。` +
      '新規の人間入力が無い限り、再度スキップコメントを付けないこと（再コメント禁止）。' +
      'ラベルと既存のマーカーコメントで十分。RECHECK（マーカー後に人間入力あり）の時だけ再コメントする。';
  }
  return { agentSkipCommentCount, reSkipAdvice };
}

function excerpt(body, max) {
  if (!max) return undefined;
  const flat = (body || '').replace(/\r?\n+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

function normalizeComment(c, kind, max) {
  return {
    kind,
    author: c.user?.login ?? '(unknown)',
    createdAt: c.created_at ?? c.submitted_at ?? null,
    state: c.state, // review のみ
    path: c.path, // インラインコメントのみ
    isAgentMarker: isAgentMarker(c.body),
    isSkipMarker: isSkipMarker(c.body),
    excerpt: excerpt(c.body, max),
  };
}

/**
 * issue 番号に紐づく PR かどうかを、head ブランチ名と本文の参照記載から判定する。
 *
 * ブランチ接頭辞は `feature/` だけではない（`fix/` `chore/` `docs/` なども使う）。
 * 以前は `^feature/issue-N` のみを見ていたため、`fix/issue-165-...` のような PR が
 * 「関連 PR なし」と誤判定されていた。本文側も `Closes` だけでなく、部分対応で使う
 * `Refs` / `Related to` も拾う。
 */
function prMatchesIssue(pr, issueNumber) {
  const head = pr.head?.ref ?? '';
  if (new RegExp(`^[a-z]+/issue-${issueNumber}(?:\\b|-)`, 'i').test(head)) return true;
  const body = pr.body ?? '';
  return new RegExp(
    `(closes|fixes|resolves|refs|references|related to)\\s+#${issueNumber}\\b`,
    'i',
  ).test(body);
}

/**
 * オープン PR の「未対応コメント」を判定する。
 * 基準時刻 = max(PR 作成時刻, 直近の自分の対応コメント（🤖 対応済み）時刻)。
 * 基準時刻より後に付いた、エージェント自身のマーカーではないコメント / レビューを未対応とみなす。
 */
function detectUnaddressed(pr, comments) {
  const doneAt = comments
    .filter((c) => c.isAgentMarker && ts(c.createdAt) > 0)
    .reduce((acc, c) => Math.max(acc, ts(c.createdAt)), 0);
  const baseline = Math.max(ts(pr.created_at), doneAt);
  const unaddressed = comments.filter(
    (c) => !c.isAgentMarker && ts(c.createdAt) > baseline && c.state !== 'APPROVED',
  );
  return { baselineAt: new Date(baseline).toISOString(), doneAt: doneAt ? new Date(doneAt).toISOString() : null, unaddressed };
}

async function collectPrComments(repo, prNumber, max) {
  const [discussion, inline, reviews] = await Promise.all([
    ghGetAll(`repos/${repo}/issues/${prNumber}/comments`),
    ghGetAll(`repos/${repo}/pulls/${prNumber}/comments`),
    ghGetAll(`repos/${repo}/pulls/${prNumber}/reviews`),
  ]);
  return [
    ...discussion.map((c) => normalizeComment(c, 'discussion', max)),
    ...inline.map((c) => normalizeComment(c, 'inline', max)),
    ...reviews
      .filter((r) => (r.body && r.body.trim()) || r.state === 'CHANGES_REQUESTED')
      .map((r) => normalizeComment(r, 'review', max)),
  ].sort((a, b) => ts(a.createdAt) - ts(b.createdAt));
}

/** 1 件の issue についてトリアージ結果を組み立てる。 */
async function triageIssue(repo, issue, allPrs, opts) {
  const comments = (await ghGetAll(`repos/${repo}/issues/${issue.number}/comments`)).map((c) =>
    normalizeComment(c, 'issue', opts.bodyChars),
  );

  const labels = (issue.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name));
  const hasSkipLabel = labels.includes(SKIP_LABEL);

  const skipMarkerAt = comments
    .filter((c) => c.isAgentMarker)
    .reduce((acc, c) => Math.max(acc, ts(c.createdAt)), 0);
  const latestHumanCommentAt = comments
    .filter((c) => !c.isAgentMarker)
    .reduce((acc, c) => Math.max(acc, ts(c.createdAt)), 0);

  const updatedAfterMarker =
    skipMarkerAt > 0 && (ts(issue.updated_at) > skipMarkerAt || latestHumanCommentAt > skipMarkerAt);

  // 関連 PR
  const relatedPrs = [];
  if (opts.withPrs) {
    const matched = allPrs.filter((pr) => prMatchesIssue(pr, issue.number));
    for (const pr of matched) {
      const entry = {
        number: pr.number,
        title: pr.title,
        state: pr.merged_at ? 'merged' : pr.state,
        head: pr.head?.ref ?? null,
        createdAt: pr.created_at,
        url: pr.html_url,
      };
      // コメント取得は open PR に絞る（closed/merged は既存ブランチを更新できないため）
      if (pr.state === 'open') {
        const prComments = await collectPrComments(repo, pr.number, opts.bodyChars);
        const { baselineAt, doneAt, unaddressed } = detectUnaddressed(pr, prComments);
        entry.baselineAt = baselineAt;
        entry.lastAgentReplyAt = doneAt;
        entry.commentCount = prComments.length;
        entry.unaddressed = unaddressed;
      }
      relatedPrs.push(entry);
    }
  }

  const openPrs = relatedPrs.filter((p) => p.state === 'open');
  const prNeedsFollowup = openPrs.some((p) => (p.unaddressed?.length ?? 0) > 0);

  let verdict;
  if (prNeedsFollowup) verdict = 'PR_FOLLOWUP';
  else if (hasSkipLabel && skipMarkerAt > 0 && !updatedAfterMarker) verdict = 'SKIP';
  else if (hasSkipLabel && updatedAfterMarker) verdict = 'RECHECK';
  else if (openPrs.length > 0) verdict = 'OPEN_PR';
  else verdict = 'TRIAGE';

  // 重複スキップコメント検知（読み取り専用の派生信号）。
  const alreadySkipMarked = hasSkipLabel && skipMarkerAt > 0;
  // 助言の文面はスキップ件数とラベル有無を別々に述べる（対応済みマーカー由来の
  // alreadySkipMarked を文面に混ぜると件数 0 でも「マーカーあり」と齟齬しうるため）。
  const { agentSkipCommentCount, reSkipAdvice } = computeRedundantSkipSignal(
    comments,
    verdict,
    hasSkipLabel,
  );

  return {
    number: issue.number,
    title: issue.title,
    author: issue.user?.login ?? '(unknown)',
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    labels,
    hasSkipLabel,
    skipMarkerAt: skipMarkerAt ? new Date(skipMarkerAt).toISOString() : null,
    updatedAfterMarker,
    alreadySkipMarked,
    agentSkipCommentCount,
    reSkipAdvice,
    commentCount: comments.length,
    comments,
    relatedPrs,
    verdict,
  };
}

// ---- オープン PR 監査 ---------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * PR 単体 API からマージ可能状態を取得する。
 * 一覧 API には `mergeable` / `mergeable_state` が含まれないため単体で叩く必要がある。
 * `mergeable === null`（`mergeable_state: unknown`）は GitHub が計算中なので待って再取得する。
 */
async function fetchMergeState(repo, number, { attempts = 3, waitMs = 3000 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const pr = await ghGet(`repos/${repo}/pulls/${number}`);
    if (!pr) return { mergeable: null, mergeableState: 'unknown', rebaseable: null };
    if (pr.mergeable !== null || i === attempts - 1) {
      return {
        mergeable: pr.mergeable,
        mergeableState: pr.mergeable_state ?? 'unknown',
        rebaseable: pr.rebaseable ?? null,
      };
    }
    await sleep(waitMs);
  }
  return { mergeable: null, mergeableState: 'unknown', rebaseable: null };
}

const PR_VERDICT_LABEL = {
  PR_CONFLICT: 'コンフリクト（mergeable_state: dirty）— 最優先で main をマージして解消する',
  PR_BEHIND: 'main に遅れている（behind）— 最新 main を取り込む',
  PR_FOLLOWUP: '未対応コメントあり — 同じ head ブランチへ対応し直す',
  PR_UNKNOWN: 'マージ可能状態を判定できなかった — git rev-list でローカル判定にフォールバック',
  PR_OK: 'コンフリクトも未対応コメントも無い（blocked / unstable はレビュー・チェック要件）',
};

const PR_VERDICT_ORDER = ['PR_CONFLICT', 'PR_FOLLOWUP', 'PR_BEHIND', 'PR_UNKNOWN', 'PR_OK'];

/**
 * すべてのオープン PR を監査する。
 * issue に紐づかない PR（chore/... や docs/... ブランチ）も対象に含めるのが要点。
 */
async function auditOpenPrs(repo, allPrs, openIssueNumbers, opts) {
  const openPrs = allPrs.filter((pr) => pr.state === 'open');
  const results = [];

  for (const pr of openPrs) {
    const comments = await collectPrComments(repo, pr.number, opts.bodyChars);
    const { baselineAt, doneAt, unaddressed } = detectUnaddressed(pr, comments);
    const merge = await fetchMergeState(repo, pr.number);

    // この PR がどの open issue に紐づいているか（紐づかないものは従来の棚卸しで不可視だった）
    const linkedIssues = [...openIssueNumbers].filter((n) => prMatchesIssue(pr, n));

    let verdict;
    if (merge.mergeableState === 'dirty') verdict = 'PR_CONFLICT';
    else if (unaddressed.length > 0) verdict = 'PR_FOLLOWUP';
    else if (merge.mergeableState === 'behind') verdict = 'PR_BEHIND';
    else if (merge.mergeableState === 'unknown') verdict = 'PR_UNKNOWN';
    else verdict = 'PR_OK';

    results.push({
      number: pr.number,
      title: pr.title,
      head: pr.head?.ref ?? null,
      base: pr.base?.ref ?? null,
      createdAt: pr.created_at,
      url: pr.html_url,
      draft: Boolean(pr.draft),
      mergeable: merge.mergeable,
      mergeableState: merge.mergeableState,
      baselineAt,
      lastAgentReplyAt: doneAt,
      commentCount: comments.length,
      unaddressed,
      linkedOpenIssues: linkedIssues,
      verdict,
    });
  }

  results.sort(
    (a, b) => PR_VERDICT_ORDER.indexOf(a.verdict) - PR_VERDICT_ORDER.indexOf(b.verdict) || a.number - b.number,
  );
  return results;
}

function renderPrAudit(prAudit) {
  const lines = [];
  lines.push('## オープン PR 監査（issue に紐づかない PR も含む）');
  lines.push('');
  lines.push(`- 対象オープン PR: ${prAudit.length} 件`);
  const counts = PR_VERDICT_ORDER.map((v) => `${v}=${prAudit.filter((p) => p.verdict === v).length}`);
  lines.push(`- 判定内訳: ${counts.join(' / ')}`);
  lines.push('');
  for (const v of PR_VERDICT_ORDER) {
    if (!prAudit.some((p) => p.verdict === v)) continue;
    lines.push(`- \`${v}\`: ${PR_VERDICT_LABEL[v]}`);
  }
  lines.push('');
  for (const p of prAudit) {
    lines.push(
      `### ${p.verdict} — PR #${p.number} ${p.title}`,
    );
    lines.push(
      `- head: ${p.head} → base: ${p.base}${p.draft ? ' / draft' : ''} / 作成: ${p.createdAt}`,
    );
    lines.push(
      `- mergeable: ${p.mergeable} / mergeable_state: ${p.mergeableState}` +
        ` / 紐づく open issue: ${p.linkedOpenIssues.length ? p.linkedOpenIssues.map((n) => `#${n}`).join(' ') : 'なし（棚卸しでは不可視になるので注意）'}`,
    );
    lines.push(
      `- コメント: ${p.commentCount} 件 / 未対応: ${p.unaddressed.length} 件（基準時刻 ${p.baselineAt}）`,
    );
    for (const c of p.unaddressed) {
      lines.push(
        `  - [${c.kind}${c.state ? `/${c.state}` : ''}] ${c.author} ${c.createdAt}` +
          (c.path ? ` (${c.path})` : '') +
          (c.excerpt ? `: ${c.excerpt}` : ''),
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ---- 出力 ---------------------------------------------------------------

const VERDICT_LABEL = {
  PR_FOLLOWUP: '既存オープン PR に未対応コメントあり（既存ブランチへ対応し直す）',
  SKIP: 'マーカー付与後に更新なし（今回スキップ）',
  RECHECK: 'マーカー付与後に更新あり（再調査へ戻す）',
  OPEN_PR: 'オープン PR あり・未対応コメントなし（新規 PR は作らない）',
  TRIAGE: '通常の調査対象',
};

const VERDICT_ORDER = ['PR_FOLLOWUP', 'RECHECK', 'TRIAGE', 'OPEN_PR', 'SKIP'];

function renderMarkdown(repo, results, prAudit) {
  const lines = [];
  lines.push(`# issue トリアージ要約: ${repo}`);
  lines.push('');
  lines.push(`- 生成時刻: ${new Date().toISOString()}`);
  lines.push(`- open issue 件数: ${results.length}`);
  const counts = VERDICT_ORDER.map((v) => `${v}=${results.filter((r) => r.verdict === v).length}`);
  lines.push(`- 判定内訳: ${counts.join(' / ')}`);
  lines.push('');
  lines.push('判定の意味:');
  for (const v of VERDICT_ORDER) lines.push(`- \`${v}\`: ${VERDICT_LABEL[v]}`);
  lines.push('');

  // オープン PR 監査を先に出す: コンフリクト解消と未対応コメントへの追随は
  // 新規 issue の実装より優先されるため。
  if (prAudit && prAudit.length) {
    lines.push(renderPrAudit(prAudit));
  }

  for (const v of VERDICT_ORDER) {
    const group = results.filter((r) => r.verdict === v);
    if (group.length === 0) continue;
    lines.push(`## ${v} — ${VERDICT_LABEL[v]}（${group.length} 件）`);
    lines.push('');
    for (const r of group) {
      lines.push(`### #${r.number} ${r.title}`);
      lines.push(
        `- 起票: ${r.author} / 更新: ${r.updatedAt} / コメント: ${r.commentCount} 件` +
          (r.labels.length ? ` / ラベル: ${r.labels.join(', ')}` : ''),
      );
      if (r.hasSkipLabel) {
        lines.push(
          `- skip マーカー: ${r.skipMarkerAt ?? '(判断コメントなし)'} / マーカー後の更新: ${r.updatedAfterMarker ? 'あり' : 'なし'}`,
        );
      }
      if (r.verdict === 'SKIP') {
        lines.push(
          `- 既存の agent:skipped コメント: ${r.agentSkipCommentCount} 件 / 再コメント: 不要（新規の人間入力が無い限り再度スキップコメントを付けない）`,
        );
      }
      if (r.relatedPrs.length) {
        for (const pr of r.relatedPrs) {
          const un = pr.unaddressed?.length ?? 0;
          lines.push(
            `- 関連 PR #${pr.number}（${pr.state} / head: ${pr.head}）` +
              (pr.state === 'open' ? ` 未対応コメント: ${un} 件（基準時刻 ${pr.baselineAt}）` : ''),
          );
          for (const c of pr.unaddressed ?? []) {
            lines.push(
              `  - [${c.kind}${c.state ? `/${c.state}` : ''}] ${c.author} ${c.createdAt}` +
                (c.path ? ` (${c.path})` : '') +
                (c.excerpt ? `: ${c.excerpt}` : ''),
            );
          }
        }
      } else if (r.verdict === 'TRIAGE' || r.verdict === 'RECHECK') {
        lines.push('- 関連 PR: なし');
      }
      const notable = r.comments.filter((c) => !c.isAgentMarker);
      if (notable.length) {
        lines.push(`- issue コメント（新しい順に最大 5 件）:`);
        for (const c of notable.slice(-5).reverse()) {
          lines.push(`  - ${c.author} ${c.createdAt}${c.excerpt ? `: ${c.excerpt}` : ''}`);
        }
      }
      lines.push('');
    }
  }
  lines.push('---');
  lines.push(
    '注意: 本要約は判定の入口であり、着手する issue については本文と関連コードを必ず読むこと。' +
      '未対応コメントの全文が必要な場合は `--body-chars 0` 以外で再実行するか、該当 API を直接叩く。',
  );
  return lines.join('\n');
}

// ---- メイン -------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  const repo = opts.repo;

  let issues;
  if (opts.issues.length > 0) {
    const fetched = await Promise.all(opts.issues.map((n) => ghGet(`repos/${repo}/issues/${n}`)));
    issues = fetched.filter((i) => i && !i.pull_request);
  } else {
    issues = (await ghGetAll(`repos/${repo}/issues?state=open`)).filter((i) => !i.pull_request);
  }

  const allPrs = opts.withPrs ? await ghGetAll(`repos/${repo}/pulls?state=all`) : [];

  const results = [];
  for (const issue of issues) {
    results.push(await triageIssue(repo, issue, allPrs, opts));
  }
  results.sort((a, b) => a.number - b.number);

  // オープン PR 監査は「対象 issue を限定した」場合でも全件行う。
  // issue に紐づかない PR の見落としを防ぐことが目的なので、絞り込みの影響を受けさせない。
  let prAudit = [];
  if (opts.withPrs && opts.withPrAudit) {
    const openIssues = opts.issues.length
      ? (await ghGetAll(`repos/${repo}/issues?state=open`)).filter((i) => !i.pull_request)
      : issues;
    prAudit = await auditOpenPrs(repo, allPrs, new Set(openIssues.map((i) => i.number)), opts);
  }

  if (opts.json) {
    process.stdout.write(
      `${JSON.stringify({ repo, generatedAt: new Date().toISOString(), results, openPrAudit: prAudit }, null, 2)}\n`,
    );
  } else {
    process.stdout.write(`${renderMarkdown(repo, results, prAudit)}\n`);
  }
}

// 直接実行されたときだけ main() を走らせる。テスト等から import されたときは
// 純ロジック（computeRedundantSkipSignal など）だけを使えるようにする。
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    process.stderr.write(`[error] ${err?.stack || err}\n`);
    process.exitCode = 1;
  });
}

export { computeRedundantSkipSignal, isSkipMarker, isAgentMarker, SKIP_MARKER, DONE_MARKER };
