# issue 解決プレイブック

- 最終更新日: 2026-09-06
- 対象範囲: `github-issue-resolver` エージェント（`.kiro/agents/github-issue-resolver.md`）が open issue を棚卸し・実装・PR 化する際の既知の落とし穴・判定基準・再利用可能なコマンド・リポジトリ固有の勘所
- 出典/参照: `.kiro/agents/github-issue-resolver.md` / `docs/wiki/efficiency-log.md` / issue #32 #109 #137 #138 / PR #113 #114 #139

> このページは、issue 対応を実行するたびに得た知見を追記・更新して育てる Wiki ページです。**着手前に必ず「既知の落とし穴」に目を通してください。** スキーマ（メタデータ + 更新履歴）は [README](README.md) を参照してください。

## 使い方（エージェント向け）

1. バッチ着手前に本ページの「既知の落とし穴」と「判定基準」を読む。
2. 棚卸しは `scripts/issue-triage.mjs` の要約から始める（「再利用可能なコマンド」節）。
3. 実行後、新しく踏んだ落とし穴・確立した判定基準・作ったコマンドを本ページへ追記し、最終更新日と更新履歴を更新する。
4. 「同じ失敗が二度起きうる」レベルの知見は、本ページに留めず**エージェントのプロンプト本体にも書き戻す**（配置場所も含めて設計する）。

## 既知の落とし穴（アンチパターン）

### A-1: PR のコメントを読まずにスキップ判断をした

- **何が起きたか**: 「対象 issue にオープン PR があるから重複回避のためスキップ」と判断し、その PR に付いていたユーザーのエスカレーション済みコメントを読まなかった。結果、PR #114（issue #32）/ PR #113（issue #109）のフィードバックが未対応で滞留した。
- **根本原因**: コメントファーストの指針が運用マニュアルの下層（「既存オープン PR の新規コメント対応」節）に埋もれており、参照されなかった。
- **恒久対策**: コメントファーストを**手順の先頭の無条件ゲート**へ移設。さらに `scripts/issue-triage.mjs` で 3 種のコメント（ディスカッション / インライン / レビュー）と未対応判定を機械的に検出できるようにした。
- **教訓（一般化）**: 遵守されなかったルールは、文言を強めるより先に**参照される位置へ移す**。可能なら**機械判定に落とす**。

### A-2: 「静的サイトだからバックエンド必須 / 実現不能」と短絡した

- **何が起きたか**: 設計ドキュメント横断で「静的サイトなので MCP / 外部連携は不可」と繰り返し記述していた。
- **なぜ誤りか**: 本リポジトリの `js/gemini.js` は既にブラウザの `fetch()` から `https://generativelanguage.googleapis.com` を直接呼んでいる。自前バックエンドが無くてもリモート HTTP エンドポイントは呼べる。
- **恒久対策**: 実現不能と書く前に「ブラウザから直接呼べないか」を評価し、残存ブロッカーを **CORS / 認証（API キーの取り扱い）/ レート制限**として具体化する。
- **教訓（一般化）**: 「アーキテクチャ的に無理」と書きたくなったら、**そのアーキテクチャで既に動いている実例がコードベース内に無いか**を先に探す。

### A-3: 外部の事実を検証せずに「不可能」と断定した / その反動で「可能」と断定した

- **何が起きたか**: ネットワーク遮断環境（INTEGRATIONS_ONLY）で外部ドキュメントを取得できないことを理由に「実現不能」と断定した。A-2 の是正後は逆方向に振れ、「リモートなら呼べるはず」と推論だけで書き換えた。同じ日に正反対の断定を両方していた。
- **実測結果**: AWS 公式のリモート MCP（`knowledge-mcp.global.api.aws` / `aws-mcp.us-east-1.api.aws`）は CORS の制約でブラウザから `tools/call` できない。`curl` 3 本（`initialize` / `tools/call` / `OPTIONS`）で確定した。
- **恒久対策**: 可否はどちらの向きでも推論で決めず、`Origin` 付きの実リクエストと `OPTIONS` プリフライトの**実測**で決める。実測できない環境では `要確認` に留め、実測できる環境に移った時点で最優先に確定させる。再現コマンドは設計ドキュメントに残す（PR #139 で追加中の `docs/action-required/issue-138-ai-chat-exam-grounding.md` に記載）。
- **教訓（一般化）**: 1 回の `curl` で決着する問いに、推論と文書書き換えの往復を費やさない。

### A-4: 同一 issue に新規 PR を重ねて、再レビュー待ちを滞留させた

- **何が起きたか**: `[Feedback]` 系 issue ごとに新しい PR を次々に立て、いずれもメンテナの再レビュー待ちで止まった。
- **恒久対策**: マージ済み / クローズ済みでない限り、**新規 PR より既存オープン PR ブランチの更新を優先**する。関連する `[Feedback]` issue が内容的に重複する場合は関連オープン PR 番号を把握・明記し、重複 PR を作らない。

### A-5: PR 本文に GitHub タスクリスト記法を使い、進捗を誤表示させた

- **何が起きたか**: PR 本文の Checklist に `- [ ]` を使ったため、GitHub が横断集計して「7/11 tasks completed」のように実装進捗として表示した。
- **恒久対策**: PR 本文では通常の箇条書き（`- ...`）を使う。チェックボックスは `.agents/tasks/` 等の実装計画側だけで使う。

### A-6: 同じ判定を毎回 LLM が自然言語で処理していた

