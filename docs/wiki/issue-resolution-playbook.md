# issue 解決プレイブック

- 最終更新日: 2026-09-06
- 対象範囲: `github-issue-resolver` エージェント（`.kiro/agents/github-issue-resolver.md`）が open issue を棚卸し・実装・PR 化する際の既知の落とし穴・判定基準・再利用可能なコマンド・リポジトリ固有の勘所
- 出典/参照: `.kiro/agents/github-issue-resolver.md` / `docs/wiki/efficiency-log.md` / issue #32 #109 #137 #138 #161〜#169 / PR #113 #114 #139 #157 #160 #175〜#182

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

### A-7: コンフリクトしたオープン PR を、依頼が来るまで放置した

- **何が起きたか**: コンフリクト解消が「PR コメントで『コンフリクトを解消して』と依頼されたときだけ行う派生対応」としてしか運用マニュアルに書かれておらず、依頼コメントが無いコンフリクト PR は検知されないままマージ不能で滞留した。`main` からの遅れ（behind main）については `git rev-list --left-right --count` による検出手順があったが、**実際に衝突している状態（`mergeable_state: dirty`）を能動的に見に行く手順が無かった**。
- **なぜ見落とすか**: 一覧 API（`pulls?state=open`）のレスポンスには `mergeable` / `mergeable_state` が含まれない。PR 一覧を眺めるだけではコンフリクトの有無が分からず、「コメントが無い＝対応不要」と誤認しやすい。
- **恒久対策**: マージ可能状態の確認を**コメントファースト事前ゲートの (iii)** に組み込み、`gh api repos/{owner}/{repo}/pulls/{n}` を**PR 単体で**叩いて `mergeable_state` を判定する手順を明文化した（`unknown` は計算中なので再取得 → それでも不明なら `git rev-list` にフォールバック）。解消は `git merge` に固定し、`git rebase` を permissions でも deny した。
- **教訓（一般化）**: 「依頼されたら対応する」形の受動的ルールは、依頼が来ない限り実行されない。**状態を自分から観測する手順**（どの API のどのフィールドを見るか）まで書いて初めて能動的な運用になる。あわせて、一覧 API と単体 API で返るフィールドが違う点に注意する。

### A-8: トリアージが「open issue に紐づく PR」しか見ておらず、紐づかない PR が完全に不可視だった

- **何が起きたか**: `scripts/issue-triage.mjs` は open issue を起点に関連 PR を辿る構造だったため、**issue に紐づかないブランチの PR（`chore/...` / `docs/...`）が要約に一切現れなかった**。その結果、PR #157（「コースのリンクを直接載せてほしい」）と PR #160（「カバレッジと本数両方分かるようにマージして」）のメンテナ依頼、および 3 件のコンフリクト（#139 / #157 / #160）を、要約だけでは検知できなかった。
- **さらに悪化させた要因**: 紐づけ判定の正規表現が `^feature/issue-<N>` 限定だった。実際のブランチ接頭辞は `fix/` `chore/` `docs/` も使うため、`fix/issue-165-...` の PR が「関連 PR なし」と誤判定されていた。本文側も `Closes` しか見ておらず、部分対応で使う `Refs` を拾えなかった。
- **恒久対策**: (1) スクリプトに**オープン PR 監査**セクションを追加し、**すべてのオープン PR**を `mergeable_state` と未対応コメント付きで列挙する（`--issue` で絞っても監査は全件行う）。紐づく open issue が無い PR は「棚卸しでは不可視になるので注意」と明示する。(2) 紐づけ正規表現を `^[a-z]+/issue-<N>` に広げ、本文側も `Refs` / `Related to` を拾う。
- **教訓（一般化）**: 「A を起点に B を辿る」構造の要約は、**A に紐づかない B を構造的に見落とす**。要約を作るときは「起点に紐づかない対象がゼロ件であること」まで確認する。

### A-9: `test-results/` にスクラッチファイルを置いて消された

- **何が起きたか**: コミットメッセージや PR 本文の下書きを gitignored な `test-results/` に置いていたが、`npx playwright test` は**実行のたびに出力ディレクトリを空にする**。テストを走らせた直後に下書きが消えた。
- **恒久対策**: リポジトリ内の gitignored ディレクトリを作業用スクラッチに使わない。**リポジトリ外の一時ディレクトリ**（例: `C:/Users/Public/asn-scratch/`、Linux なら `/tmp/`）に置く。
- **教訓（一般化）**: 「gitignore されている」は「消えない」を意味しない。ツールが所有するディレクトリはツールが消す。

### A-10: 回帰テストが「本当に落ちるか」を確認していなかった

- **何が起きたか**: 修正と同時に書いたテストが、修正前でも通ってしまう（空虚な）テストになっていないかを確かめていなかった。
- **恒久対策**: 実装ファイルだけを `git stash push <file...>` で退避してテストを実行し、**失敗することを確認**してから `git stash pop` で戻す。今回の 6 件（#161 / #163 / #164 / #165 / #166 / #168）すべてでこの確認を行い、PR 本文にも結果を書いた。
- **注意**: テストが新しい export を import している場合は、その export を含むファイルを stash から除外する（さもないと import エラーで「テストが見つからない」になり、確認にならない）。

