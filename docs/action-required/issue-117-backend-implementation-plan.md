# バックエンド実装計画（コマンドレベルの具体案 / 人間対応事項を含む）

🔴 未対応（要対応）

- 種別: 要人間対応（バックエンド / AWS インフラ）
- 関連: #117 と関連 #109 #119 #32 #107
- 補足: 本ファイルは issue #117 が求める「具体的・コマンドレベルのバックエンド実装計画（人間側の作業を含む）」への回答です。これは**設計・計画の成果物**であり、バックエンドそのものの構築ではありません。記載する AWS リソース・`aws` コマンドは、**AWS 権限を持つ人間が精査・調整のうえ実行するための提案（テキスト）**です。エージェントは `aws` / `sam` / `cdk` / `terraform` などの操作を**一切実行していません**。
- 位置づけ: 本ファイルは**バックエンドのアンブレラ（統括）計画**です。個別の狭い課題（#109 の MCP グラウンディング、#119 のバックグラウンド生成 + プッシュ、#32 のリーダーボード、#107 のストリーク プッシュ通知）は既存の action-required ドキュメントで扱われるため、ここでは**重複させず参照**し、共通基盤（API / 認証 / データストア / シークレット / 監視）として一貫した土台を提案します。

## 症状

issue #117 は「バックエンドが欲しい。人間側の作業も含めた、具体的でコマンドレベルの実装計画を出してほしい」という要望です。現状のコードベースには、その土台が存在しません。

- このサイトは**ビルドステップの無い静的 PWA（Vanilla JS + HTML）**で、**GitHub Pages** から配信される純粋なフロントエンドです。サーバ / API / データベースが存在しません。
- 学習状態・XP・ストリークは各ブラウザの `localStorage`（`js/storage.js`）にのみ保存され、端末外に出ません。
- AI 機能（`js/ai.js` / `js/chat.js`）は、ユーザーが**自分で入力した API キー（BYO-key）**をブラウザから直接 LLM プロバイダへ送るクライアントサイド方式です。共有バックエンド経由ではありません。
- そのため、次のような「サーバ側の永続化・集約・スケジュール・秘匿情報の保管」を前提とする機能群が、現状では成立しません。
  - グローバルな XP ランキング（#32）
  - アプリを閉じている間に届くプッシュ通知（#107 / #119）
  - サイトを離れても続くバックグラウンド問題生成（#119）
  - サーバ側でキーを保持する形の LLM 呼び出しや MCP グラウンディング（#109 / PR #113）

これらは個別 issue として扱われていますが、**共通して「バックエンドが無い」ことが根本原因**であり、issue #117 はその共通基盤の計画を求めています。

## 推定原因

これは不具合ではなく、**アーキテクチャ上の制約**に起因します。

- 配信形態が **GitHub Pages（静的ホスティング）**であり、サーバサイド実行環境が無い。
- 永続層が **ブラウザの `localStorage` のみ**で、複数ユーザー横断の集約・共有ができない。
- **シークレット（LLM API キー / VAPID 秘密鍵 など）を安全に保管する場所が無い**。静的リポジトリに秘密情報を置くことはできない（公開されるため）。
- スケジュール実行（定期プッシュ、バックグラウンド生成）を担うコンポーネントが無い。

したがって、これらの機能を実現するには、静的サイトの外に**API + 認証 + データストア + シークレット管理 + 監視 + （必要に応じて）非同期処理基盤**を用意する必要があり、これは AWS などのインフラ構築＝人間の対応が必要です。

## 切り分け手順

要人間対応と判断するに至った確認手順は次のとおりです。

