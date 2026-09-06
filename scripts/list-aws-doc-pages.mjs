#!/usr/bin/env node
/*
 * scripts/list-aws-doc-pages.mjs
 *
 * AWS 公式ドキュメント（docs.aws.amazon.com）の 1 ページから、同一ガイド内の
 * 下位ページ（目次リンク）を抽出して一覧表示する。
 *
 * 背景 (refs #69 / docs/wiki/efficiency-log.md):
 *  - 学習リソースの差し替え候補を探すとき、「このガイドにもっと適切な章はないか」を
 *    LLM が推測すると外れやすく、確認のための往復も多い。
 *  - ガイド内の実在ページ一覧を機械的に取得できれば、候補選定が推測ではなく
 *    事実ベースになり、無駄な HTTP 往復とトークンを削減できる。
 *
 * 使い方:
 *   node scripts/list-aws-doc-pages.mjs <guide-url> [--titles]
 *
 * 例:
 *   node scripts/list-aws-doc-pages.mjs \
 *     https://docs.aws.amazon.com/whitepapers/latest/aws-caf-for-ai/aws-caf-for-ai.html --titles
 *
 * オプション:
 *   --titles   リンクテキスト（章タイトル）も併記する。
 *   --anchors  下位ページの代わりに、そのページ内の見出しアンカー（`<h2>`〜`<h4>` の id）を
 *              一覧表示する。単一ページ構成のホワイトペーパー（例: AWS CAF for AI）で、
 *              タスクごとに適切な節へ深くリンクしたいときに使う。
 *
 * 注意:
 *  - 読み取り専用の HTTP GET のみを行う。AWS 系 CLI / ツールは使用しない。
 *  - NODE_OPTIONS に存在しない preload が設定されている環境では
 *    `env -u NODE_OPTIONS node ...`（bash） / `$env:NODE_OPTIONS=''`（PowerShell）で解除する。
 */

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 aws-study-linkcheck/1.0';

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

async function main() {
  const args = process.argv.slice(2);
  const withTitles = args.includes('--titles');
  const target = args.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('usage: node scripts/list-aws-doc-pages.mjs <guide-url> [--titles]');
    process.exit(1);
  }

  const base = new URL(target);
  // ガイドのルート（例: /whitepapers/latest/aws-caf-for-ai/）配下だけを対象にする
  const guideRoot = base.pathname.replace(/[^/]*$/, '');

  const res = await fetch(base.href, {
    redirect: 'follow',
    headers: { 'user-agent': USER_AGENT, 'accept-language': 'en-US,en;q=0.9' },
  });
  const html = await res.text();
  console.log(`# ${res.url}`);
  console.log(`status: ${res.status}`);

  if (args.includes('--anchors')) {
    const heads = new Map();
    const heading = /<h([2-4])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
    for (const m of html.matchAll(heading)) {
      const title = decodeEntities(m[3].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
      heads.set(m[2], { level: m[1], title });
    }
    console.log(`anchors: ${heads.size}\n`);
    for (const [id, { level, title }] of heads) {
      console.log(`${'  '.repeat(Number(level) - 2)}#${id}${title ? `  — ${title}` : ''}`);
    }
    return;
  }

  const seen = new Map();
  const anchor = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const m of html.matchAll(anchor)) {
    let href = decodeEntities(m[1]);
    if (href.startsWith('#') || /^(mailto|javascript):/i.test(href)) continue;
    let abs;
    try {
      abs = new URL(href, base.href);
    } catch {
      continue;
    }
    if (abs.host !== base.host) continue;
    if (!abs.pathname.startsWith(guideRoot)) continue;
    if (!abs.pathname.endsWith('.html')) continue;
    abs.hash = '';
    const title = decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (!seen.has(abs.href) || (title && !seen.get(abs.href))) seen.set(abs.href, title);
  }

  console.log(`pages: ${seen.size}\n`);
  for (const [href, title] of seen) {
    console.log(withTitles && title ? `${href}\n    ${title}` : href);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
