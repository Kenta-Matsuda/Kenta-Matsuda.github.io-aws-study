# サイトを離れても続くバックグラウンド問題生成と、完了時のプッシュ通知

🔴 未対応（要対応）

- 種別: 要人間対応（バックエンド / Web Push サービス）
- 関連: #119（関連: #117 バックエンド化アンブレラ / #107 ストリーク用プッシュ通知）
- 補足: 本ファイルに記載する構成・コマンドは、**サーバ / 通知インフラを扱える人間が検討・実行するための提案**です。エージェントは AWS 操作（`aws` / `sam` / `cdk` / `terraform` など）を一切実行しません。

## 症状

issue #119 は「AI による問題生成を**サイトを離れた後もバックグラウンドで継続**し、**生成が完了したら通知**してほしい」という要望です。この 2 点は、現状のコードベースだけでは実装できません。

- 現在の問題生成（`js/ai.js` の Gemini 呼び出し）は、**ユーザーがタブを開いている間だけ**動作する。タブや PWA を閉じると処理が中断され、続きが実行されない。
- 生成が完了しても、**アプリ（タブ）を閉じている間に端末へ届く通知**を配信する経路が存在しない。
- 「生成中のジョブ」を端末外に保持し、完了状態を後から受け取る仕組みが無いため、途中でサイトを離れると結果が失われる。

> なお、**アプリを開いている間に完結する生成**と、そのローカルな進捗表示・アプリ内通知はクライアントのみで実装可能です。本ファイルが扱うのは、それでは実現できない**タブを閉じた後も続くバックグラウンド生成**と**サーバ依存のプッシュ通知**の部分のみです。プッシュ通知の基盤（Push API + Service Worker + VAPID）は #107 の [`streak-push-notifications.md`](streak-push-notifications.md) で既にスコープ化しており、本件はその通知基盤を「生成完了通知」に**再利用**する前提です（重複構築はしない）。

## 推定原因

これは不具合ではなく、**アーキテクチャ上の制約**に起因します。

- このサイトは **ビルドステップの無い静的 PWA（Vanilla JS + HTML）** で、**GitHub Pages** から配信される純粋なフロントエンドです。
- **バックエンド（サーバ / API / データベース）が存在しません。** 学習状態は各ブラウザの `localStorage`（`js/storage.js`）にのみ保存されます。
- ブラウザは、**タブを閉じた後に長時間の処理を継続できません。** Service Worker も「開いている間の延長」であり、数十秒〜数分かかる LLM 生成ジョブを、ユーザーが離れた後に完走させる用途には使えません（Background Sync / Periodic Sync も実行保証が弱く、生成のような重い処理には不向き）。したがって「サイトを離れても続く生成」は、**クライアントの外＝サーバ側でジョブを実行**する必要があります。
- Web の「アプリを閉じていても届く通知」は、**Push API + Service Worker + Web Push サービス**の組み合わせでのみ成立します。具体的には次が必須です。
  - 各ブラウザで取得した **Push Subscription（購読情報）をサーバ側に保存**する。
  - **VAPID 鍵**（送信元を識別する公開鍵 / 秘密鍵）を用意し、秘密鍵を安全に保管する。
  - ジョブ完了時に**サーバからプッシュを送信**する経路を用意する。
- これらはいずれも**サーバ側コンポーネント**であり、クライアント単体（ブラウザ内のローカルデータのみ）では成立しません。

## 切り分け手順

要人間対応と判断するに至った確認手順は次のとおりです。

1. **既存の生成処理を確認する。** `js/ai.js` を確認し、Gemini API 呼び出しがブラウザ側で同期的に走り、タブが開いている間しか進行しないことを確認する。
2. **既存の永続層 / 送信経路を確認する。** `js/storage.js` を確認し、状態が `localStorage` のみに保存され、ジョブや生成結果を端末外に保持する仕組み・外部送信経路が無いことを確認する。
3. **Service Worker の役割を確認する。** `sw.js` はアプリシェルのキャッシュ（オフライン表示）のためのもので、`push` イベントの受信ハンドラや購読処理、長時間ジョブの実行手段を持たないことを確認する。
4. **バックエンド有無を確認する。** リポジトリ内に API サーバ / ジョブキュー / サーバレス関数 / データベース / VAPID 鍵管理が存在しないことを確認する。
5. **機能要件との突き合わせ。** 「サイトを離れても続く生成」はサーバ側ジョブ実行を、「完了通知」は購読情報の保存・VAPID 鍵・送信経路を必須とするため、クライアントのみでは実装不能と結論づける。

