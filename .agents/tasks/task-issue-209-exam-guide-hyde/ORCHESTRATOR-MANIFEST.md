# Orchestrator manifest — open-issue processing run

This run produced committed changes on **two feature/chore branches** (one per unit of work). Nothing was pushed and no PRs were opened (per delegation: the orchestrator handles `git push` and PR creation via the GitHub CLI power). No `aws` commands were run and no `gh` writes (comments/labels) were made.

Base branch: `main` at `564b6de`. Node quirk for any local re-verification: prefix node with `env -u NODE_OPTIONS` (NODE_OPTIONS points at a non-existent preload). `npx playwright test` cannot run in-sandbox under INTEGRATIONS_ONLY (no cached browsers / no registry); pure logic was verified by importing modules with node.

---

## Branch 1 (feature): `feature/issue-209-exam-guide-hyde`

Addresses **issue #209** — make the AI-search HyDE query expansion exam-guide-informed so newer/edge AWS services (litmus test: "Quick" → Amazon QuickSight / Amazon Q) surface.

### Commits (in order)
- `f5bdcc9` chore: establish local verification baseline for issue #209 (FEAT-001)
- `32f819f` feat: AI検索のHyDEクエリ拡張を試験ガイド由来のサービス辞書で補強し、QuickSight等の新しいサービスを検索に出す (#209)
- `2b35418` chore: mark FEAT-002 complete in task state
- `a1c8a1a` chore: mark FEAT-003 complete in task state
- `636c7ae` fix: #209 レビュー指摘対応 — 辞書補強を検索リコールとAIグラウンディングに実効化し、テストを退行検知可能に
- `cd94e31` fix: #209 概念エイリアスの過剰発火を修正（クエリが概念語を含む場合のみ発火）

### ⚠️ Note for the orchestrator before opening the PR
Three commits on this branch (`f5bdcc9`, `2b35418`, `a1c8a1a`) contain **only `.agents/tasks/` task-state bookkeeping**, not product code. The task directory `.agents/tasks/task-issue-209-exam-guide-hyde/` is present on this branch. If the repo does not intend to ship `.agents/tasks/` in PRs, exclude that directory when opening the PR (e.g. `git rm -r --cached .agents/tasks/` on a tidy-up commit, or add it to `.gitignore`, per repo preference). The actual #209 product changes live in commits `32f819f`, `636c7ae`, `cd94e31` and touch only: `js/resourceSearch.js`, `js/ui.js`, `tests/exam-guide-hyde.spec.mjs`, `docs/issues/exam-guide-hyde-209.md`, `docs/index.md`.

### PR title
`feat: AI検索のHyDEを試験ガイド由来のサービス辞書で補強し、QuickSight等の新サービスを検索に出す (#209)`

### PR body (Japanese; NO `- [ ]` task-list checkboxes — plain bullets only)

Closes #209

## 変更内容
- `js/resourceSearch.js` にピュア関数を追加:
  - `buildExamKeywordCatalog(exams=ALL_EXAMS)`: 各試験データの step / task レベルの `knowledge` / `knowledgeEn` から、その試験で重要な AWS サービス名・概念キーワードを収集した辞書（catalog）を構築する。`buildResourceIndex` と同じ走査。モデルの学習時期に依存しない恒久的な出典。
  - `augmentTermsWithCatalog(terms, catalog, opts)`: HyDE の展開語（`[query, ...expandedTerms]`）に、クエリと関連する catalog エントリを足し込む。
  - `isSafeCatalogSearchTerm(entry)`: 素の `Amazon Q` のような過剰一致トークンを検索語から除外するガード。
  - `CONCEPT_SERVICE_ALIASES` + `buildAugmentedScoringQuery(terms)`: 字面が重ならない概念クエリ（例 `BIツール` → Amazon QuickSight）の小さな手動エイリアスと、グラウンディング候補選抜を拡張後 term で採点するためのクエリ生成。
- `js/ui.js`: `getExamKeywordCatalog()`（メモ化）を追加し、AI検索ハンドラで展開語を辞書補強してから `searchResourcesMulti` を実行。さらにグラウンディング候補選抜（`selectAiCandidates`）を生クエリではなく拡張後 term で採点するよう変更。`searchResourcesMulti` / `selectAiCandidates` / `scoreResourceRelevance` の本体は未変更。
- `tests/exam-guide-hyde.spec.mjs`（新規）: 辞書構築・補強・ガード・採点クエリ・概念エイリアスの単体テストと、退行検知可能な差分 end-to-end テスト。
- `docs/issues/exam-guide-hyde-209.md`（新規）/ `docs/index.md`: 実装解説と索引リンク。

## 実装方針
- #201（PR #204）でモデル任せだった HyDE 展開に、試験データ由来の「重要サービス辞書」を還元する。モデルが新サービスを出さなくても、辞書がクリーンなサービス語を供給して検索候補と AI グラウンディングに載せる。
- ピュアロジックは `js/resourceSearch.js`（DOM / ネットワーク / AI 非依存）に置き、ブラウザ限定の AI 呼び出しは `js/ui.js` に残す。既存の分離方針を踏襲。

## 考慮したトレードオフ
- リトマス `Quick` 単独は、`searchResources` が部分一致検索のため既にヒットしており、辞書補強では追加リソースが増えない（悪化ではなく現状維持）。実質的な効果は「冗長な多語クエリ」（例 `Amazon Q Developer とは` が 0 → 9 件）と「字面の重ならない概念クエリ」（`BIツール` → QuickSight）にある。これをドキュメントに正直に明記した。
- 概念→サービスの一般的な意味対応は決定的ピュア関数の範囲外。重い意味マッピングや外部依存は入れず、小さな手動エイリアスに限定した。汎用の意味検索（埋め込み等）は別 issue とする（限界を docs に明記）。
- モデルプロンプトへの辞書投入は、契約・レイテンシ・コストの複雑さを避けるため見送り、展開後の決定的補強に絞った。

## テスト / 検証結果
- 静的サイトのためビルドステップ無し。`env -u NODE_OPTIONS node --check` を `js/resourceSearch.js` / `js/ui.js` / `tests/exam-guide-hyde.spec.mjs` に対して実行 → いずれも OK。
- このサンドボックスは INTEGRATIONS_ONLY のため `npx playwright test` は実行不可（ブラウザ未キャッシュ / レジストリ非到達）。ピュア関数を `node` で直接 import して全 assertion を実行・合格を確認。CI ではブラウザ込みで Playwright が動く。
- 差分 end-to-end テストは退行検知可能であることを確認（`augmentTermsWithCatalog` を恒等関数に戻すと当該テストは落ちる）。
- AI 呼び出し（曖昧クエリ → 展開語）はブラウザ限定のため手動再現手順を `docs/issues/exam-guide-hyde-209.md` に記載。

## docs 更新
- `docs/issues/exam-guide-hyde-209.md` を新規作成し、`docs/index.md` にリンクを追加。

---

## Branch 2 (chore / self-improvement): `chore/issue-resolver-blocked-issues-index`

Repo convention (see `.kiro/agents/github-issue-resolver.md`): each issue-resolving run also improves the resolver's own mechanisms, delivered as a **separate** chore PR. This branch is created from `main` and contains ONLY docs/convention changes (no #209 code).

### Commit
- `efbf78d` chore: 人間/AWS対応待ちで恒久ブロック中のissue索引を追加し再トリアージの重複を削減 (#32, #162, #167)

Files: `docs/wiki/blocked-issues-index.md` (new), `.kiro/agents/github-issue-resolver.md`, `docs/wiki/efficiency-log.md`, `docs/wiki/README.md`, `docs/index.md`.

### PR title
`chore: 人間/AWS対応待ちで恒久ブロック中のissue索引を追加し再トリアージの重複を削減`

### PR body (Japanese; NO `- [ ]` task-list checkboxes)

Refs #32, #162, #167

## 変更内容
- `docs/wiki/blocked-issues-index.md`（新規）: 人間 / AWS 対応が本質的に必要で恒久的にブロックされている open issue の索引。#32（グローバルリーダーボード: DynamoDB+Lambda+API Gateway）/ #162（アカウント不要の issue 投稿: Lambda プロキシ）/ #167（フィードバック分析: Lambda→DynamoDB + QuickSight）を、ブロッカー種別・理由・解除に必要な人間/AWS操作・`docs/action-required/` へのポインタ付きで登録。
- `.kiro/agents/github-issue-resolver.md`: 棚卸し手順に「まず本索引を参照し、記載 issue は記録日以降に新しい人間入力が無ければ再トリアージしない」という**追加ゲート**を明記（既存の制約は一切緩めない）。
- `docs/wiki/efficiency-log.md`: 日付付きの振り返りエントリを追加（根本原因 / 対策 / 期待効果 / 「制約緩和なし」）。
- `docs/wiki/README.md` / `docs/index.md`: ページ一覧・索引を同一コミットで更新（デッドリンク・孤立ファイル無し）。

## 実装方針
- 毎回の実行で #32 / #162 / #167 について「AWS バックエンドが必要 → スキップ」を LLM が再導出していた（#32 では重複スキップコメントが蓄積）。恒久的な単一の索引を設け、まずそこを参照させることで再推論・トークン消費を削減する。既存の `agent:skipped` ラベル機構を置き換えるのではなく補完する。

## 考慮したトレードオフ
- 索引は人間レビュー前提の手動メンテとする（自動生成は今回のスコープ外）。issue の状況が変われば `更新履歴` で更新する運用。
- 追加は「制約の追加・明確化」であり、AWS 操作禁止・main 直 push 禁止・force push 禁止・秘密情報非コミットなどの既存禁止事項は緩めない。`permissions.rules` も未変更。

## テスト / 検証結果
- ドキュメント / 規約のみの変更（JS/JSON なし）。`git status --short` で意図したファイルのみが変更されていることを確認。相対リンク先の存在を確認。GitHub タスクリスト記法（`- [ ]`）は不使用。
- `aws` コマンド・`gh` 書き込みは一切実行していない。

---

## Issues intentionally skipped this run (one-line reason each)
- **#190** — already has an open PR (#195). Skip new PR (no unaddressed comments observed in triage).
- **#193** — already has an open PR (#206). Skip.
- **#202** — already has an open PR (#203). Skip.
- **#200** — already resolved via merged PR #205 (exam-date countdown). Skip.
- **#197** — already handled via merged PR #207 (multilanguage: a requires-human assessment doc; full translation is human/product work). Skip.
- **#201** — already resolved via merged PR #204 (HyDE search); #209 builds on it. Skip.
- **#167** — requires AWS backend (Lambda→DynamoDB feedback pipeline + QuickSight). ⚠️ 要人間対応. No `aws` commands run. Recorded in `docs/wiki/blocked-issues-index.md`.
- **#162** — requires AWS backend (Lambda proxy for account-less issue posting). ⚠️ 要人間対応. Recorded in the blocked-issues index.
- **#32** — requires AWS backend (global leaderboard: DynamoDB + Lambda + API Gateway). ⚠️ 要人間対応. Recorded in the blocked-issues index.

## ⚠️ 要人間対応 items
- #167 / #162 / #32 need AWS resource provisioning that this agent must not perform. Details (needed operations / target resources / intended approach) are captured in `docs/wiki/blocked-issues-index.md` and existing `docs/action-required/` artifacts. When opening/refreshing skip notes for these, follow the repo's `agent:skipped` marker convention (do NOT add a duplicate skip comment if the marker already exists with no new human input).
