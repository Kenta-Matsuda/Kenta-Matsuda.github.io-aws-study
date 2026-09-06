/**
 * scripts/analyze-resource-coverage.mjs
 *
 * 試験ガイドのタスクステートメント単位で「リソースが足りているか」を機械的に洗い出す
 * カバレッジ分析ツール。リンクの死活を見る scripts/check-resource-links.mjs とは目的が
 * 異なり、こちらは **量と多角性の不足** を検出する。
 *
 * 背景（docs/wiki/aws-resource-discovery.md「試験ガイド文言ドリブンの探索手順」）:
 *  - 手作業で作った ANS-C01 は 1 タスクあたり items 6〜14 件だが、他試験は 2〜4 件で
 *    止まっており、タスクステートメントの掘り込みが浅い。
 *  - 方針は「AWS ドキュメントに良いものが無い」で諦めず、多角的に探して
 *    **1 タスクにつき最低 1 件、原則 3 件以上**を確保すること。
 *  - どのタスクが薄いのかを LLM が毎回データファイル全文を読んで判断するのは高コストなので、
 *    ここで機械的に順位付けし、LLM は上位だけを読む。
 *
 * 使い方:
 *   node scripts/analyze-resource-coverage.mjs
 *   node scripts/analyze-resource-coverage.mjs --only saa-c03,aib-c01
 *   node scripts/analyze-resource-coverage.mjs --min 3 --top 30
 *   node scripts/analyze-resource-coverage.mjs --md test-results/coverage.md
 *   node scripts/analyze-resource-coverage.mjs --json test-results/coverage.json
 *
 * オプション:
 *   --only <codes>  カンマ区切りの対象ファイル名（拡張子なし）。既定は全件。
 *   --min <n>       「薄い」と判定する items のしきい値（既定: 3。n 未満を薄いとみなす）。
 *   --top <n>       薄いタスクの表示件数（既定: 25）。
 *   --md <path>     Markdown レポートを UTF-8 で書き出す（PowerShell の文字化けを避けられる）。
 *   --json <path>   詳細結果を JSON で書き出す。
 *
 * 注意:
 *  - ネットワークアクセスは一切行わない（データファイルの静的解析のみ）。
 *  - NODE_OPTIONS に存在しない preload が設定されている環境では
 *    `env -u NODE_OPTIONS node ...`（bash）/ `$env:NODE_OPTIONS=''`（PowerShell）で解除する。
 */

import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const DATA_DIR = path.resolve('js/data');
const SKIP_FILES = new Set(['_placeholder.js', 'common-defaults.js', 'common-steps.js', 'daily-challenge.js']);

function parseArgs(argv) {
  const args = { only: null, min: 3, top: 25, md: null, json: null };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--only') args.only = new Set(String(argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean));
    else if (arg === '--min') args.min = Number(argv[++i]);
    else if (arg === '--top') args.top = Number(argv[++i]);
    else if (arg === '--md') args.md = argv[++i];
    else if (arg === '--json') args.json = argv[++i];
    else throw new Error(`Unknown option: ${arg}`);
  }
  return args;
}

/**
 * リソースの「種類」を URL から推定する。同じタスクに同種のリンクしか無い場合を
 * 「多角性が足りない」として検出するために使う。
 */
function classifyKind(url) {
  if (typeof url !== 'string' || url === '') return 'unknown';
  let host = '';
  let pathname = '';
  try {
    const u = new URL(url);
    host = u.hostname;
    pathname = u.pathname;
  } catch {
    return 'unknown';
  }
  if (host === 'docs.aws.amazon.com') return 'doc';
  if (host === 'd1.awsstatic.com') return 'blackbelt';
  if (host === 'repost.aws') return 'repost';
  if (host.endsWith('skillbuilder.aws')) return 'training';
  if (host === 'www.aws.training' || host === 'aws.training') return 'training';
  if (host === 'www.wellarchitectedlabs.com') return 'lab';
  if (host === 'aws.amazon.com') {
    const p = pathname.replace(/^\/jp(?=\/|$)/, '');
    if (p.includes('/blogs/')) return url.includes('blackbelt') ? 'blackbelt' : 'blog';
    if (p.startsWith('/whats-new')) return 'whats-new';
    if (p.startsWith('/architecture')) return 'architecture';
    if (p.startsWith('/certification') || p.startsWith('/training')) return 'training';
    if (p.startsWith('/whitepapers') || p.includes('/whitepapers/')) return 'whitepaper';
    if (p.startsWith('/builders-library')) return 'builders-library';
    return 'product';
  }
  return 'other';
}

function collectItems(task) {
  const groups = Array.isArray(task.resources) ? task.resources : [];
  const items = [];
  for (const group of groups) {
    for (const item of group.items ?? []) {
      items.push({ ...item, groupKey: group.key ?? '', groupLabel: group.label ?? '' });
    }
  }
  return { groups, items };
}

const args = parseArgs(process.argv);
const files = (await readdir(DATA_DIR))
  .filter((name) => name.endsWith('.js') && !SKIP_FILES.has(name))
  .filter((name) => !args.only || args.only.has(name.replace(/\.js$/, '')))
  .sort();

const exams = [];

