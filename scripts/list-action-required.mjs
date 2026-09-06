#!/usr/bin/env node
/**
 * list-action-required.mjs — docs/action-required/ の要人間対応事項を走査し、
 * リポジトリ上で一目で分かる「チェックリスト一覧」を生成する（読み取り専用）。
 *
 * 背景 / 目的（issue #184）:
 *   人間側の要対応事項（AWS 操作など、エージェントが実行できない作業）が
 *   docs/action-required/ に構造化されているが、README の箇条書きだけでは
 *   「未対応がいくつ残っているか」「何が終わったか」をチェックリストとして
 *   俯瞰しづらかった。本スクリプトは各ファイルの冒頭ステータス行・タイトル・
 *   種別・関連 issue を機械的に抽出し、チェックボックス付きの一覧を出力する。
 *
 * 使い方:
 *   node scripts/list-action-required.mjs            # チェックリストを標準出力へ
 *   node scripts/list-action-required.mjs --write     # docs/action-required/CHECKLIST.md へ書き出す
 *   node scripts/list-action-required.mjs --check      # CHECKLIST.md が最新かを検証（差分あれば exit 1）
 *   node scripts/list-action-required.mjs --help
 *
 * 副作用:
 *   --write 指定時のみ docs/action-required/CHECKLIST.md を上書きする。
 *   それ以外は読み取り専用（ファイルを変更しない）。外部通信・依存なし（Node 標準のみ）。
 *
 * ステータスの解釈:
 *   ファイル冒頭付近の行に含まれる絵文字でチェック状態を決める。
 *     🔴 / 未対応 → [ ]（未対応）
 *     🟡 / 対応中 → [ ]（対応中。未完了なので未チェック）
 *     🟢 / ✅ / 完了 → [x]（完了）
 *   完了したものは README/運用フロー上ディレクトリから消える想定だが、
 *   残っていても正しく [x] として扱えるようにしている。
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const DIR = join(REPO_ROOT, 'docs', 'action-required');
const OUT_FILE = join(DIR, 'CHECKLIST.md');

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  const banner = readFileSync(fileURLToPath(import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.startsWith(' *') || l.startsWith('/**'))
    .join('\n');
  console.log(banner);
  process.exit(0);
}

/**
 * ステータスを判定して checkbox 状態を返す。
 * タイトル行（`# ...`）は「完了時のプッシュ通知」のように本文語として「完了」を
 * 含みうるため判定対象から除外し、冒頭の**専用ステータス行の絵文字**だけで判定する。
 * ステータス行は README のテンプレートどおり行頭が 🔴 / 🟡 / 🟢 / ✅ で始まる。
 */
function statusOf(text) {
  const lines = text.split('\n').slice(0, 10);
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('#')) continue; // skip the title heading
    if (/^(🟢|✅)/.test(line)) return { checked: true, label: '✅ 完了' };
    if (/^🟡/.test(line)) return { checked: false, label: '🟡 対応中' };
    if (/^🔴/.test(line)) return { checked: false, label: '🔴 未対応（要対応）' };
  }
  return { checked: false, label: '❔ 状態不明' };
}

/** 先頭の `# タイトル` を取り出す。無ければファイル名。 */
function titleOf(text, fallback) {
  const m = text.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1].trim() : fallback;
}

/** 冒頭付近の `- 種別:` 行を取り出す。 */
function kindOf(text) {
  const m = text.match(/^-\s*種別:\s*(.+?)\s*$/m);
  return m ? m[1].trim() : '';
}

/** 冒頭付近の `- 関連:` 行、または本文中の #番号 を取り出す。 */
function relatedOf(text) {
  const m = text.match(/^-\s*関連:\s*(.+?)\s*$/m);
  if (m) return m[1].trim();
  const nums = [...text.slice(0, 400).matchAll(/#(\d+)/g)].map((x) => '#' + x[1]);
  return [...new Set(nums)].join(' ');
}

function build() {
  const files = readdirSync(DIR)
    .filter((f) => f.endsWith('.md') && f !== 'README.md' && f !== 'CHECKLIST.md')
    .sort();

  const items = files.map((f) => {
    const text = readFileSync(join(DIR, f), 'utf8');
    const fallback = f.replace(/\.md$/, '');
    return {
      file: f,
      title: titleOf(text, fallback),
      status: statusOf(text),
      kind: kindOf(text),
      related: relatedOf(text),
    };
  });

  const open = items.filter((i) => !i.status.checked);
  const done = items.filter((i) => i.status.checked);
  const today = new Date().toISOString().slice(0, 10);

  const lines = [];
  lines.push('# 要人間対応チェックリスト');
  lines.push('');
  lines.push(`- 最終更新日: ${today}`);
  lines.push('- 対象範囲: `docs/action-required/` にある人間側の要対応事項（AWS 操作など、エージェントが実行できない作業）を、リポジトリ上で俯瞰できるチェックリストにしたもの');
  lines.push('- 生成元: `scripts/list-action-required.mjs`（各ファイルの冒頭ステータス行・タイトル・種別・関連 issue を機械的に抽出）。`node scripts/list-action-required.mjs --write` で再生成できます。手で編集せず、元ファイルを直してから再生成してください。');
  lines.push('- 出典/参照: issue #184 / `docs/action-required/README.md`');
  lines.push('');
  lines.push(`未対応: ${open.length} 件 / 完了: ${done.length} 件 / 合計: ${items.length} 件`);
  lines.push('');
  lines.push('## 未対応（要対応）');
  lines.push('');
  if (open.length === 0) {
    lines.push('- （現在、未対応の要人間対応事項はありません）');
  } else {
    for (const i of open) {
      const rel = i.related ? ` — 関連: ${i.related}` : '';
      const kind = i.kind ? ` / 種別: ${i.kind}` : '';
      lines.push(`- [ ] [${i.title}](${i.file}) — ${i.status.label}${kind}${rel}`);
    }
  }
  lines.push('');
  lines.push('## 完了');
  lines.push('');
  if (done.length === 0) {
    lines.push('- （完了済みの項目はここに移動します。完了した要対応事項は原則ディレクトリから削除し確定ドキュメントへ移す運用ですが、残っている場合はここに [x] で表示されます）');
  } else {
    for (const i of done) {
      const rel = i.related ? ` — 関連: ${i.related}` : '';
      lines.push(`- [x] [${i.title}](${i.file})${rel}`);
    }
  }
  lines.push('');
  lines.push('## 更新履歴');
  lines.push('');
  lines.push(`- ${today}: \`scripts/list-action-required.mjs\` により生成 / 更新。`);
  lines.push('');
  return lines.join('\n');
}

const content = build();

if (args.includes('--write')) {
  writeFileSync(OUT_FILE, content, 'utf8');
  console.error(`wrote ${OUT_FILE}`);
} else if (args.includes('--check')) {
  let current = '';
  try {
    current = readFileSync(OUT_FILE, 'utf8');
  } catch {
    /* missing file → treat as out of date */
  }
  // 「最終更新日」「更新履歴」の日付行は生成日で変わるため、比較からは日付を除外する。
  const strip = (s) => s.replace(/最終更新日: \d{4}-\d{2}-\d{2}/, 'DATE').replace(/^- \d{4}-\d{2}-\d{2}:.*$/gm, '- DATE:');
  if (strip(current) !== strip(content)) {
    console.error('CHECKLIST.md is out of date. Run: node scripts/list-action-required.mjs --write');
    process.exit(1);
  }
  console.error('CHECKLIST.md is up to date.');
} else {
  process.stdout.write(content);
}
