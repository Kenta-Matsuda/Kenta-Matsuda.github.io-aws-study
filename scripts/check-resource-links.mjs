#!/usr/bin/env node
/*
 * scripts/check-resource-links.mjs
 *
 * js/data/ 配下の全試験データ（および共通定義 common-steps.js）から
 * 学習リソースの URL（`url` / `urlEn`）を抽出し、HTTP 死活・リダイレクトを
 * 一覧化するリンクチェッカ。
 *
 * 背景 (refs #69 / docs/wiki/efficiency-log.md):
 *  - exam-content-maintainer エージェントは毎回 LLM が自然言語で URL を抽出し
 *    1 件ずつ確認していたため、投入トークンが大きく再現性も低かった。
 *  - 本スクリプトで「抽出 + 死活チェック」を機械化し、LLM は問題のある行の
 *    サマリだけを読み込めば済むようにする。
 *
 * 使い方:
 *   # 抽出のみ（ネットワーク不要 / オフライン環境でも動く）
 *   node scripts/check-resource-links.mjs --no-fetch
 *
 *   # 全試験の死活チェック（要ネットワーク）
 *   node scripts/check-resource-links.mjs
 *
 *   # 特定試験のみ / 出力先を指定
 *   node scripts/check-resource-links.mjs --only aib-c01,saa-c03 --json out/links.json
 *
 * オプション:
 *   --only <codes>     カンマ区切りの対象ファイル名（拡張子なし）。既定は全件。
 *   --no-fetch         HTTP アクセスをせず、抽出結果と重複だけを出力する。
 *   --json <path>      詳細結果を JSON で書き出す（既定: 書き出さない）。
 *   --concurrency <n>  同時リクエスト数（既定: 8）。
 *   --timeout <ms>     1 リクエストのタイムアウト（既定: 20000）。
 *   --all              問題のない URL も標準出力に一覧表示する。
 *   --fragments        `#:~:text=` テキストフラグメントが本文に実在するかも検証する
 *                      （Black Belt 一覧ページ内アンカーの陳腐化検出。GET が必要なので低速）。
 *   --notices          ページ本文から「廃止 / 新規顧客の受付終了」の告知を検出する。
 *                      リンクは 200 のままなので死活チェックでは絶対に検出できない種類の
 *                      陳腐化を拾うためのモード（本文取得が必要なので低速）。
 *   --urls <list>      js/data/ ではなく、カンマ区切りで渡した URL を検証する。
 *                      差し替え候補の当たりを付けるのに使う（同じ分類ロジックで判定できる）。
 *                      例: node scripts/check-resource-links.mjs --urls "https://a,https://b" --all
 *
 * 設計上のポイント:
 *  - フラグメント（`#...`）は HTTP では送られないため、フェッチは
 *    「フラグメントを除いた URL」単位で重複排除する。Black Belt 一覧ページのように
 *    同一ページへ多数のテキストフラグメント付きリンクがある本リポジトリでは
 *    リクエスト数を大幅に削減できる。
 *
 * 終了コード:
 *   0 = 実行完了（問題が見つかっても 0。CI でのゲートには使わない）
 *   1 = スクリプト自体の実行エラー
 *
 * 注意:
 *  - サンドボックスが NODE_OPTIONS に存在しない preload を設定している場合は
 *    `env -u NODE_OPTIONS node ...`（bash） / `$env:NODE_OPTIONS=''`（PowerShell）
 *    で解除してから実行する。
 *  - AWS 系コマンド（aws / cdk / sam 等）は一切使用しない。読み取り専用の
 *    HTTP GET/HEAD のみを行う。
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const DATA_DIR = path.resolve('js/data');

/** リンクを持たない / 走査対象外のファイル。 */
const SKIP_FILES = new Set([
  '_placeholder.js',
  'common-defaults.js', // URL を持たない共通既定値
]);

/** 既定の User-Agent（既定値のままだと 403 を返す配信元があるため明示する）。 */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 aws-study-linkcheck/1.0';