for (const name of files) {
  const mod = await import(pathToFileURL(path.join(DATA_DIR, name)).href);
  const exam = Object.values(mod).find((value) => value && typeof value === 'object' && Array.isArray(value.steps));
  if (!exam) continue;

  const tasks = [];
  for (const domain of exam.domains ?? []) {
    for (const task of domain.tasks ?? []) {
      const { groups, items } = collectItems(task);
      const kinds = new Set(items.map((item) => classifyKind(item.url || item.urlEn)));
      tasks.push({
        exam: exam.code,
        file: name,
        domainId: domain.id,
        domainTitle: domain.jpTitle ?? domain.title ?? '',
        weight: domain.weight ?? null,
        taskId: task.id ?? '',
        taskTitle: (task.jpTitle ?? task.title ?? '').trim(),
        groupCount: groups.length,
        itemCount: items.length,
        kinds: [...kinds].sort(),
        kindCount: kinds.size,
        knowledgeCount: Array.isArray(task.knowledge) ? task.knowledge.length : 0,
        recommendCount: items.filter((item) => item.recommend).length,
      });
    }
  }

  const counts = tasks.map((task) => task.itemCount).sort((a, b) => a - b);
  const median = counts.length === 0 ? 0 : counts[Math.floor(counts.length / 2)];
  exams.push({
    code: exam.code,
    file: name,
    taskCount: tasks.length,
    itemTotal: counts.reduce((a, b) => a + b, 0),
    itemMin: counts[0] ?? 0,
    itemMax: counts[counts.length - 1] ?? 0,
    itemMedian: median,
    zeroTasks: tasks.filter((task) => task.itemCount === 0).length,
    thinTasks: tasks.filter((task) => task.itemCount < args.min).length,
    singleKindTasks: tasks.filter((task) => task.itemCount > 0 && task.kindCount === 1).length,
    tasks,
  });
}

const allTasks = exams.flatMap((exam) => exam.tasks);
const ranked = [...allTasks].sort(
  (a, b) => a.itemCount - b.itemCount || b.knowledgeCount - a.knowledgeCount || a.exam.localeCompare(b.exam),
);
const benchmark = exams.find((exam) => exam.code === 'ANS-C01');

const lines = [];
lines.push('# タスクステートメント単位のリソースカバレッジ');
lines.push('');
lines.push(`- 集計日時: ${new Date().toISOString()}`);
lines.push(`- しきい値: items < ${args.min} を「薄い」と判定`);
if (benchmark) lines.push(`- 基準（手作業で作られた ANS-C01）: 中央値 ${benchmark.itemMedian} 件 / 最小 ${benchmark.itemMin} 件 / 最大 ${benchmark.itemMax} 件`);
lines.push('');
lines.push('## 試験別サマリ');
lines.push('');
lines.push('| 試験 | タスク数 | items 合計 | 中央値 | 最小 | 最大 | 0 件 | 薄い | 単一種別のみ |');
lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const exam of [...exams].sort((a, b) => a.itemMedian - b.itemMedian)) {
  lines.push(
    `| ${exam.code} | ${exam.taskCount} | ${exam.itemTotal} | ${exam.itemMedian} | ${exam.itemMin} | ${exam.itemMax} | ${exam.zeroTasks} | ${exam.thinTasks} | ${exam.singleKindTasks} |`,
  );
}
lines.push('');
lines.push(`## 補強優先タスク（items が少ない順・上位 ${args.top} 件）`);
lines.push('');
lines.push('| 試験 | タスク | items | 種別数 | 種別 | knowledge |');
lines.push('| --- | --- | --- | --- | --- | --- |');
for (const task of ranked.slice(0, args.top)) {
  lines.push(
    `| ${task.exam} | ${task.taskId} ${task.taskTitle.slice(0, 48)} | ${task.itemCount} | ${task.kindCount} | ${task.kinds.join('/') || '-'} | ${task.knowledgeCount} |`,
  );
}
const report = `${lines.join('\n')}\n`;

console.log(`exams=${exams.length} tasks=${allTasks.length}`);
console.log(`zero-item tasks   : ${allTasks.filter((t) => t.itemCount === 0).length}`);
console.log(`thin tasks (<${args.min})  : ${allTasks.filter((t) => t.itemCount < args.min).length}`);
console.log(`single-kind tasks : ${allTasks.filter((t) => t.itemCount > 0 && t.kindCount === 1).length}`);
for (const exam of [...exams].sort((a, b) => a.itemMedian - b.itemMedian)) {
  console.log(
    `  ${exam.code.padEnd(9)} tasks=${String(exam.taskCount).padStart(2)} items=${String(exam.itemTotal).padStart(3)} ` +
      `median=${String(exam.itemMedian).padStart(2)} min=${String(exam.itemMin).padStart(2)} max=${String(exam.itemMax).padStart(2)} ` +
      `thin=${String(exam.thinTasks).padStart(2)} singleKind=${String(exam.singleKindTasks).padStart(2)}`,
  );
}

async function writeOut(target, contents) {
  await mkdir(path.dirname(path.resolve(target)), { recursive: true });
  await writeFile(target, contents, 'utf8');
  console.log(`Wrote ${target}`);
}

if (args.md) await writeOut(args.md, report);
if (args.json) await writeOut(args.json, `${JSON.stringify({ generatedAt: new Date().toISOString(), min: args.min, exams }, null, 2)}\n`);
