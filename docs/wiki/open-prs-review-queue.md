# レビュー待ちオープン PR キュー

- 最終更新日: 2026-11-02
- 対象範囲: `Kenta-Matsuda/Kenta-Matsuda.github.io-aws-study` のすべてのオープン PR を、マージ可能状態（`mergeable_state`）と紐づく issue とともに一覧化したもの。とくに完成済みだがレビュー / マージ待ちで滞留している PR を俯瞰するための索引
- 生成元: `scripts/list-open-prs.mjs`（`gh api` の GET のみで各オープン PR の `mergeable_state` を取得）。`node scripts/list-open-prs.mjs --write` で再生成できます。手で編集せず、スクリプトを実行して再生成してください。
- 出典/参照: `.kiro/agents/github-issue-resolver.md` / `scripts/list-open-prs.mjs` / `docs/wiki/README.md`

> レビュー待ちで滞留しているオープン PR をメンテナが俯瞰できるようにするための機械生成索引です。ページスキーマ（メタデータ + 更新履歴）は [README](README.md) を参照してください。

## mergeable_state の区分

- `clean`（マージ可）: レビュー / チェックを満たしマージできる状態。
- `blocked`（レビュー・チェック待ち）: コンフリクトではなく、レビュー / 必須チェック待ちで滞留している状態。**このキューの主対象**。
- `behind`（main に遅れ）: 最新 `main` の取り込み（マージ）が必要。
- `dirty`（コンフリクト）: `main` と衝突。コンフリクト解消が必要。
- `unstable` / `has_hooks`: チェック進行中 / 一部失敗、またはフックあり。
- `unknown`（判定中）: GitHub が計算中（`mergeable` が `null`）。

合計: 2 件 / 内訳: blocked=2

## オープン PR 一覧

| PR | タイトル | head → base | mergeable_state | 紐づく issue |
| --- | --- | --- | --- | --- |
| #242 | feat: オプトイン制のグローバル XP ランキング（毎日/毎週/毎月/累計）を追加 | `feat/global-leaderboard-32` → `main` | `blocked`（レビュー・チェック待ち） | #32 |
| #243 | feat: AWS ドキュメント対応 9 言語を追加し、AI 生成コンテンツを選択言語で出力する（#197 フェーズ 1） | `feat/i18n-aws-docs-locales-197` → `main` | `blocked`（レビュー・チェック待ち） | （紐づく issue なし） |

## 更新履歴

- 2026-11-02: `scripts/list-open-prs.mjs` により生成 / 更新。