function parseArgs(argv) {
  const opts = {
    only: null,
    fetch: true,
    json: null,
    concurrency: 8,
    timeout: 20000,
    all: false,
    fragments: false,
    notices: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--no-fetch') opts.fetch = false;
    else if (a === '--all') opts.all = true;
    else if (a === '--only') opts.only = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--urls') opts.urls = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--json') opts.json = argv[++i];
    else if (a === '--fragments') opts.fragments = true;
    else if (a === '--notices') opts.notices = true;
    else if (a === '--concurrency') opts.concurrency = Number(argv[++i]) || 8;
    else if (a === '--timeout') opts.timeout = Number(argv[++i]) || 20000;
    else if (a === '--help' || a === '-h') opts.help = true;
    else throw new Error(`Unknown option: ${a}`);
  }
  return opts;
}

/**
 * 任意の値を深く走査し、`url` / `urlEn` を持つオブジェクト（リソースアイテム）を集める。
 * データファイルの形（配列 / オブジェクト / ネスト）に依存しないため、
 * スキーマが多少変わっても壊れない。
 */
function collectItems(node, ctx, out) {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) collectItems(child, ctx, out);
    return;
  }
  const next = { ...ctx };
  // 文脈になりうるキーを引き継ぐ（後続の出力で「どこの URL か」を示すため）
  if (typeof node.code === 'string') next.exam = node.code;
  if (typeof node.id === 'string' && typeof node.jpTitle === 'string') next.step = `${node.id}:${node.jpTitle}`;
  if (typeof node.key === 'string' && Array.isArray(node.items)) next.group = node.key;

  const hasUrl = typeof node.url === 'string' || typeof node.urlEn === 'string';
  if (hasUrl) {
    for (const field of ['url', 'urlEn']) {
      const value = node[field];
      if (typeof value !== 'string' || value.length === 0) continue;
      out.push({
        ...next,
        field,
        url: value,
        title: node.title ?? node.titleEn ?? '',
        note: node.note ?? '',
        recommend: Boolean(node.recommend),
        level: node.level ?? null,
      });
    }
  }
  for (const value of Object.values(node)) collectItems(value, next, out);
}

async function loadDataFiles(only) {
  const entries = (await readdir(DATA_DIR)).filter((f) => f.endsWith('.js') && !SKIP_FILES.has(f)).sort();
  const targets = only ? entries.filter((f) => only.includes(path.basename(f, '.js'))) : entries;
  const items = [];
  for (const file of targets) {
    const abs = path.join(DATA_DIR, file);
    let mod;
    try {
      mod = await import(pathToFileURL(abs).href);
    } catch (err) {
      console.error(`[load-error] ${file}: ${err.message}`);
      continue;
    }
    const before = items.length;
    collectItems(mod, { file, exam: path.basename(file, '.js').toUpperCase() }, items);
    if (items.length === before) console.error(`[warn] ${file}: URL が見つかりませんでした`);
  }
  return items;
}

/**
 * 1 URL を検証する。HEAD が拒否される配信元が多いため、HEAD で 4xx/5xx を
 * 引いた場合は GET でフォールバックする。
 */
async function checkUrl(url, timeoutMs, wantBody) {
  const attempt = async (method) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'user-agent': USER_AGENT, 'accept-language': 'ja,en;q=0.8' },
      });
      let body = null;
      if (method === 'GET') {
        // 本文は必ず読み切ってソケットを解放する（必要なときだけ保持する）
        const text = await res.text().catch(() => '');
        if (wantBody) body = text;
      }
      return { status: res.status, finalUrl: res.url || url, method, body };
    } finally {
      clearTimeout(timer);
    }
  };

  // フラグメント検証が必要なときは最初から GET する
  if (wantBody) {
    try {
      return await attempt('GET');
    } catch (err) {
      return { status: 0, finalUrl: url, method: 'GET', error: err.name === 'AbortError' ? 'timeout' : err.message };
    }
  }

  try {
    const head = await attempt('HEAD');
    if (head.status < 400) return head;
    return await attempt('GET');
  } catch {
    try {
      return await attempt('GET');
    } catch (getErr) {
      return { status: 0, finalUrl: url, method: 'GET', error: getErr.name === 'AbortError' ? 'timeout' : getErr.message };
    }
  }
}