上記より、本件については「実装ではなく、この構造化された設計・引き継ぎドキュメント」をクライアントサイドの成果物として残すと判断した。

## 要人間対応事項

サイトを離れても続くバックグラウンド生成と完了通知を実現するには、静的サイトの外にジョブ実行基盤と通知インフラを用意する必要があります。以下はサーバ / AWS 権限を持つ人間が検討・実行するための**設計案と想定コマンド**です（エージェントは実行しません）。

### バックエンド設計案（概要）

1. **ジョブ受付 API（Write API）**: クライアントから「生成リクエスト（試験種別・問題数・条件など）」を受け取り、ジョブ ID を発行してキューへ投入する HTTP エンドポイント。CORS を GitHub Pages のオリジンに限定し、入力検証とレート制限を伴う。
2. **ジョブキュー / オーケストレーション**: 受け付けた生成ジョブを非同期に処理する。
   - 単発生成なら **SQS + Lambda（ワーカー）** で十分。
   - 「大量問題の分割生成 → 集約」「リトライ / タイムアウト制御」が要るなら **AWS Step Functions** でワークフロー化する（Gemini のレート制限に合わせた分割・スロットリング・指数バックオフを組み込みやすい）。
3. **サーバ側での問題生成**: ワーカー Lambda が Gemini API を呼び出して問題を生成する。API キーは Secrets Manager / SSM に保管し、**クライアントには露出させない**（現在クライアントで鍵を扱う構成の改善にもなる）。
4. **生成結果ストア**: 生成された問題とジョブ状態（`queued` / `running` / `done` / `failed`）を保存する。ジョブ状態・メタデータは **DynamoDB**、大きな問題本文は **S3** に置く案。結果には TTL を設定し、一定期間で自動失効させる。
5. **完了時のプッシュ通知（Web Push / VAPID）**: ジョブが `done` になったら、保存済み Push Subscription 宛に VAPID 署名付きで Web Push を送信する。クライアントの `sw.js` に `push` / `notificationclick` ハンドラを追加し、`self.registration.showNotification(...)` で「問題生成が完了しました」を表示、タップで結果画面へ遷移させる。**この通知基盤は #107 の設計（[`streak-push-notifications.md`](streak-push-notifications.md)）と共通**であり、購読保存 API・VAPID 鍵管理・`sw.js` 拡張はそちらと一本化する。
6. **結果取得 API（Read API / ポーリング）**: プッシュを受け取れない環境（通知未許可・iOS の制約など）向けに、ジョブ ID で状態と結果を取得する Read API も用意し、クライアントは再訪時にポーリングして結果を反映する（フォールバック）。
7. **クライアント改修**: `js/ai.js` の生成経路を「ジョブ受付 API 呼び出し → 通知 or 再訪ポーリングで結果反映」に切り替える。バックエンド未接続時は現在のフォアグラウンド生成にフォールバックする。

### 候補 AWS リソース

上記設計を AWS で構築する場合の候補（いずれも人間が構成を検討・決定するもの）:

- **Amazon API Gateway**（HTTP API）: ジョブ受付 / 結果取得 / 購読保存の各エンドポイント。CORS を GitHub Pages のオリジンに限定。
- **AWS Lambda**: ジョブ受付ハンドラ、生成ワーカー（Gemini 呼び出し）、Web Push 送信、Read API ハンドラ。
- **Amazon SQS または AWS Step Functions**: 生成ジョブのキューイング / オーケストレーション（分割・リトライ・スロットリング）。
- **Amazon DynamoDB**: ジョブ状態・メタデータ・Push Subscription を保持するテーブル（TTL 付き）。
- **Amazon S3**: 生成された問題本文など大きめの成果物の保存（TTL / ライフサイクルで失効）。
- **AWS Secrets Manager または SSM Parameter Store**: Gemini API キーと VAPID 秘密鍵の安全な保管。
- **AWS IAM ロール**: 各 Lambda に最小権限（DynamoDB / S3 / SQS / Secrets へのアクセス）を付与するロール。
- **IaC**: AWS SAM または AWS CDK でスタックとして管理する案。

### ⚠️ 要人間対応: AWS操作が必要

- **必要な操作内容:**
  - 生成ジョブを非同期実行するバックエンド（ジョブ受付 API / キュー or ワークフロー / 生成ワーカー / 結果ストア / 結果取得 API）を設計・構築する。
  - Gemini API キーと VAPID 秘密鍵をシークレットとして安全に保管し、Lambda から参照する（クライアントに鍵を露出させない）。
  - ジョブ完了時に Web Push（VAPID 署名付き）で通知を送る経路を構築し、購読保存 API・`sw.js` 拡張は #107 の通知基盤と一本化する（重複構築しない）。
  - Gemini のレート制限に合わせた分割生成・スロットリング・リトライ / バックオフを組み込む。
  - 構築後、`js/ai.js` / `sw.js` / `js/storage.js` のクライアント改修（ジョブ投入・購読・結果反映・フォールバック）を、別 issue / PR として起票する。
