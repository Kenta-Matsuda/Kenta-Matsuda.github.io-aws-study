# フィードバック収集バックエンド（#162 / #167 / #32）

GitHub アカウント無しのフィードバック送信（#162）と、Good / Bad 投票の集約（#167）、オプトイン制のグローバル XP ランキング（#32）を受け持つ最小構成のサーバレススタックです。

```
ブラウザ（GitHub Pages）
   │ POST /feedback, POST /votes, POST /events, POST /leaderboard/xp, POST /leaderboard/leave
   │ （text/plain の JSON = CORS プリフライト無し） / GET /leaderboard?period=...
   ▼
Lambda Function URL（API Gateway は使わない）── CORS / Origin を GitHub Pages に限定
   │ 入力検証・ハニーポット・送信までの経過時間チェック・IP 単位レート制限・停止スイッチ
   ├─▶ DynamoDB（オンデマンド, TTL で自動削除）… フィードバック本文・投票イベント・レート制限カウンタ・ランキング集計
   ├─▶ S3（非公開）+ CloudFront（OAC）… 添付スクリーンショット（最大 3 枚）。issue 本文に CloudFront の URL で埋め込む
   └─▶ GitHub REST API … SSM の fine-grained PAT で issue を代理作成（ラベル feedback / from-app）
```

添付画像はブラウザ側で縮小・WebP（非対応なら JPEG）に再エンコードしてから送ります（EXIF の位置情報なども消えます）。Lambda はファイルシグネチャで JPEG / PNG / WebP だけを受け付け、推測できないランダムなキーで保存します。画像は issue に埋め込まれるため**公開**扱いで、期限による自動削除はしていません（削除すると issue の画像が切れるため）。

## グローバル XP ランキング（#32）

設定の「ランキングに参加する」をオンにした利用者だけが XP を送信します（既定はオフ）。閲覧は誰でもできます。

| ルート | 内容 |
| --- | --- |
| `POST /leaderboard/xp` | `{ token, name, xp, batchId }`。`xp` は 1〜1000 の整数。日 / 週 / 月 / 累計の 4 バケットへ 1 回のトランザクションで加算 |
| `GET /leaderboard?period=daily\|weekly\|monthly\|all&limit=50&me=<公開ID>` | 上位 N 件（最大 100）と、`me` を渡した場合は本人の順位 |
| `POST /leaderboard/leave` | `{ token }`。現在と直前の各期間バケットから本人を削除（参加をオフにしたときにクライアントが送る） |

- **識別子**: アカウントは無く、ブラウザが生成したランダムな 128 bit の `token`（書き込み用の秘密値）だけで識別します。保存・表示されるのは `sha256("lb|" + token)` 先頭 20 桁の公開 ID だけで、token 自体は保存しません。公開 ID からは書き込めません。
- **期間の境界は UTC** です（毎日 0:00 UTC = 日本時間 9:00 に切り替え、週は ISO 8601 の月曜始まり、キー例 `2026-W42`）。どのバケットに入るかはサーバ時刻で決まり、クライアントの時刻は使いません。
- **キー設計**（既存の単一テーブルを共用）

  | pk | sk | 内容 | TTL |
  | --- | --- | --- | --- |
  | `lb#daily#2026-10-13` | 公開 ID | `xp`, `name`, `updated_at` | 期間終了 + 2 日 |
  | `lb#weekly#2026-W42` | 公開 ID | 同上 | 期間終了 + 7 日 |
  | `lb#monthly#2026-10` | 公開 ID | 同上 | 期間終了 + 31 日 |
  | `lb#all` | 公開 ID | 同上 | なし |
  | `lbu#<公開ID>` | `day#2026-10-13` | 1 日の XP 上限カウンタ | 当日終了 + 2 日 |
  | `lbb#<公開ID>` | `batchId` | 再送の重複排除マーカー | 3 日 |

- **不正対策（限界あり）**: 1 リクエスト最大 1,000 XP、1 人 1 日最大 5,000 XP（超過分は切り捨て）、IP 単位で 1 分 20 回、表示名は制御文字・不可視文字（双方向制御など）を除去して 30 文字まで、同じ `batchId` の再送は加算しない、Origin 制限。ただし静的サイトなので、token を作り直せば別人として参加でき、XP の正当性（実際に学習したか）も検証できません。**ランキングは目安であり、完全な不正防止はしていません。** 不適切な表示名や明らかな水増しは、DynamoDB コンソールで該当の `lb#...` / 公開 ID のアイテムを削除してください。
- **読み出し**: 期間バケットを Query で全件読み（最大 10 ページ）、Lambda 内で並べ替えて 30 秒キャッシュします。参加者が数万人規模になったら GSI（xp ソート）や定期集計への切り替えを検討してください。
- **停止スイッチ**: `AcceptSubmissions=false` で XP の書き込みは止まりますが、閲覧と退出（削除）は動き続けます。

## コスト

このサイトの規模なら **AWS の常時無料枠内**に収まる想定です（すべて 2026-10 時点）。