/** フラグメントを除いた URL（フェッチ単位のキー）。 */
function stripFragment(u) {
  const i = u.indexOf('#');
  return i === -1 ? u : u.slice(0, i);
}

/** `#:~:text=...` のテキストフラグメントを復号して返す（無ければ null）。 */
function textFragment(u) {
  const m = /#:~:text=(.+)$/.exec(u);
  if (!m) return null;
  // テキストフラグメントは `start,end` / `prefix-,text,-suffix` の形を取りうる
  return m[1]
    .split(',')
    .map((part) => {
      try {
        return decodeURIComponent(part).replace(/^-|-$/g, '');
      } catch {
        return part;
      }
    })
    .filter((s) => s.length > 0);
}

/**
 * 「廃止 / 新規顧客の受付終了」を示す告知フレーズ。
 *
 * リンクが 200 を返してもサービス自体が終息していることがあり、死活チェックでは
 * 検出できない。本リポジトリの方針として、**廃止済みだけでなく新規顧客の受付を
 * 終了したサービスのリソースも掲載しない**ため、機械的に検出できるようにする。
 *
 * 判定は「候補の提示」であり最終判断ではない。ヒットしたら必ず本文を読んで、
 * 記事が別サービスの終息に触れているだけ（誤検知）でないかを確認する。
 */
const DEPRECATION_PATTERNS = [
  // 新規顧客の受付終了（英語 / 日本語のドキュメント表記）
  /no longer open to new customers/i,
  /not available to new customers/i,
  /no longer available to new customers/i,
  /closed to new customers/i,
  /新規(の)?(お)?客(様|さま)?(への提供|の受付)?を終了/,
  /新規のお客様[^。]{0,20}(利用|ご利用)(いただけ|でき)ま(せん|せんでした)/,
  // 廃止 / サポート終了
  /(has been|will be|is being) discontinued/i,
  /end of support for/i,
  /will (be )?end of life/i,
  /提供を終了(いたし)?ました/,
  /廃止(され|いたし)ました/,
  /サポートを終了(いたし)?ました/,
  // 新機能を追加しない宣言（実質の終息サイン）
  /do not plan to introduce new features/i,
];

/** 告知フレーズを本文から探し、ヒットした周辺テキストを返す。 */
function findDeprecationNotices(html) {
  const text = visibleText(html);
  const hits = [];
  for (const re of DEPRECATION_PATTERNS) {
    const m = re.exec(text);
    if (!m) continue;
    hits.push(text.slice(Math.max(0, m.index - 100), m.index + 160).trim());
  }
  return hits;
}

/** HTML から可視テキストを大まかに取り出す（フラグメント照合用の緩い正規化）。 */
function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ');
}

/** URL 正規化（末尾スラッシュ・フラグメントの差だけのリダイレクトはノイズなので無視する）。 */
function normalizeForCompare(u) {
  try {
    const url = new URL(u);
    url.hash = '';
    url.pathname = url.pathname.replace(/\/+$/, '');
    return `${url.origin}${url.pathname}${url.search}`;
  } catch {
    return u;
  }
}

/**
 * AWS サイトの言語ロケールを表すパス先頭セグメント。
 * `aws.amazon.com/jp/...` / `docs.aws.amazon.com/ja_jp/...` のように、
 * Accept-Language や地域に応じて付け外しされるだけの差はリンク切れではない。
 */
const LOCALE_SEGMENT =
  /^(jp|ja|ja_jp|en|en_us|de|de_de|fr|fr_fr|es|es_es|it|it_it|ko|ko_kr|pt|pt_br|zh_cn|zh_tw|cn|tw|id|id_id|th|th_th|tr|tr_tr|vi|ar|ru|ru_ru|in|mx|br|sa|il|pl)$/;