- **対象リソース:**
  - Amazon API Gateway（ジョブ受付 / 結果取得 / 購読保存 HTTP API）
  - AWS Lambda（受付ハンドラ / 生成ワーカー / Web Push 送信 / Read API）
  - Amazon SQS または AWS Step Functions（ジョブキュー / オーケストレーション）
  - Amazon DynamoDB（ジョブ状態・Push Subscription テーブル / TTL）
  - Amazon S3（生成結果の保存 / ライフサイクル失効）
  - AWS Secrets Manager または SSM Parameter Store（Gemini API キー / VAPID 秘密鍵）
  - AWS IAM ロール（各 Lambda への最小権限付与）
  - AWS SAM または AWS CDK（IaC / スタック管理）
- **CLI 以外の人間対応タスク:**
  - VAPID 鍵ペアを生成する（例: `npx web-push generate-vapid-keys`）。
  - ブラウザの Web Push サービス（各ブラウザベンダのプッシュサービス）との連携を前提に、通知許可フローと iOS 等の制約を確認する。
  - Gemini API キー・VAPID 秘密鍵などのシークレット管理方針（保管先 / ローテーション / アクセス権）を決定する。
- **想定コマンド:**（人間が内容を確認・調整のうえ実行する提案。エージェントは実行しない）

  ```bash
  # ここに記載するコマンドはエージェントが実行するものではなく、
  # サーバ / AWS 権限を持つ人間が内容を精査・調整したうえで実行する「提案」です。

  # 例: VAPID 鍵ペアの生成（web-push CLI を利用する場合）
  npx web-push generate-vapid-keys

  # 例: Gemini API キーと VAPID 秘密鍵を Secrets Manager に保管
  aws secretsmanager create-secret \
    --name aws-study/gemini-api-key \
    --secret-string "<Gemini API キー>"
  aws secretsmanager create-secret \
    --name aws-study/vapid-private-key \
    --secret-string "<生成した VAPID 秘密鍵>"

  # 例: ジョブ状態 / 購読情報テーブルの作成（TTL 付き）
  aws dynamodb create-table \
    --table-name aws-study-generation-jobs \
    --attribute-definitions AttributeName=jobId,AttributeType=S \
    --key-schema AttributeName=jobId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST
  aws dynamodb update-time-to-live \
    --table-name aws-study-generation-jobs \
    --time-to-live-specification "Enabled=true, AttributeName=expiresAt"

  # 例: 生成結果を保存する S3 バケットの作成（ライフサイクルは別途設定）
  aws s3api create-bucket \
    --bucket aws-study-generated-questions \
    --create-bucket-configuration LocationConstraint=ap-northeast-1

  # 例: 生成ジョブ用のキュー（単発生成なら SQS で十分）
  aws sqs create-queue --queue-name aws-study-generation-queue

  # 例: SAM / CDK でスタックとして構築する場合（テンプレート作成後）
  sam build && sam deploy --guided
  # または
  cdk deploy
  ```

  > これらのコマンドはあくまで方向性を示す例です。実際のテーブル / バケット設計・IAM 権限・CORS 設定・鍵管理・リージョン・オーケストレーション方式は人間が決定してください。

## 考慮したトレードオフ

- **Gemini API のレート制限:** 大量問題をサーバ側で一気に生成するとレート上限に達しやすい。Step Functions などで分割・スロットリング・指数バックオフを行い、部分成功を許容する設計が望ましい（issue #115 で扱った「本番模擬試験生成の部分失敗の可視化」とも整合させる）。
- **コスト:** Lambda / API Gateway / DynamoDB / S3 / SQS はいずれも従量課金だが、生成ジョブの頻度・保持期間・通知量次第で無視できない額になりうる。TTL / ライフサイクルで結果を短期失効させ、想定 MAU と生成頻度を前提に見積もる必要がある。
- **生成コンテンツのプライバシー:** 生成した問題や、ユーザーが指定した条件を端末外（DynamoDB / S3）に保存することになる。保存範囲・保持期間・匿名化・アクセス権を明確にし、不要になった結果は失効させる方針が必要。
- **通知の到達性:** iOS/Safari など Web Push の対応・制約が環境差で大きい。プッシュに依存しきらず、再訪時のポーリング（Read API）によるフォールバックを併設する。
