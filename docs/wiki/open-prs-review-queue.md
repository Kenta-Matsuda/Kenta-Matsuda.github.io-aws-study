# レビュー待ちオープン PR キュー

- 最終更新日: 2026-09-15
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

合計: 9 件 / 内訳: blocked=9

## オープン PR 一覧

| PR | タイトル | head → base | mergeable_state | 紐づく issue |
| --- | --- | --- | --- | --- |
| #195 | fix: AIB-C01 タスク1.1の日本語名を試験ガイド準拠に修正 (#190) | `fix/issue-190-aib-task-1-1-name` → `main` | `blocked`（レビュー・チェック待ち） | #190 |
| #203 | fix: AIチャットに現在のAWSサービス名を優先させるグラウンディング強化 (#202) | `fix/issue-202-ai-chat-service-naming-grounding` → `main` | `blocked`（レビュー・チェック待ち） | #202 |
| #206 | feat: ローカルミッション（デイリー/ウィークリー/マンスリー）とXP付与を追加 (#193) | `feature/issue-193-local-missions` → `main` | `blocked`（レビュー・チェック待ち） | #193 |
| #210 | feat: AI検索のHyDEを試験ガイド由来のサービス辞書で補強し、QuickSight等の新サービスを検索に出す (#209) | `feature/issue-209-exam-guide-hyde` → `main` | `blocked`（レビュー・チェック待ち） | #209 |
| #211 | chore: 人間/AWS対応待ちで恒久ブロック中のissue索引を追加し再トリアージの重複を削減 | `chore/issue-resolver-blocked-issues-index` → `main` | `blocked`（レビュー・チェック待ち） | #32 |
| #212 | docs: グローバルリーダーボード(#32)のDynamoDBコスト試算に中位シナリオとus-east-1単価を追記 | `docs/issue-32-dynamodb-cost-estimate-3tier` → `main` | `blocked`（レビュー・チェック待ち） | #32 |
| #213 | chore: issue-resolver のトリアージ detached 実行・SKIP 隠れ依頼・試験ガイド Web 移行を制度化 | `chore/issue-resolver-triage-and-skip-lessons` → `main` | `blocked`（レビュー・チェック待ち） | （紐づく issue なし） |
| #214 | feat: i18n コアを N ロケール対応に一般化 (Refs #197) | `feature/issue-197-i18n-core-multilocale` → `main` | `blocked`（レビュー・チェック待ち） | #197 |
| #215 | chore: 実行の振り返りと『エージェント可サブタスクの切り出し』ルールを恒久化 | `chore/issue-resolver-ship-agent-doable-subtasks` → `main` | `blocked`（レビュー・チェック待ち） | #197 |

## 更新履歴

- 2026-09-15: `scripts/list-open-prs.mjs` により生成 / 更新。