/** ロケールセグメントを除去した比較用の正規形。 */
function localeAgnostic(u) {
  try {
    const url = new URL(u);
    url.hash = '';
    const segs = url.pathname.split('/').filter(Boolean);
    if (segs.length > 0 && LOCALE_SEGMENT.test(segs[0])) segs.shift();
    return `${url.origin}/${segs.join('/')}${url.search}`;
  } catch {
    return u;
  }
}

/** リダイレクト先が元の URL の「より浅いパス」なら、その個別ページは失われた可能性が高い。 */
function isShallower(originalUrl, finalUrl) {
  try {
    const a = new URL(localeAgnostic(originalUrl));
    const b = new URL(localeAgnostic(finalUrl));
    if (a.origin !== b.origin) return false;
    const pa = a.pathname.replace(/\/+$/, '');
    const pb = b.pathname.replace(/\/+$/, '');
    return pb.length < pa.length && (pa.startsWith(`${pb}/`) || pb === '');
  } catch {
    return false;
  }
}

async function runPool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (cursor < tasks.length) {
      const index = cursor++;
      results[index] = await tasks[index]();
    }
  });
  await Promise.all(workers);
  return results;
}

function classify(check, originalUrl) {
  if (check.error) return 'error';
  if (check.status === 0) return 'error';
  if (check.status >= 500) return 'server-error';
  if (check.status === 403) return 'forbidden'; // bot ブロックの可能性。手動確認が必要
  if (check.status >= 400) return 'broken';
  const original = stripFragment(originalUrl);
  const moved = normalizeForCompare(check.finalUrl) !== normalizeForCompare(original);
  // 個別ページが失われて親ページへ吸収された（ソフト 404）。最優先で確認すべき。
  if (moved && isShallower(original, check.finalUrl)) return 'soft-404';
  // 廃止 / 新規受付終了はリンク切れより優先して人間の目に入れる（掲載対象外にするため）
  if (check.notices && check.notices.length > 0) return 'deprecated';
  if (check.fragmentMiss) return 'fragment-miss';
  if (!moved) return 'ok';
  // ロケールセグメント（/jp/ ・/ja_jp/）の付け外しだけならリンク切れではない
  if (localeAgnostic(check.finalUrl) === localeAgnostic(original)) return 'locale-redirect';
  return 'redirect';
}

const CLASS_ORDER = [
  'broken',
  'soft-404',
  'deprecated',
  'error',
  'server-error',
  'fragment-miss',
  'redirect',
  'forbidden',
  'locale-redirect',
  'ok',
];

