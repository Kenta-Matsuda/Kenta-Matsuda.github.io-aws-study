# フィードバック収集バックエンド（#162 / #167）

GitHub アカウント無しのフィードバック送信（#162）と、Good / Bad 投票の集約（#167）を受け持つ最小構成のサーバレススタックです。

```
ブラウザ（GitHub Pages）
   │ POST /feedback, POST /votes（text/plain の JSON = CORS プリフライト無し）
   ▼
Lambda Function URL（API Gateway は使わない）── CORS / Origin を GitHub Pages に限定
   │ 入力検証・ハニーポット・送信までの経過時間チェック・IP 単位レート制限・停止スイッチ
   ├─▶ DynamoDB（オンデマンド, TTL で自動削除）… フィードバック本文・投票イベント・レート制限カウンタ
   ├─▶ S3（非公開）+ CloudFront（OAC）… 添付スクリーンショット（最大 3 枚）。issue 本文に CloudFront の URL で埋め込む
   └─▶ GitHub REST API … SSM の fine-grained PAT で issue を代理作成（ラベル feedback / from-app）
```

添付画像はブラウザ側で縮小・WebP（非対応なら JPEG）に再エンコードしてから送ります（EXIF の位置情報なども消えます）。Lambda はファイルシグネチャで JPEG / PNG / WebP だけを受け付け、推測できないランダムなキーで保存します。画像は issue に埋め込まれるため**公開**扱いで、期限による自動削除はしていません（削除すると issue の画像が切れるため）。

## コスト

このサイトの規模なら **AWS の常時無料枠内**に収まる想定です（すべて 2026-10 時点）。

| リソース | 無料枠 | 備考 |
| --- | --- | --- |
| Lambda + Function URL | 月 100 万リクエスト / 40 万 GB 秒（常時無料） | Function URL 自体は追加料金なし。API Gateway を使わないので 12 か月制限の枠に依存しない |
| DynamoDB オンデマンド | 25 GB ストレージ（常時無料） | 書き込みは 100 万件あたり約 $0.7 程度の従量。投票 1 件 = 書き込み約 2 件 |
| SSM Parameter Store（Standard） | 無料 | Secrets Manager（$0.40/月）は使わない |
| CloudWatch Logs | 5 GB 取り込み（常時無料） | 保持 14 日 |
| S3 + CloudFront | CloudFront は月 1 TB 転送 / 1,000 万リクエスト（常時無料） | S3 保存は約 $0.025/GB 月。スクリーンショット数千枚でも月数セント |

- `BudgetEmail` パラメータを渡すと月 $1 の予算アラートも作成します（AWS Budgets は 2 個まで無料）。
- 濫用でコストが出そうなときは `AcceptSubmissions=false` で再デプロイすれば即停止できます。

## デプロイ手順（ap-northeast-1）

前提: AWS CLI / SAM CLI。**root ユーザーではなく IAM ユーザー / SSO のプロファイルを推奨**します。

1. スタックをデプロイ（初回は `--guided` で samconfig.toml を作ってもよい）

   ```powershell
   cd infra/feedback
   sam build
   sam deploy --stack-name aws-study-feedback --region ap-northeast-1 `
     --resolve-s3 --capabilities CAPABILITY_IAM `
     --parameter-overrides BudgetEmail=<通知先メール>
   ```

   出力 `FunctionUrl` を控えます。

2. GitHub の **fine-grained personal access token** を作成
   - Repository access: *Only select repositories* → このリポジトリだけ
   - Permissions: *Issues: Read and write*（それ以外は不要）
   - 有効期限を設定し、失効前に更新する

3. トークンを SSM に保存（**自分のターミナルで**実行し、チャット等に貼らない）

   ```powershell
   aws ssm put-parameter --region ap-northeast-1 --type SecureString `
     --name /study-navigator/feedback/github-token --value <TOKEN>
   ```

   トークンが無い間も送信は受け付け、DynamoDB にだけ保存されます（issue は作られない）。
   なお SSM は `aws` / `ssm` で始まる名前（`/aws-xxx/...` のような先頭階層も含む）を予約しているため使えません。
   Git Bash で実行する場合は `/` 始まりの引数がパス変換されるので `MSYS_NO_PATHCONV=1` を付けてください。

4. `js/config.js` の `FEEDBACK_API_URL` に手順 1 の URL を設定して公開すると、フィードバックの「送信」がアカウント不要の直接送信に切り替わり、Good / Bad 投票も送られるようになります。空文字に戻せば従来の挙動です。

5. 動作確認

   ```powershell
   curl.exe https://<FunctionUrl>/health
   ```

## 運用

- **停止**: `sam deploy ... --parameter-overrides AcceptSubmissions=false`
- **集計**: `node scripts/export-feedback.mjs` で `feedback-export/` に CSV（自由記述 / 投票イベント / 対象ごとの Good・Bad 集計）を書き出します。表計算ソフトや Amazon Quick（後述）にそのまま渡せます。
- **データ保持**: フィードバックは約 400 日、投票は約 800 日で TTL により自動削除。IP は生値を保存せず、スタック固有のソルト付きハッシュのみ保持します。
- **ログ**: `/aws/lambda/<関数名>`（14 日保持）。GitHub 投稿失敗は `github_issue_failed` で出力されます。

## BI（Amazon Quick）について

2026-10 時点の Amazon Quick の料金体系では、**Free / Plus / Max プランには Quick Sight（BI ダッシュボード / データセット作成）が含まれません**。ダッシュボード作成は AWS アカウント経由の Enterprise プラン（$40/ユーザー/月 + アカウントあたり $250/月のインフラ料金）が必要で、30 日間の無料トライアル後は自動的に Enterprise として課金が始まります。DynamoDB を直接の接続先にもできず、Athena の DynamoDB コネクタ（Lambda + Glue）を挟む必要があります。

そのため本構成では BI 連携を常設せず、次のように使うことを想定しています。

- 定期的に `scripts/export-feedback.mjs` で CSV を出し、**Quick の Free プラン（AWS アカウント不要）のチャット / Spaces に渡して傾向を要約させる**、または表計算ソフトで集計する。
- 本格的なダッシュボードが必要になった時点で、DynamoDB → S3 エクスポート → Athena → Quick Sight（Enterprise）へ拡張する（設計は [`docs/action-required/issue-167-feedback-analytics-dynamodb.md`](../../docs/action-required/issue-167-feedback-analytics-dynamodb.md)）。