1. **既存の永続層を確認する。** `js/storage.js` を確認し、状態が `localStorage` にのみ保存され、外部への送信経路が無いことを確認する。
2. **AI 呼び出し方式を確認する。** `js/ai.js` / `js/chat.js` / `js/config.js` を確認し、ユーザーの BYO-key をブラウザから直接プロバイダへ送っており、サーバ側でキーを保持する経路が無いことを確認する。
3. **バックエンド有無を確認する。** リポジトリ内に API サーバ / サーバレス関数 / データベース定義・接続設定・スケジューラ・シークレット管理が存在しないことを確認する（`js/` はすべてブラウザで動くクライアントモジュール）。
4. **配信形態を確認する。** GitHub Pages 配信の静的サイトであり、サーバサイド実行環境が無いことを確認する。
5. **関連 issue との突き合わせ。** #32 / #107 / #119 / #109 がいずれも「サーバ側の永続化・集約・スケジュール・秘匿保管」を必要とし、共通基盤が前提であることを確認する。

上記より、issue #117 に対してクライアントサイドで前進できる成果物は「バックエンドの実装ではなく、この**共通基盤のコマンドレベル計画（引き継ぎドキュメント）**」であると判断した。

## 要人間対応事項

以下は、AWS 権限を持つ人間が検討・実行するための**設計案・想定コマンド**です（エージェントは実行しません）。各ステップは次の 2 種類のいずれかに明示的に分類します。

- **[エージェント可]**: リポジトリ側で完結する作業（API クライアントモジュールの追加、エンドポイント設定、フォールバック、ドキュメント、テストなど）。バックエンドが用意されれば、これらは通常の PR として実装できます。
- **⚠️ 要人間対応: AWS操作が必要**: AWS リソースの作成・シークレット管理・課金など、人間しか実施できない作業。想定コマンドはテキストのみで、実行しません。

### 提案アーキテクチャ（サーバレス共通基盤）

すべての関連機能（#32 / #107 / #119 / #109）が共有できる、コスト効率の良いサーバレス構成を提案します。

- **Amazon API Gateway（HTTP API）**: 静的フロント（GitHub Pages）から呼ぶ REST/HTTP エンドポイント。CORS を GitHub Pages のオリジンに限定。
- **AWS Lambda**: 各エンドポイントの処理本体（Write/Read、AI プロキシ、購読保存、送信バッチ）。
- **Amazon DynamoDB**: 学習状態・XP 集計・購読情報などの永続ストア（オンデマンド課金 = PAY_PER_REQUEST を初期採用）。
- **Amazon S3**: 生成済みコンテンツ（例: バックグラウンド生成された問題セット）や大きめのペイロードの保管（任意）。
- **AWS IAM**: 各 Lambda に最小権限のロールを付与。
- **Amazon CloudWatch Logs**: ログ・メトリクス・アラーム（コスト / エラー監視）。
- **AWS Secrets Manager / SSM Parameter Store**: LLM API キー・VAPID 秘密鍵などのシークレット保管。
- **Amazon SQS または AWS Step Functions（任意）**: バックグラウンド問題生成（#119）のような非同期・長時間処理のキューイング / オーケストレーション。
- **Amazon EventBridge Scheduler（任意）**: 定期プッシュ（#107）や定期ジョブのトリガ。
- **IaC**: AWS SAM または AWS CDK でスタックとして一元管理する案。

> フロントは当面 GitHub Pages のままとし、API はこの新しいバックエンドスタックのエンドポイントを叩く構成を想定します（CloudFront への移行は将来の任意項目）。

---

### フェーズ 0: 前提整備（アカウント / 課金 / リージョン / IaC 雛形）

**⚠️ 要人間対応: AWS操作が必要**
- **必要な操作内容:**
  - AWS アカウント / 請求（Billing）と支払い方法、予算アラート（AWS Budgets）を用意する。
  - デプロイ先リージョン（例: `ap-northeast-1`）を決定する。
  - IaC ツール（SAM または CDK）と CLI 認証（`aws configure` / SSO）をローカルで用意する。
- **対象リソース:**
  - AWS アカウント / IAM 管理ユーザー・ロール
  - AWS Budgets（コスト上限アラート）
  - AWS SAM CLI または AWS CDK（IaC）