### A-11: 実行環境を Linux/bash と断定していた

- **何が起きたか**: プロンプトの「サンドボックス実行環境の事実」は OS を **Linux / bash** と断定し、`env -u NODE_OPTIONS` を必須としていたが、実測では **Windows + PowerShell 7 / Node 22 / `NODE_OPTIONS` は空**だった（`exam-content-maintainer` 側では既に是正済みだった知見）。
- **PowerShell 環境で実際に踏んだ落とし穴**:
  - `env -u NODE_OPTIONS ...` は使えない（`env` が無い）。`NODE_OPTIONS` が空なら素の `node` で足りる。
  - **`cmd /c gh api ...` は失敗する**。`gh api` は PowerShell から直接呼ぶ。
  - コンソール出力の日本語が CP932 で文字化けする。**git / GitHub 側のデータは正しい UTF-8**（`cmd /c "git cat-file commit HEAD > file"` でバイト列を読めば確認できる）。表示だけを見て「壊れた」と誤認しない。
  - ヒアドキュメントが無いため、コミットメッセージ・PR 本文・コメント本文は**ファイル経由**で渡す（`git commit -F <file>` / `gh api ... -F body=@<file>`）。
  - 長い出力は `| Out-File -Encoding utf8` でファイルに落として読む（コンソール折り返しと文字化けを避けられる）。
- **恒久対策**: 環境を断定せず**着手時に判定**する（プロンプト側に手順として追加）。

### A-12: 「API キーが無いから AI 経路は検証できない」と諦めていた

- **何が起きたか**: AI 生成に関わる不具合（#166 / #169）は「実 API キーが無いと確認できない」と考えがちだった。
- **実際にできたこと**: Playwright の `page.route('**generativelanguage.googleapis.com/**', ...)` で **SSE レスポンスをスタブ**すれば、API キー無しで生成経路を E2E 検証できる。`route.abort('connectionfailed')` で回線切断も再現できる。
- **恒久対策**: AI 経路の検証は「実キーが無いから未検証」ではなく、スタブで**期待する分岐**（成功 / 壊れた JSON / 通信断）を固定する。実キーでの目視確認だけを「未検証」として PR に明記する。

## 判定基準

### オープン PR 監査の分岐（`scripts/issue-triage.mjs` の PR 判定値）

| 判定値 | 意味 | 取るべき行動 |
|---|---|---|
| `PR_CONFLICT` | `mergeable_state: dirty` | **最優先。** 新規実装より先に `git merge origin/main` で解消 |
| `PR_FOLLOWUP` | 未対応コメントあり | 同じ head ブランチへ対応し直し、`🤖 対応済み` を残す |
| `PR_BEHIND` | `behind`（衝突なしで遅れている） | 最新 `main` を取り込む |
| `PR_UNKNOWN` | `mergeable` が `null` のまま | `git rev-list --left-right --count` でローカル判定にフォールバック |
| `PR_OK` | 対応不要（`blocked` / `unstable` はレビュー・チェック要件） | 何もしない |

「紐づく open issue: なし」と出た PR は、**issue 起点の棚卸しでは絶対に見つからない**もの（A-8）。必ずこのセクションから拾う。

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
node scripts/issue-triage.mjs                 # 全 open issue の要約 + 全オープン PR 監査
node scripts/issue-triage.mjs --issue 138,32   # issue を限定（PR 監査は全件のまま）
node scripts/issue-triage.mjs --no-pr-audit    # PR 監査を省略（高速だが見落としリスクあり）
node scripts/issue-triage.mjs --json           # 機械可読 JSON（openPrAudit を含む）
node scripts/issue-triage.mjs --help           # オプション一覧
```

`NODE_OPTIONS` が存在しない preload を指している環境では `env -u NODE_OPTIONS node ...`（bash）/ `$env:NODE_OPTIONS=''`（PowerShell）で前置きする。空なら素の `node` でよい（A-11）。

読み取り専用（`gh api` の GET のみ）。マーカー検出は本文接頭辞 `🤖 agent:skipped` / `🤖 対応済み` に依存するため、コメント時は必ず規定の接頭辞を使う。

**実行時間の目安**: オープン PR 監査は 1 PR あたり 4 リクエスト（コメント 3 種 + PR 単体）を投げるため、オープン PR が 12 件だと 1〜3 分かかる。**2 分程度で戻らないのは正常**なので、タイムアウトの短いシェル呼び出しではなくバックグラウンド実行 + ファイル出力にする。

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

# マージ可能状態（コンフリクト検出）。一覧 API には mergeable が無いので PR 単体で叩く
gh api repos/{owner}/{repo}/pulls/{n} --jq '{mergeable, mergeable_state, rebaseable}'
```

`mergeable_state`: `dirty`（コンフリクト＝解消対象）/ `behind`（遅れ＝`main` 取り込み対象）/ `blocked` `unstable`（チェック・レビュー要件。マージ競合ではない）/ `clean`（対応不要）/ `unknown`（GitHub が計算中。`mergeable` は `null`。数秒待って再取得し、それでも不明なら下記の `git` 判定にフォールバック）。