- **何が起きたか**: open issue と関連 PR のコメント突き合わせを毎回 LLM が生 JSON から読み下していた。トークンを大量に消費し、しかも A-1 の見落としを防げなかった。
- **実測**: `issues?state=open` と `pulls?state=all` の生 JSON 2 本だけで約 221 万文字。`scripts/issue-triage.mjs` の要約は同じ判定材料を約 7.9 KB（open issue 12 件・関連 PR の未対応コメント検出込み）に圧縮した。
- **恒久対策**: 決定論的に判定できるものはスクリプトへ寄せ、LLM は要約だけを読む。

## 判定基準

### 棚卸しの分岐（`scripts/issue-triage.mjs` の判定値と対応）

| 判定値 | 意味 | 取るべき行動 |
|---|---|---|
| `PR_FOLLOWUP` | 既存オープン PR に未対応コメントあり | **最優先。** 新規 PR を作らず既存 head ブランチを更新し、対応後 `🤖 対応済み` コメントを残す |
| `RECHECK` | `agent:skipped` マーカー付与後に更新あり | 除外を解除して通常調査へ戻す。依然不可なら判断コメントを付け直す |
| `TRIAGE` | 通常の調査対象 | 影響範囲が小さく判断が明確なものから着手 |
| `OPEN_PR` | オープン PR あり・未対応コメントなし | 新規 PR は作らない（重複回避）。スキップ理由として報告 |
| `SKIP` | マーカー付与後に更新なし | 再調査しない。スキップ一覧に載せる |

### スキップしてよい / いけない

- **してよい**: (a) issue の記述だけでは実装対象が特定できない（`着手不能（情報不足）`）、(b) AWS 操作など人間しかできない対応が本質的に必要（`要人間対応`。ただし `docs/action-required/` の成果物とクライアント側で前進できた分の PR は出す）。
- **いけない**: (a) オープン PR があるだけの理由、(b) end-to-end 検証ができないだけの理由、(c) 外部事実を確認できないだけの理由。

### 実装可否の見極め

- クライアントサイド（ブラウザ）で前進できる部分と、本当にサーバ側が必要な部分を**切り分けて**扱う。前者は出荷し、後者だけを `docs/action-required/` に残す。
- 外部エンドポイント依存は実測で確定（A-3）。未実測なら `要確認` と明記して前進部分を切り離す。

## 再利用可能なコマンド

### トリアージ（まずこれ）

```
env -u NODE_OPTIONS node scripts/issue-triage.mjs                 # 全 open issue の Markdown 要約
env -u NODE_OPTIONS node scripts/issue-triage.mjs --issue 138,32   # 対象を限定
env -u NODE_OPTIONS node scripts/issue-triage.mjs --json           # 機械可読 JSON
env -u NODE_OPTIONS node scripts/issue-triage.mjs --help           # オプション一覧
```

読み取り専用（`gh api` の GET のみ）。マーカー検出は本文接頭辞 `🤖 agent:skipped` / `🤖 対応済み` に依存するため、コメント時は必ず規定の接頭辞を使う。

同じ「スクリプト + 要約読み込み」方針で `exam-content-maintainer` が育てた資産も流用できる: `scripts/check-resource-links.mjs`（リソース URL の死活・リダイレクト一覧）、`scripts/collect-resource-urls.mjs`（URL 件数・ドメイン内訳の集計）、`scripts/list-aws-doc-pages.mjs`（AWS 公式ガイド内の下位ページ列挙）。

### GitHub（REST の `gh api` のみ。高レベル `gh issue` / `gh pr` は GraphQL 依存で失敗する）

```
# open issue 一覧（PR を除外）
gh api "repos/{owner}/{repo}/issues?state=open&per_page=100" --jq '.[] | select(.pull_request == null) | {number, title}'

# PR 作成
gh api repos/{owner}/{repo}/pulls -f title="..." -f body="..." -f head="{branch}" -f base="main"

# スキップマーカー（ラベル + 判断コメント）
gh api repos/{owner}/{repo}/issues/{n}/labels -f "labels[]=agent:skipped"
gh api repos/{owner}/{repo}/issues/{n}/comments -f body="🤖 agent:skipped — 判断種別: ..."
```

### 静的検証（ビルドステップは無い）

```
env -u NODE_OPTIONS node --check <file.js>
env -u NODE_OPTIONS node -e "JSON.parse(require('fs').readFileSync('<file.json>','utf8'))"
```

`npm test` はプレースホルダで必ず失敗するため使わない。`NODE_OPTIONS` は存在しない preload を指しているため node 系コマンドは `env -u NODE_OPTIONS` で前置きする。

## リポジトリ固有の勘所

- **ビルドステップが無い**ため、検証は構文チェック + Playwright + 目視レビューが基本。
- **i18n**: `js/locales/ja.json` と `en.json` は**キー集合を相互ミラー**に保つ。片方だけにキーを足さない。
- **共通データ**: `js/data/common-steps.js` は全試験に波及する。変更時は影響範囲を明示する。
- **AI プロバイダ**: `js/ai.js` がファサード、`js/gemini.js` / `js/openai.js` が実装。ブラウザから直接 LLM を呼ぶ構成（A-2 の根拠）。
- **docs の索引**: `docs/index.md` は同じ PR で必ず更新する。デッドリンク・孤立ファイルを作らない。

## 更新履歴

- 2026-09-06: 初版作成。`github-issue-resolver` を自己改善型へ再構成した際に、これまで `docs/wiki/efficiency-log.md` とエージェントプロンプト内に散在していた落とし穴・判定基準・再利用コマンドを本ページへ集約（出典: `.kiro/agents/github-issue-resolver.md` / efficiency-log の 2026-09-05・2026-09-06 エントリ / issue #32 #109 #138 / PR #113 #114 #139）。あわせて `scripts/issue-triage.mjs` の判定値表と実測トークン削減値（生 JSON 約 221 万文字 → 要約 約 7.9 KB）を記録。