- **想定コマンド:**（人間が内容を確認・調整のうえ実行する提案。エージェントは実行しない）

  ```bash
  # ここに記載するコマンドはエージェントが実行するものではなく、
  # AWS 権限を持つ人間が内容を精査・調整したうえで実行する「提案」です。

  # 例: CLI 認証設定（プロファイル / リージョン）
  aws configure --profile aws-study

  # 例: 予算アラートの作成（JSON は別途用意）
  aws budgets create-budget \
    --account-id <ACCOUNT_ID> \
    --budget file://budget.json \
    --notifications-with-subscribers file://budget-notifications.json

  # 例: IaC スタックの雛形作成（どちらか一方）
  sam init
  # または
  cdk init app --language typescript
  ```

**[エージェント可]**
- IaC テンプレート（`infra/` など）の雛形と README を**リポジトリ内に**追加する（デプロイ自体は人間）。
- `js/config.js` に API ベース URL の設定項目（例: `API_BASE_URL`、未設定なら機能無効）を追加する。

---

### フェーズ 1: 共通 API 基盤（API Gateway + Lambda + IAM + ログ）

**⚠️ 要人間対応: AWS操作が必要**
- **必要な操作内容:**
  - Lambda 実行ロール（最小権限）を作成する。
  - Lambda 関数（ヘルスチェック / ルーティングの土台）を作成する。
  - HTTP API を作成し、Lambda を統合、CORS を GitHub Pages オリジンに限定する。
  - CloudWatch Logs のロググループ / 保持期間 / メトリクスアラームを設定する。
- **対象リソース:**
  - AWS IAM（Lambda 実行ロール）
  - AWS Lambda（API ハンドラ）
  - Amazon API Gateway（HTTP API）
  - Amazon CloudWatch Logs（ロググループ / アラーム）
- **想定コマンド:**（人間が内容を確認・調整のうえ実行する提案。エージェントは実行しない）

  ```bash
  # ここに記載するコマンドはエージェントが実行するものではなく、
  # AWS 権限を持つ人間が内容を精査・調整したうえで実行する「提案」です。

  # 例: Lambda 実行ロールの作成（信頼ポリシーは別ファイル）
  aws iam create-role \
    --role-name aws-study-api-lambda-role \
    --assume-role-policy-document file://lambda-trust-policy.json
  aws iam attach-role-policy \
    --role-name aws-study-api-lambda-role \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  # 例: Lambda 関数の作成（デプロイパッケージは別途 zip）
  aws lambda create-function \
    --function-name aws-study-api \
    --runtime nodejs20.x \
    --handler index.handler \
    --role arn:aws:iam::<ACCOUNT_ID>:role/aws-study-api-lambda-role \
    --zip-file fileb://function.zip

  # 例: HTTP API の作成と CORS 制限
  aws apigatewayv2 create-api \
    --name aws-study-http-api \
    --protocol-type HTTP \
    --cors-configuration AllowOrigins=https://kenta-matsuda.github.io,AllowMethods=GET,POST,OPTIONS,AllowHeaders=content-type,authorization

  # 例: ロググループの保持期間設定
  aws logs put-retention-policy \
    --log-group-name /aws/lambda/aws-study-api \
    --retention-in-days 14
  ```

**[エージェント可]**
- `js/api/client.js`（新規）: `API_BASE_URL` を基点に `fetch` するラッパー（タイムアウト / エラーハンドリング / 未設定時のフォールバック）を追加する。
- `js/config.js` に API のパス定義（`/health` など）を追加する。
- Playwright テスト（`tests/`）に、API 未設定時にアプリが従来どおり動作する（機能が無効化されるだけでクラッシュしない）ことの回帰テストを追加する。

---

### フェーズ 2: データストア（DynamoDB）と XP リーダーボード（#32 の共通土台）

> 詳細な設計・想定コスト議論は既存ドキュメント [`global-leaderboard.md`](global-leaderboard.md)（関連 #32）を参照。ここでは**共通データ層としての位置づけ**のみ示し、重複させません。