```
# behind main の量をローカルで判定（左側が origin/main 側の先行コミット数）
git fetch origin && git rev-list --left-right --count origin/main...origin/<head ブランチ>
```

解消は `git merge origin/main` のみ。`git rebase` / force push は禁止（A-7）。

### Playwright（この環境では完全に動く）

```
npx playwright test                              # 全スイート（dev-server は webServer 設定で自動起動）
npx playwright test tests/<spec>.mjs             # 単一スペック
npx playwright test --reporter=line              # 出力が多いときはこちらが読みやすい
```

`playwright.config.mjs` の `webServer` が `node dev-server.mjs --port 8877 --no-cache` を自動起動する。`reuseExistingServer: true` なので、前回の実行が中断してポートが塞がると `ERR_CONNECTION_REFUSED` になる。その場合は**もう一度実行すれば復旧**する。

- **純ロジックのスペック**は `page` を使わずモジュールを直接 import できる（例: `tests/quiz-parse.spec.mjs` / `tests/markdown-normalize.spec.mjs`）。テストしたいロジックが巨大な `js/ui.js` の中にあるときは、**小さなモジュールへ切り出してから**テストする（`js/markdown.js` / `js/aiErrors.js` はそうやって生まれた）。
- **外部 API のスタブ**は `page.route('**generativelanguage.googleapis.com/**', ...)` で行う。SSE は `content-type: text/event-stream` と `data: {...}\n\n` の本文で再現でき、`route.abort('connectionfailed')` で通信断も作れる（A-12）。
- **回帰テストの非空虚性**は実装ファイルだけを `git stash` して失敗を確認する（A-10）。
- `test-results/` は実行のたびに空にされる。スクラッチ置き場にしない（A-9）。

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

## リポジトリ固有の勘所（追記）

- **学習ステップのタイトルは 13 試験で完全一致**（`Register for the exam` / `Understand the exam overview` / `Learn with official training courses` / `Deep dive into each domain` / `Practice with sample questions`）。「全般」タブの挙動をステップ単位で分岐させるときは、この一致を前提にタイトルで判定してよい（実測確認済み。#163）。
- **`js/i18n.js` の `translateStaticElements()` は `textContent` を丸ごと置換する**。`data-i18n` を持つ要素の中に `<a>` やアイコンを置くと翻訳時に消える。リンクを含む文言は `data-i18n-tmpl` + `data-i18n-slot`（翻訳文の `{{link}}` 位置に既存ノードを挟む）を使う（#161）。
- **AI 応答の失敗判定 `isSuccessfulAiResponse()` は文字列ベース**（`errors.generic` の接頭辞 / 80 文字未満を失敗とみなす）。プロバイダ側のエラーメッセージを変えるときは、この判定を通り抜けて「正常な解説」として表示されないかを必ず確認する（#169）。逆に**正常な短い JSON が「失敗」と判定される**ケースもあるため、クイズはパースを長さ判定より先に行う（#166）。
- **初心者ガイド（`#beginner`）は試験用のステップ定義を再利用する**が `exam` コンテキストを持たない。ステップに機能を足すときは `exam` の有無でガードする（#163）。

## 更新履歴

- 2026-09-06: 落とし穴 **A-8〜A-12** を追記（トリアージが issue に紐づかない PR を構造的に見落としていた / `test-results/` はテスト実行で消える / 回帰テストの非空虚性を stash で確認する / 実行環境を Linux/bash と断定していた（実測は Windows + PowerShell 7）/ API キー無しでも `page.route` で AI 経路を E2E 検証できる）。あわせて「オープン PR 監査の分岐」判定表、Playwright の使い方節、リポジトリ固有の勘所（ステップタイトルの一致・`translateStaticElements` の textContent 置換・`isSuccessfulAiResponse` の文字列判定・初心者ガイドの `exam` 不在）を追加。出典: issue #161〜#169 / PR #157 #160 #175〜#182。
- 2026-09-06: 落とし穴 **A-7（コンフリクトしたオープン PR を依頼が来るまで放置した）** を追記。一覧 API には `mergeable` / `mergeable_state` が含まれないため PR 単体 API で観測する必要がある点、`mergeable_state` の各値の扱い、`unknown` 時の再取得と `git rev-list` フォールバック、解消は `git merge` 固定（`git rebase` は permissions でも deny）を「再利用可能なコマンド」節に追加。出典: `.kiro/agents/github-issue-resolver.md` の「既存オープン PR のコンフリクト解消」節。
- 2026-09-06: 初版作成。`github-issue-resolver` を自己改善型へ再構成した際に、これまで `docs/wiki/efficiency-log.md` とエージェントプロンプト内に散在していた落とし穴・判定基準・再利用コマンドを本ページへ集約（出典: `.kiro/agents/github-issue-resolver.md` / efficiency-log の 2026-09-05・2026-09-06 エントリ / issue #32 #109 #138 / PR #113 #114 #139）。あわせて `scripts/issue-triage.mjs` の判定値表と実測トークン削減値（生 JSON 約 221 万文字 → 要約 約 7.9 KB）を記録。
