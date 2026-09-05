#!/usr/bin/env node
/*
 * scripts/check-link-descriptions.mjs
 *
 * 「リンク先の実際の内容」と「データ側の説明文（title / note）」がずれていないかを
 * 突き合わせるためのレビュー支援スクリプト。
 *
 * 背景 (refs #69):
 *  - リンクが 200 を返し、サービスも現役でも、`title` / `note` がリンク先の内容と
 *    合っていなければ学習者を誤誘導する。URL の差し替えでページの主題が変わると
 *    起きやすく、死活チェックや廃止告知チェックでは検出できない。
 *  - 一方、全 1,000 件超を毎回突き合わせるのは費用に見合わない。**リンクを変更した
 *    ときだけ**チェックすれば十分なので、変更検出を git diff に任せる。
 *
 * 使い方:
 *   # 既定: main との差分で「追加された url / urlEn」を持つアイテムだけを検査する
 *   node scripts/check-link-descriptions.mjs
 *
 *   # 比較対象のベースを変える / 特定ファイルに絞る
 *   node scripts/check-link-descriptions.mjs --base origin/main --only saa-c03
 *
 *   # git を使わず、URL を直接指定して検査する
 *   node scripts/check-link-descriptions.mjs --urls "https://a,https://b"
 *
 * オプション:
 *   --base <ref>       差分の基準（既定: main）。
 *   --only <codes>     カンマ区切りの対象ファイル名（拡張子なし）。
 *   --urls <list>      git diff を使わず、指定 URL を含むアイテムを検査する。
 *   --all              変更の有無にかかわらず全アイテムを検査する（低速・通常は不要）。
 *   --concurrency <n>  同時リクエスト数（既定: 6）。
 *
 * 出力の読み方:
 *   各アイテムについて「データ側の説明」と「リンク先ページの実際の見出し・リード文」を
 *   並べて表示します。`[!] 要確認` が付いたものは、**データ側 title の主要語がページ側に
 *   1 つも現れなかった**ものです。これは機械的なヒントに過ぎないため、最終判断は必ず
 *   人間（または LLM）が表示内容を読んで行ってください。逆に `[!]` が付かなくても
 *   ずれていることはあります。
 *
 * 注意:
 *  - 読み取り専用の HTTP GET のみを行う。AWS 系 CLI / ツールは使用しない。
 *  - NODE_OPTIONS に存在しない preload が設定されている環境では
 *    `env -u NODE_OPTIONS node ...`（bash） / `$env:NODE_OPTIONS='';`（PowerShell）で解除する。
 */

import { readdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const DATA_DIR = path.resolve('js/data');
const SKIP_FILES = new Set(['_placeholder.js', 'common-defaults.js']);

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 aws-study-linkcheck/1.0';

function parseArgs(argv) {
  const opts = { base: 'main', only: null, urls: null, all: false, concurrency: 6, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--base') opts.base = argv[++i];
    else if (a === '--only') opts.only = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--urls') opts.urls = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--all') opts.all = true;
    else if (a === '--concurrency') opts.concurrency = Number(argv[++i]) || 6;
    else if (a === '--out') opts.out = argv[++i];
    else throw new Error(`Unknown option: ${a}`);
  }
  return opts;
}

/**
 * git diff から「追加された行に現れる URL」と「変更されたファイル」を集める。
 *
 * ファイルも併せて記録するのが重要。同じ URL が複数の試験ファイルで使われている場合、
 * URL だけで絞ると**変更していないファイルのアイテムまで拾ってしまう**。
 */