**⚠️ 要人間対応: AWS操作が必要**
- **必要な操作内容:**
  - 学習状態 / XP 集計 / 期間バケットを保持する DynamoDB テーブルを作成する（オンデマンド課金）。
  - 日次 / 週次 / 月次バケットの自動失効に TTL を設定する。
  - Lambda 実行ロールに、当該テーブルへの最小権限（GetItem/PutItem/Query/UpdateItem）を付与する。
- **対象リソース:**
  - Amazon DynamoDB（集計テーブル）
  - AWS IAM（テーブルアクセス用ポリシー）
- **想定コマンド:**（人間が内容を確認・調整のうえ実行する提案。エージェントは実行しない）

  ```bash
  # ここに記載するコマンドはエージェントが実行するものではなく、
  # AWS 権限を持つ人間が内容を精査・調整したうえで実行する「提案」です。

  # 例: 集計テーブルの作成（期間バケットをキーに設計 / オンデマンド課金）
  aws dynamodb create-table \
    --table-name aws-study-app \
    --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
    --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST

  # 例: 期間バケット（日次/週次/月次）を TTL で自動失効
  aws dynamodb update-time-to-live \
    --table-name aws-study-app \
    --time-to-live-specification "Enabled=true, AttributeName=expiresAt"
  ```

**[エージェント可]**
- `js/api/leaderboard.js`（新規）: Read API を呼んでランキングを取得するクライアント。バックエンド未接続時は表示を無効化。
- `js/storage.js` に「XP 獲得時にサーバへ非同期送信」する経路を**任意有効化**で追加（`API_BASE_URL` 未設定なら送信しない）。
- ランキング表示 UI と i18n（`js/locales/ja.json` / `en.json` 両方に同一キー）を追加。

---

### フェーズ 3: プッシュ通知基盤（#107 / #119 の共通土台）

> 詳細は既存ドキュメント [`streak-push-notifications.md`](streak-push-notifications.md)（関連 #107）、およびバックグラウンド生成 + 通知の計画（intended filename: `issue-119-background-generation-notifications.md` / 関連 #119）を参照。ここでは共通の Push 基盤としての位置づけのみ示し、重複させません。

**⚠️ 要人間対応: AWS操作が必要**
- **必要な操作内容:**
  - VAPID 鍵ペアを生成し、秘密鍵を Secrets Manager に安全に保管する。
  - Push Subscription（購読情報）を保存する DynamoDB 項目 / テーブルを用意する。
  - 未学習ユーザーへ定期送信する EventBridge Scheduler + 送信 Lambda を用意する。
- **対象リソース:**
  - AWS Secrets Manager または SSM Parameter Store（VAPID 秘密鍵）
  - Amazon DynamoDB（購読情報 / 最終学習日）
  - AWS Lambda（購読保存 API / 送信バッチ）
  - Amazon EventBridge Scheduler（定期送信トリガ）
- **想定コマンド:**（人間が内容を確認・調整のうえ実行する提案。エージェントは実行しない）

  ```bash
  # ここに記載するコマンドはエージェントが実行するものではなく、
  # AWS 権限を持つ人間が内容を精査・調整したうえで実行する「提案」です。

  # 例: VAPID 鍵ペアの生成（web-push CLI）
  npx web-push generate-vapid-keys

  # 例: VAPID 秘密鍵を Secrets Manager に保管
  aws secretsmanager create-secret \
    --name aws-study/vapid-private-key \
    --secret-string "<生成した VAPID 秘密鍵>"

  # 例: 定期送信のスケジュール作成（夕方に未学習ユーザーへ）
  aws scheduler create-schedule \
    --name aws-study-daily-reminder \
    --schedule-expression "cron(0 9 * * ? *)" \
    --flexible-time-window "Mode=OFF" \
    --target "Arn=arn:aws:lambda:<REGION>:<ACCOUNT_ID>:function:aws-study-push-sender,RoleArn=arn:aws:iam::<ACCOUNT_ID>:role/aws-study-scheduler-role"
  ```