/** 既定で標準出力に詳細を出さない（ノイズ寄りの）分類。 */
const QUIET_CLASSES = new Set(['ok', 'locale-redirect']);

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(await readFile(new URL(import.meta.url), 'utf8').then((s) => s.split('*/')[0]));
    return;
  }

  const items = opts.urls
    ? opts.urls.map((u) => ({ file: '(--urls)', exam: '(ad-hoc)', field: 'url', url: u, title: '' }))
    : await loadDataFiles(opts.only);
  const byUrl = new Map();
  for (const item of items) {
    if (!byUrl.has(item.url)) byUrl.set(item.url, []);
    byUrl.get(item.url).push(item);
  }

  console.log(`# resource link check`);
  console.log(`files scanned : ${new Set(items.map((i) => i.file)).size}`);
  console.log(`url fields    : ${items.length}`);
  console.log(`unique urls   : ${byUrl.size}`);

  if (!opts.fetch) {
    const dupes = [...byUrl.entries()].filter(([, uses]) => new Set(uses.map((u) => u.file)).size > 1);
    console.log(`\n## cross-file duplicate urls (${dupes.length})`);
    for (const [url, uses] of dupes) {
      console.log(`- ${url}\n    ${[...new Set(uses.map((u) => u.file))].join(', ')}`);
    }
    return;
  }

  const urls = [...byUrl.keys()];

  // フラグメントは HTTP では送られないため、フェッチはフラグメント除去後の URL 単位で行う
  const fetchKeys = [...new Set(urls.map(stripFragment))];
  const needBody = new Set(
    opts.fragments ? urls.filter((u) => textFragment(u)).map(stripFragment) : [],
  );
  // --notices は本文が必要。全 URL を対象にする（告知はどのドメインにも出しうる）
  if (opts.notices) for (const key of fetchKeys) needBody.add(key);
  console.log(`http requests : ${fetchKeys.length}${needBody.size > 0 ? ` (body fetch: ${needBody.size})` : ''}`);

  let done = 0;
  const checks = await runPool(
    fetchKeys.map((key) => async () => {
      const res = await checkUrl(key, opts.timeout, needBody.has(key));
      done += 1;
      if (done % 50 === 0) process.stderr.write(`  ...${done}/${fetchKeys.length}\n`);
      return res;
    }),
    opts.concurrency,
  );
  const byKey = new Map(fetchKeys.map((k, i) => [k, checks[i]]));

  // 告知検出はページ単位で 1 回だけ行い、同じページを指す複数 URL で結果を共有する
  const noticeCache = new Map();
  if (opts.notices) {
    for (const [key, res] of byKey) {
      noticeCache.set(key, res.body ? findDeprecationNotices(res.body) : []);
    }
  }

  const rows = urls.map((url) => {
    const base = byKey.get(stripFragment(url));
    const check = { ...base };
    if (opts.notices) check.notices = noticeCache.get(stripFragment(url)) ?? [];
    // テキストフラグメントの実在確認（本文を取得できた場合のみ）
    const frag = textFragment(url);
    if (frag && base.body) {
      const text = visibleText(base.body);
      // needle 側も本文と同じ空白正規化をかける。テキストフラグメントには `%0A`
      // （改行）が含まれることがあり、正規化しないと全件が偽陽性になる。
      const missing = frag.filter((needle) => !text.includes(needle.replace(/\s+/g, ' ').trim()));
      if (missing.length > 0) {
        check.fragmentMiss = true;
        check.missingFragments = missing;
      }
    }
    return {
      url,
      status: check.status,
      finalUrl: check.finalUrl,
      error: check.error ?? null,
      missingFragments: check.missingFragments ?? null,
      notices: check.notices && check.notices.length > 0 ? check.notices : null,
      klass: classify(check, url),
      uses: byUrl.get(url).map((u) => ({ file: u.file, field: u.field, step: u.step ?? null, group: u.group ?? null, title: u.title })),
    };
  });

  const counts = {};
  for (const r of rows) counts[r.klass] = (counts[r.klass] || 0) + 1;
  console.log(`\n## summary`);
  for (const k of CLASS_ORDER) if (counts[k]) console.log(`${k.padEnd(13)}: ${counts[k]}`);

  for (const k of CLASS_ORDER) {
    if (QUIET_CLASSES.has(k) && !opts.all) continue;
    const group = rows.filter((r) => r.klass === k);
    if (group.length === 0) continue;
    console.log(`\n## ${k} (${group.length})`);
    for (const r of group) {
      const files = [...new Set(r.uses.map((u) => `${u.file}#${u.field}`))].join(' ');
      console.log(`- [${r.status}${r.error ? ` ${r.error}` : ''}] ${r.url}`);
      if (k === 'redirect' || k === 'soft-404' || k === 'locale-redirect') console.log(`    -> ${r.finalUrl}`);
      if (k === 'fragment-miss') console.log(`    missing text: ${JSON.stringify(r.missingFragments)}`);
      if (k === 'deprecated') for (const n of r.notices) console.log(`    notice: ...${n}...`);
      console.log(`    used: ${files}`);
    }
  }

  if (opts.json) {
    await mkdir(path.dirname(path.resolve(opts.json)), { recursive: true });
    await writeFile(opts.json, `${JSON.stringify({ generatedAt: new Date().toISOString(), counts, rows }, null, 2)}\n`, 'utf8');
    console.log(`\njson written: ${opts.json}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