function changedFromGit(base) {
  let diff;
  try {
    diff = execFileSync('git', ['diff', `${base}...HEAD`, '--unified=0', '--', 'js/data'], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    console.error(`[warn] git diff に失敗しました（--urls で直接指定してください）: ${err.message}`);
    return { urls: new Set(), files: new Set() };
  }
  const urls = new Set();
  const files = new Set();
  for (const line of diff.split('\n')) {
    const fileMatch = /^\+\+\+ b\/js\/data\/(.+)$/.exec(line);
    if (fileMatch) {
      files.add(fileMatch[1]);
      continue;
    }
    if (!line.startsWith('+') || line.startsWith('+++')) continue;
    for (const m of line.matchAll(/https?:\/\/[^'"\s,)]+/g)) urls.add(m[0]);
  }
  return { urls, files };
}

/** 深さ優先でリソースアイテムを収集する（check-resource-links.mjs と同じ考え方）。 */
function collectItems(node, ctx, out) {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) collectItems(child, ctx, out);
    return;
  }
  const next = { ...ctx };
  if (typeof node.code === 'string') next.exam = node.code;
  if (typeof node.id === 'string' && typeof node.jpTitle === 'string') next.step = `${node.id}:${node.jpTitle}`;
  if (typeof node.key === 'string' && Array.isArray(node.items)) next.group = node.key;

  if (typeof node.url === 'string' || typeof node.urlEn === 'string') {
    out.push({
      ...next,
      url: node.url ?? null,
      urlEn: node.urlEn ?? null,
      title: node.title ?? '',
      titleEn: node.titleEn ?? '',
      note: node.note ?? '',
      noteEn: node.noteEn ?? '',
      level: node.level ?? null,
      recommend: Boolean(node.recommend),
    });
  }
  for (const value of Object.values(node)) collectItems(value, next, out);
}

async function loadItems(only) {
  const entries = (await readdir(DATA_DIR)).filter((f) => f.endsWith('.js') && !SKIP_FILES.has(f)).sort();
  const targets = only ? entries.filter((f) => only.includes(path.basename(f, '.js'))) : entries;
  const items = [];
  for (const file of targets) {
    const abs = path.join(DATA_DIR, file);
    try {
      const mod = await import(pathToFileURL(abs).href);
      collectItems(mod, { file, exam: path.basename(file, '.js').toUpperCase() }, items);
    } catch (err) {
      console.error(`[load-error] ${file}: ${err.message}`);
    }
  }
  return items;
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** ページの主題を表す情報（title / h1 / リード文）を抜き出す。 */
async function fetchPageSummary(url, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'user-agent': USER_AGENT, 'accept-language': 'ja,en;q=0.8' },
    });
    const html = await res.text();
    const title = stripTags((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [, ''])[1]);
    const h1 = stripTags((/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || [, ''])[1]);
    // 本文の先頭付近から、ある程度の長さを持つ最初の段落をリード文として拾う。
    // aws.amazon.com のプロダクトページはグローバルナビや機械翻訳の注意書きが
    // 最初の段落になりやすいので、それらは読み飛ばす。
    const NAV_NOISE = [
      /Contact us/i,
      /My account/i,
      /^Filter:/i,
      /re:Invent Discover/i,
      /翻訳は機械翻訳により提供/,
      /Javascript is disabled/i,
    ];
    let lead = '';
    for (const m of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const t = stripTags(m[1]);
      if (t.length < 40) continue;
      if (NAV_NOISE.some((re) => re.test(t))) continue;
      lead = t;
      break;
    }
    return { status: res.status, finalUrl: res.url || url, title, h1, lead };
  } catch (err) {
    return { status: 0, finalUrl: url, error: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * データ側 title の「主要語」がページ側に現れるかで、ずれの候補を機械的に絞る。
 * あくまでヒントであり、判定の根拠ではない。
 */
const STOP_WORDS = new Set([
  'aws', 'amazon', 'the', 'and', 'for', 'with', 'guide', 'user', 'userguide', 'developer',
  'documentation', 'docs', 'service', 'services', 'overview', 'introduction',
  'ユーザーガイド', 'ガイド', 'ドキュメント', '公式', '概要', 'とは', 'について',
]);

function significantTokens(text) {
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[（）()［］[\]{}「」【】,、。・:：;；/｜|"'’“”?？!！]/g, ' ')
        .split(/\s+/)
        .map((t) => t.replace(/^-+|-+$/g, ''))
        .filter((t) => t.length >= 3 && !STOP_WORDS.has(t)),
    ),
  ];
}

function looksMismatched(item, page) {
  const haystack = `${page.title} ${page.h1} ${page.lead}`.toLowerCase();
  if (!haystack.trim()) return false;
  const tokens = significantTokens(`${item.titleEn || ''} ${item.title || ''}`);
  if (tokens.length === 0) return false;
  return !tokens.some((t) => haystack.includes(t));
}

async function runPool(tasks, concurrency) {
  const results = new Array(tasks.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
      while (cursor < tasks.length) {
        const i = cursor++;
        results[i] = await tasks[i]();
      }
    }),
  );
  return results;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const items = await loadItems(opts.only);

  let targetUrls = null;
  let targetFiles = null;
  if (opts.urls) {
    targetUrls = new Set(opts.urls);
  } else if (!opts.all) {
    const changed = changedFromGit(opts.base);
    targetUrls = changed.urls;
    targetFiles = changed.files;
  }

  // 検査対象は「変更されたファイル」かつ「変更された URL を含むアイテム」に限定する。
  const selected = opts.all
    ? items
    : items.filter((it) => {
        if (targetFiles && !targetFiles.has(it.file)) return false;
        return (it.url && targetUrls.has(it.url)) || (it.urlEn && targetUrls.has(it.urlEn));
      });

  const out = [];
  out.push('# link description consistency check');
  out.push(opts.all ? 'mode          : all items' : `mode          : changed links (base: ${opts.urls ? '--urls' : opts.base})`);
  out.push(`items checked : ${selected.length}`);

  if (selected.length === 0) {
    out.push('');
    out.push('リンクの変更が検出されませんでした。チェック不要です。');
    const text = `${out.join('\n')}\n`;
    if (opts.out) await writeFile(opts.out, text, 'utf8');
    else console.log(text);
    return;
  }

  // ページ取得は URL 単位で重複排除する（url と urlEn が同じ場合など）
  const pageUrls = [...new Set(selected.flatMap((it) => [it.url, it.urlEn].filter(Boolean)))];
  const pages = new Map();
  const fetched = await runPool(pageUrls.map((u) => () => fetchPageSummary(u)), opts.concurrency);
  pageUrls.forEach((u, i) => pages.set(u, fetched[i]));

  let flagged = 0;
  for (const it of selected) {
    // 日本語ページと英語ページで主題が変わることはないので、代表 1 件を突き合わせる
    const primary = it.url ?? it.urlEn;
    const page = pages.get(primary) ?? {};
    const mismatch = looksMismatched(it, page);
    if (mismatch) flagged += 1;

    out.push('');
    out.push(`${mismatch ? '[!] 要確認' : '[ ] ok    '} ${it.file} | ${it.step ?? '-'} | group=${it.group ?? '-'}`);
    out.push(`  データ側 title   : ${it.title}`);
    if (it.titleEn) out.push(`  データ側 titleEn : ${it.titleEn}`);
    if (it.note) out.push(`  データ側 note    : ${it.note}`);
    if (it.noteEn) out.push(`  データ側 noteEn  : ${it.noteEn}`);
    out.push(`  url              : ${it.url ?? '-'}`);
    if (it.urlEn && it.urlEn !== it.url) out.push(`  urlEn            : ${it.urlEn}`);
    if (page.error) {
      out.push(`  ページ           : [取得失敗] ${page.error}`);
      continue;
    }
    out.push(`  ページ title     : ${page.title || '(なし)'}`);
    out.push(`  ページ h1        : ${page.h1 || '(なし)'}`);
    out.push(`  ページ リード文  : ${(page.lead || '(なし)').slice(0, 280)}`);
    if (page.finalUrl && page.finalUrl !== primary) out.push(`  最終 URL         : ${page.finalUrl}`);
  }

  out.push('');
  out.push(`## summary`);
  out.push(`要確認（機械的ヒント）: ${flagged} / ${selected.length}`);
  out.push('');
  out.push('※ `[!]` はデータ側 title の主要語がページ側に見つからなかったことを示すヒントです。');
  out.push('   最終判断は表示内容を読んで行ってください（`[!]` が無くてもずれている場合があります）。');

  const text = `${out.join('\n')}\n`;
  if (opts.out) await writeFile(opts.out, text, 'utf8');
  else console.log(text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
