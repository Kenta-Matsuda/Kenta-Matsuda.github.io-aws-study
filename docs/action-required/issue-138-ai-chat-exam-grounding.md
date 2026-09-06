# AIチャットが実在する試験を「存在しない」と否定し別試験にすり替える問題（一次情報グラウンディング）

🔴 未対応（要対応）

- 種別: 要人間対応（AWS リモート MCP をブラウザから使うためのプロキシ設置の意思決定 / トークンコストの方針）
- 関連: #138（関連 #109 / PR #113 / PR #135 / PR #139）

> クライアント側で対応できる範囲は PR #139 で実装済みです。本ドキュメントに残っているのは、**AWS 公式のリモート MCP をブラウザから直接使うために必要な人間の意思決定**だけです。

## 症状

AIB-C01（AWS Certified AI Business Strategist、リポジトリ内 `js/data/aib-c01.js` に定義済み）についてAIチャットに質問したところ、次のように誤った回答が返った。

> AWS Certified: SAP on AWS - Specialty (PAS-C01) の試験対策における重要なポイントを整理します。 ※現在、SAP on AWSの試験コードは「PAS-C01」となります。AIB-C01という名称は存在しないため、PAS-C01に関する内容として解説します。

実在する AIB-C01 を「存在しない」と断定し、無関係な PAS-C01 / SAP on AWS の内容にすり替えて回答してしまっている。

## AIB-C01 は実在する（AWS 公式ドキュメントで確認済み）

AWS 公式ドキュメントで確認した結果、AIB-C01 は実在する AWS 認定試験である。モデル側の confabulation であることが確定した。

- 試験ガイド（AWS ドキュメント）: <https://docs.aws.amazon.com/aws-certification/latest/ai-business-strategist-01/ai-business-strategist-01.html>
- 公式ページ: <https://aws.amazon.com/certification/certified-ai-business-strategist/>
- AWS 認定試験ガイド索引（全試験のガイドが HTML で公開されている）: <https://docs.aws.amazon.com/aws-certification/latest/examguides/aws-certification-exam-guides.html>

AWS 認定試験ガイド索引には Business 区分として AIB-C01 が掲載されており、出題ドメインは 4 つ（AI の基礎とリテラシー / AI 戦略とビジネス価値の創出 / AI ガバナンスと責任ある AI のリーダーシップ / ビジネスの準備状況、リーダーシップ、AI トランスフォーメーション）である。

## 推定原因

- チャットのシステムプロンプト（`js/chat.js` の `buildChatSystemPrompt(exam)`）が、学習中の試験について試験コード（`code`）と略称（`shortLabel`）しか注入しておらず、正式名称・区分といった正確なメタデータや「この試験は実在するので否定・すり替えしない」という明示的なグラウンディングルールを与えていなかった。
- さらに、AWS 公式ドキュメントを**実際に読ませる経路**が無く、「AWS公式ドキュメントに記載がある情報のみに基づいて回答してください」というルールがモデルの記憶頼みになっていた。AIB-C01 は比較的新しい試験のため、モデルの内部知識に存在せず、記憶で埋めた結果すり替えが起きた。

## 「AWS MCP をブラウザから直接呼ぶ」案の検証結果（重要）

issue #138 と PR #139 のレビューで挙がった「AI に AWS MCP（AWS Knowledge Tools）を読ませて一次情報を確認させる」案について、AWS 公式ドキュメントを確認し、実際に HTTP リクエストを投げて検証した。

### 公式ドキュメントで確認できたこと