**[エージェント可]**
- `sw.js` に `push` / `notificationclick` ハンドラを追加（別 PR）。
- クライアントの opt-in リマインダー設定を拡張し、`pushManager.subscribe({ applicationServerKey })` で購読 → 購読情報を保存 API へ送る経路を追加。未接続時は既存のローカル通知にフォールバック。

---

### フェーズ 4: AI プロキシ / MCP グラウンディング（#109 / PR #113 の共通土台）

> MCP グラウンディングの詳細は #109 / PR #113 を参照。ここでは「サーバ側でキーを保持して LLM を呼ぶプロキシ」という共通基盤の観点のみ示し、重複させません。**現状はクライアント BYO-key 方式**であるため、これはプライバシー / コスト方針の意思決定を伴う任意フェーズです（後述のトレードオフ参照）。

**⚠️ 要人間対応: AWS操作が必要**
- **必要な操作内容:**
  - LLM プロバイダ（Gemini / OpenAI）のサーバ用 API キーを Secrets Manager に保管する。
  - AI 呼び出しをプロキシする Lambda を作成し、レート制限 / 使用量上限を設定する。
  - Lambda 実行ロールに当該シークレットの読み取り権限を付与する。
- **対象リソース:**
  - AWS Secrets Manager（Gemini / OpenAI キー）
  - AWS Lambda（AI プロキシ）
  - Amazon API Gateway（`/ai` ルート、スロットリング設定）
- **想定コマンド:**（人間が内容を確認・調整のうえ実行する提案。エージェントは実行しない）

  ```bash
  # ここに記載するコマンドはエージェントが実行するものではなく、
  # AWS 権限を持つ人間が内容を精査・調整したうえで実行する「提案」です。

  # 例: LLM プロバイダのサーバ用キーを Secrets Manager に保管
  aws secretsmanager create-secret \
    --name aws-study/llm-api-keys \
    --secret-string '{"GEMINI_API_KEY":"<...>","OPENAI_API_KEY":"<...>"}'

  # 例: API Gateway のステージにスロットリング（レート / バースト）を設定
  aws apigatewayv2 update-stage \
    --api-id <API_ID> \
    --stage-name '$default' \
    --default-route-settings "ThrottlingBurstLimit=20,ThrottlingRateLimit=10"
  ```

**[エージェント可]**
- `js/ai.js` / `js/config.js` に「サーバプロキシ経由」モードを追加（`API_BASE_URL` があればプロキシ、無ければ従来の BYO-key にフォールバック）。
- 非同期・長時間生成（#119）向けに、SQS/Step Functions を叩く「ジョブ投入 → ポーリング / 通知受信」クライアントを追加。

---

### 非 CLI の人間対応タスク（横断）

`aws` コマンドだけでは完結しない、人間による意思決定・運用が必要な項目:

- **AWS アカウント / 請求**: アカウント開設、支払い方法、AWS Budgets によるコスト上限アラート。
- **リージョン選定**: レイテンシ / データ所在（例: `ap-northeast-1`）。
- **シークレット / 鍵管理**: Gemini / OpenAI の API キー、VAPID 公開鍵 / 秘密鍵の生成・保管・ローテーション。**静的リポジトリには一切コミットしない。**
- **ドメイン / CORS**: 許可オリジン（GitHub Pages のドメイン）の確定、独自ドメイン利用時の設定。
- **コスト監視**: CloudWatch アラーム / Budgets の閾値設定、想定 MAU・呼び出し頻度の前提値確定。
- **法務 / プライバシー**: サーバ側で AI 呼び出しを代行する場合の利用規約・プライバシーポリシー更新（後述）。

## 考慮事項 / トレードオフ

意思決定のために、主要なトレードオフを整理します。

### コスト