| リソース | 無料枠 | 備考 |
| --- | --- | --- |
| Lambda + Function URL | 月 100 万リクエスト / 40 万 GB 秒（常時無料） | Function URL 自体は追加料金なし。API Gateway を使わないので 12 か月制限の枠に依存しない |
| DynamoDB オンデマンド | 25 GB ストレージ（常時無料） | 書き込みは 100 万件あたり約 $0.7 程度の従量。投票 1 件 = 書き込み約 2 件 |
| SSM Parameter Store（Standard） | 無料 | Secrets Manager（$0.40/月）は使わない |
| CloudWatch Logs | 5 GB 取り込み（常時無料） | 保持 14 日 |
| S3 + CloudFront | CloudFront は月 1 TB 転送 / 1,000 万リクエスト（常時無料） | S3 保存は約 $0.025/GB 月。スクリーンショット数千枚でも月数セント |

- **ランキング**: XP 送信 1 回 = 6 アイテムのトランザクション（約 12 WRU）。クライアントは最大約 2 分に 1 回にまとめて送ります。例: 参加者 300 人 × 月 15 日 × 1 日 8 回 ≒ 3.6 万リクエスト ≒ 43 万 WRU ≒ **月 $0.6 程度**（東京リージョン単価）。閲覧は 30 秒キャッシュのため読み取りはごくわずかです。
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

4. `js/config.js` の `FEEDBACK_API_URL` に手順 1 の URL を設定して公開すると、フィードバックの「送信」がアカウント不要の直接送信に切り替わり、Good / Bad 投票も送られるようになります。グローバルランキング（#32）も同じ URL を使います。空文字に戻せば従来の挙動です（ランキングは「利用できません」表示になります）。

5. 動作確認

   ```powershell
   curl.exe https://<FunctionUrl>/health
   # ランキング（Origin 制限があるので許可済みオリジンを付ける）
   curl.exe -H "Origin: https://kenta-matsuda.github.io" "https://<FunctionUrl>/leaderboard?period=weekly"
   ```

ランキング機能（#32）を追加したバージョンへの更新は、既存スタックに対して手順 1 の `sam build` → `sam deploy` を再実行するだけです（Lambda のコードと IAM ポリシー〔Query / GetItem / DeleteItem / ConditionCheckItem の追加〕が更新されます。テーブルの作り直しはありません）。初回に `--parameter-overrides`（`BudgetEmail` など）を付けた場合は同じ値を付けてください（`samconfig.toml` に保存済みなら不要）。

## 運用

- **停止**: `sam deploy ... --parameter-overrides AcceptSubmissions=false`
- **集計**: `node scripts/export-feedback.mjs` で `feedback-export/` に CSV（自由記述 / 投票イベント / 対象ごとの Good・Bad 集計）を書き出します。問題単位の学習イベント（`POST /events`、issue #225 §9: 生成・回答・セット完了。問題文は含まず ID のみ）は `node scripts/export-learning-events.mjs` で `learning-events.csv` と `unit-summary.csv`（試験 × 出題単位ごとの回答数・正答率）を書き出します。表計算ソフトや Amazon Quick（後述）にそのまま渡せます。
- **データ保持**: フィードバックは約 400 日、投票は約 800 日で TTL により自動削除。IP は生値を保存せず、スタック固有のソルト付きハッシュのみ保持します。ランキングの日 / 週 / 月バケットは期間終了から 2 / 7 / 31 日後に自動削除。累計（`lb#all`）は参加者が退出するまで残ります（退出しないまま端末のデータを消した参加者の累計行は残り続けるため、必要なら手動で削除してください）。
- **ログ**: `/aws/lambda/<関数名>`（14 日保持）。GitHub 投稿失敗は `github_issue_failed` で出力されます。

## BI（Amazon Quick）について

2026-10 時点の Amazon Quick の料金体系では、**Free / Plus / Max プランには Quick Sight（BI ダッシュボード / データセット作成）が含まれません**。ダッシュボード作成は AWS アカウント経由の Enterprise プラン（$40/ユーザー/月 + アカウントあたり $250/月のインフラ料金）が必要で、30 日間の無料トライアル後は自動的に Enterprise として課金が始まります。DynamoDB を直接の接続先にもできず、Athena の DynamoDB コネクタ（Lambda + Glue）を挟む必要があります。

そのため本構成では BI 連携を常設せず、次のように使うことを想定しています。

- 定期的に `scripts/export-feedback.mjs` で CSV を出し、**Quick の Free プラン（AWS アカウント不要）のチャット / Spaces に渡して傾向を要約させる**、または表計算ソフトで集計する。
- 本格的なダッシュボードが必要になった時点で、DynamoDB → S3 エクスポート → Athena → Quick Sight（Enterprise）へ拡張する（設計は [`docs/action-required/issue-167-feedback-analytics-dynamodb.md`](../../docs/action-required/issue-167-feedback-analytics-dynamodb.md)）。