| 項目 | 内容 | 出典 |
| --- | --- | --- |
| AWS MCP Server | マネージドなリモート MCP。エンドポイントは `https://aws-mcp.us-east-1.api.aws/mcp` | [OAuth 2.1 authentication for AWS MCP Server](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/oauth-authentication.html) |
| 未認証アクセス | 未認証でも読み取り専用の AWS Knowledge Tools（ドキュメント検索・取得・リージョン可用性）は利用可。API 実行やスクリプト実行は認証必須 | [Quotas for AWS MCP Server](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/aws-mcp-limits.html) |
| 未認証のレート制限 | 送信元 IP・リージョンあたり 5 リクエスト/秒（超過は 429）。認証時は AWS アカウントあたり 10 リクエスト/秒 | 同上 |
| AWS Knowledge Tools | `aws___search_documentation` / `aws___read_documentation` / `aws___list_regions` / `aws___get_regional_availability` / `aws___retrieve_skill` | [Understanding the MCP Server tools](https://docs.aws.amazon.com/agent-toolkit/latest/userguide/understanding-mcp-server-tools.html) |
| AWS Knowledge MCP Server | 認証不要のフルマネージドなリモート MCP。エンドポイントは `https://knowledge-mcp.global.api.aws` | [Connect Amazon Quick Suite to enterprise apps and agents with MCP](https://aws.amazon.com/blogs/machine-learning/connect-amazon-quick-suite-to-enterprise-apps-and-agents-with-mcp/) |

（AWS ドキュメントの内容はライセンス上の制約に配慮して要約・言い換えしています）

### 実地検証の結果: ブラウザからは呼べない（CORS で不可）

サーバー側（curl）からは両エンドポイントとも問題なく応答したが、**ブラウザのクロスオリジン要求としては成立しない**ことを確認した。

1. `https://knowledge-mcp.global.api.aws/mcp`
   - `initialize` は 200 で応答するが、レスポンスに `Access-Control-Allow-Origin` が付かない → ブラウザは読めない。
   - `OPTIONS`（プリフライト）は 415 を返し、CORS ヘッダーも付かない。
2. `https://aws-mcp.us-east-1.api.aws/mcp`
   - `POST` レスポンスには `Access-Control-Allow-Origin: *` が付く。`Content-Type: text/plain;charset=UTF-8` にすればプリフライト無しの「単純リクエスト」として送れるため、`initialize` と `tools/list` はブラウザからでも成立し得る。
   - しかし `tools/call` は `Mcp-Session-Id` を要求する（`Session ID is required for this operation.`）。この ID は次の二重の理由で取得・送信できない。
     - レスポンスの `Access-Control-Expose-Headers` は `x-amzn-RequestId,x-amzn-ErrorType,x-amzn-ErrorMessage,Date,smithy-protocol` のみで、`Mcp-Session-Id` が含まれない → JS から読めない。
     - リクエストヘッダー `Mcp-Session-Id` は CORS のセーフリスト外なのでプリフライトが発生するが、`OPTIONS` は 405（`Allow: POST, DELETE`）を返し CORS ヘッダーも付かない → 送れない。
3. `https://docs.aws.amazon.com/...` も CORS ヘッダーを返さないため、ブラウザから直接ドキュメントを `fetch` することもできない。

再現コマンド（サーバー側から。ブラウザ相当の Origin を付けてヘッダーを確認する）:

```bash
# 1. knowledge-mcp: 200 だが Access-Control-Allow-Origin が無い
curl -s -i -X POST "https://knowledge-mcp.global.api.aws/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Origin: https://kenta-matsuda.github.io" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}'

# 2. aws-mcp: ACAO は付くが tools/call は Mcp-Session-Id を要求する
curl -s -i -X POST "https://aws-mcp.us-east-1.api.aws/mcp" \
  -H "Content-Type: text/plain;charset=UTF-8" \
  -H "Accept: application/json, text/event-stream" \
  -H "Origin: https://kenta-matsuda.github.io" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"aws___search_documentation","arguments":{"search_phrase":"AIB-C01","limit":1}}}'

# 3. aws-mcp: プリフライトは 405 で CORS ヘッダー無し
curl -s -i -X OPTIONS "https://aws-mcp.us-east-1.api.aws/mcp" \
  -H "Origin: https://kenta-matsuda.github.io" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

### 前提の訂正（二重に訂正）

- 当初この文書は「静的サイトからはリモート MCP を呼べない（バックエンド必須）」と書いていた。**理由の説明としては誤り**で、静的サイトでも `js/gemini.js` のように外部 HTTP エンドポイントは直接叩ける。
- その後の修正で「リモート／ホスト型 MCP ならクライアントから直接呼べる可能性がある」と書き換えたが、**実際に検証したところ AWS の両エンドポイントは CORS の制約で呼べない**ことが分かった。結論として「今はブラウザから直接は呼べない。ただし理由は静的サイトだからではなく CORS の設定である」が正しい。

## 実装した代替手段（PR #139 / クライアント側のみ・追加バックエンド無し）

AWS MCP がブラウザから呼べない一方で、**モデル側に AWS 公式ドキュメントを読ませる**ことは追加バックエンド無しで実現できる。Gemini の組み込みツール `url_context` は Google 側で URL を取得するため、ブラウザの CORS 制約を受けない。

- 【対応済み】`js/exams.js` に `getExamOfficialRefs(examId, { locale })` を追加。`js/data/*.js` の `official-page` / `guide` リソース群から、その試験の AWS 公式一次情報 URL（公式試験ガイド・公式ページ）を抽出する。URL は `docs.aws.amazon.com` / `aws.amazon.com` / `d1.awsstatic.com` に限定し、任意の URL がツール呼び出しに混入しないようにしている。
- 【対応済み】`js/chat.js` の `buildChatSystemPrompt(exam)` が、抽出した公式 URL をシステムプロンプトに載せ、「試験そのものに関する事実を述べる前に上記の AWS 公式ページを読み、内部知識と食い違う場合は公式ページを優先する」ことを日英両方で指示する。
- 【対応済み】`js/chat.js` が `url_context` ツールを有効にして Gemini を呼ぶ（`js/ai.js` → `js/gemini.js` に `tools` を透過）。`url_context` に対応しないモデル／API リビジョンが 400 を返した場合は、ツールを外して同じモデルで自動リトライするため、グラウンディングは best-effort であり回答自体は失敗しない。
- 【対応済み】`js/data/*.js` に含まれていたリンク切れの公式試験ガイド 2 件（MLA-C01 / AIP-C01 の PDF が 403）を、AWS ドキュメントの HTML 版試験ガイドに差し替えた。グラウンディング対象 URL 全 52 件（13 試験 × 日英 × 2 種）が HTTP 200 であることを確認済み。
- 【対応済み】試験メタデータ（正式名称 / 試験コード / 略称 / 区分ラベル）の注入と「実在を否定・改名・すり替えしない」ルール（PR #139 の初期対応分）。

### あえて採用しなかった選択肢

- **Gemini の Google 検索グラウンディング（`google_search`）**: 併用すれば精度は上がるが、利用時に Google 検索のサジェスト表示（`searchEntryPoint`）を UI に出す義務が発生する。今回は「特定の AWS 公式 URL を読ませる」目的に `url_context` だけで足りるため、表示義務を伴う `google_search` は入れていない。
- **公開 CORS プロキシ経由の MCP 呼び出し**: 第三者にユーザーの通信内容を渡すことになるため採用しない。

## 切り分け手順

1. `js/data/aib-c01.js` に AIB-C01 の定義（`code: 'AIB-C01'`, `title: 'AWS Certified AI Business Strategist'`, `shortLabel: 'AIB'`, business カテゴリー）があることを確認する。
2. 上記の AWS 公式ドキュメント URL を開き、AIB-C01 が実在することを確認する。
3. `js/chat.js` の `buildChatSystemPrompt(exam)` が、試験メタデータと公式一次情報 URL の両方をプロンプトに注入していることを確認する。
4. `js/chat.js` が `url_context` ツール付きで `callAiStream` / `callAi` を呼んでいることを確認する。
5. Gemini プロバイダー（`gemini-3.1-flash-lite` などツール対応モデル）で AIB-C01 について質問し、回答が AWS 公式ガイドの内容（4 ドメイン構成など）と一致し、出典 URL が示されることを確認する。
6. リモート MCP をブラウザから直接呼びたい場合は、上記「再現コマンド」で CORS ヘッダーの状況が変わっていないかを再確認する（AWS 側の設定変更で将来的に可能になる余地がある）。

## 要人間対応事項

### (1) AWS リモート MCP をブラウザから使うかどうかの意思決定

現状 CORS の制約で不可能なため、実現するには次のいずれかを人間が判断・用意する必要がある。

- 自前の軽量プロキシ（例: Lambda + Function URL や CloudFront Functions）を立てて `aws-mcp` / `knowledge-mcp` への MCP リクエストを中継し、CORS ヘッダーを付与する。#117 のバックエンド実装計画と統合するのが自然。
- AWS 側が `Mcp-Session-Id` を `Access-Control-Expose-Headers` に含め、プリフライトに応答するようになるのを待つ（AWS への機能リクエスト）。
- プロキシを立てない方針を確定し、`url_context` によるグラウンディングを最終形とする。

いずれも AWS リソースの作成を伴う場合があるため、判断は人間に委ねる。**本ドキュメントの調査時点では AWS リソースへの操作は一切行っていない**（読み取り専用の HTTP 検証のみ）。

### (2) トークンコストの方針

`url_context` で取得したページ内容は入力トークンとして課金される（`tool_use_prompt_token_count`）。リクエスト数は増えないため Gemini のリクエスト上限には影響しないが、1 ターンあたりのトークンは増える。以下は人間が方針を決める必要がある。

- 常時グラウンディング（現在の実装）のままにするか、試験そのものへの質問に限って有効化するか。
- 公式試験ガイドが PDF の試験（11 件）は取得サイズが大きい。全 13 試験を AWS ドキュメントの HTML 版試験ガイド（`docs.aws.amazon.com/aws-certification/latest/<slug>/<slug>.html`）へ移行するかどうか。HTML 版は全 13 試験そろっており日本語版もある（`ja_jp`）ことを確認済みなので、移行は可能。ユーザー向けリンクの見え方も変わるため、`docs/wiki/exam-resource-inventory.md` の棚卸しと合わせて判断する。

### (3) 重複の回避

- 一次情報グラウンディングと LLM-as-judge の検証は #109（アンブレラ）および PR #113 の MCP グラウンディング方針と重複しないよう整合を取ること。
- PR #135 は解説の出典 URL のクライアント側グラウンディングであり、本件の試験アイデンティティのグラウンディングとは対象が異なる。