- **無料枠 / 少額運用**: Lambda・API Gateway（HTTP API）・DynamoDB オンデマンドはいずれも無料枠 / 従量課金があり、小規模なら低コストで始められる。CloudWatch Logs は保持期間を短め（例: 14 日）にしてコストを抑える。
- **DynamoDB のオンデマンド vs プロビジョンド**: 初期はトラフィックが読みにくいため**オンデマンド（PAY_PER_REQUEST）**を推奨。安定して高頻度になったらプロビジョンド + Auto Scaling でコスト最適化する。これは #32 コメント / PR #114 で議論されている「DynamoDB 月額コスト試算」と直結するため、想定 MAU・XP 更新頻度・ランキング参照頻度を人間が確定して見積もる。
- **非同期基盤（SQS / Step Functions）**: バックグラウンド生成（#119）で長時間 LLM 呼び出しを行うとタイムアウト / コストが増える。キュー化 + 結果を S3/DynamoDB に保存し、完了時に通知する設計でコストとタイムアウトの両方に対処する。

### レート制限 / キー管理（Gemini / OpenAI）

- **現状（クライアント BYO-key）**: ユーザー自身のキーをブラウザから直接プロバイダへ送る方式。**サーバがキーを持たない = 運営のコスト負担・鍵管理責任が無く、プライバシー面でもユーザーのデータが運営サーバを経由しない**という利点がある。
- **サーバ側キー方式に切り替える場合**: 運営が Secrets Manager でキーを一元管理し、プロキシ経由で呼ぶ。UX は向上（ユーザーがキーを用意不要）するが、**運営がコストとレート制限を負い、ユーザー入力が運営サーバを通過するためプライバシーポリシー / 利用規約の更新が必要**。API Gateway スロットリングや per-user のレート制限、使用量上限で乱用・コスト暴発を防ぐ必要がある。
- **推奨**: BYO-key を既定として維持しつつ、サーバプロキシは**任意 / 段階導入**とする（`API_BASE_URL` 未設定時は BYO-key にフォールバック）。#109 の MCP グラウンディングもこのプロキシ基盤の上に載せられる。

### セキュリティ

- **静的リポジトリに秘密情報を置かない**: LLM キー・VAPID 秘密鍵などは必ず Secrets Manager / SSM に置き、リポジトリ（公開）には**公開鍵・エンドポイント URL のみ**を置く。
- **最小権限 IAM**: 各 Lambda に必要な DynamoDB / Secrets のみを許可するロールを付与。
- **CORS 制限 / スロットリング / 入力検証**: 許可オリジンを GitHub Pages に限定し、書き込み API はレート制限・入力検証・（必要なら）匿名 / 軽量認証でなりすまし・多重投稿を抑止。

### スコープの順序付け（#109 / #119 / #32 / #107 との関係）

推奨する導入順序（各フェーズは前フェーズの共通基盤に依存）:

1. **フェーズ 0 → 1（共通 API 基盤）**: すべての機能の土台。まずここを固める。
2. **フェーズ 2（DynamoDB + リーダーボード / #32）**: 永続層の最初の実利用。コスト試算（#32 / PR #114）もここで確定。
3. **フェーズ 3（Push 基盤 / #107・#119）**: 既存の action-required ドキュメント（`streak-push-notifications.md`、`issue-119-background-generation-notifications.md`）の設計をこの基盤に載せる。
4. **フェーズ 4（AI プロキシ / MCP グラウンディング / #109・PR #113）**: プライバシー方針の意思決定を伴うため任意 / 最後。BYO-key フォールバックを維持。

> 各フェーズの **[エージェント可]** 部分（API クライアント、設定、フォールバック、UI、i18n、テスト、ドキュメント）は、対応する AWS リソースが人間により用意され次第、通常の PR として順次実装できます。**⚠️ 要人間対応** 部分は本ファイルの想定コマンドを参考に人間が実行してください。エージェントは `aws` コマンドを一切実行していません。
