# Good / Bad フィードバックを DynamoDB に集約し BI で可視化する

🔴 未対応（要対応）

- 種別: 要人間対応（バックエンド / AWS インフラ / データ保持方針）
- 関連: #167（本件） / #162（同じ API 基盤に載る） / [バックエンド実装計画（アンブレラ）](issue-117-backend-implementation-plan.md)
- 位置づけ: 本ファイルは**設計と人間側の作業の引き継ぎ**です。エージェントは `aws` 操作を**一切実行していません**。記載するコマンドは AWS 権限を持つ人間が精査・調整して実行するための提案（テキスト）です。

## 症状（と前提の訂正）

issue #167:

> Lambda を使って、google analytics に送っていた good bad とかそのあたりのフィードバック一式を
> DynamoDB に送れるようにしたい。これまでの移行計画と合わせて設計を考えてほしい。で、BI ツールの
> Amazon quick とかと連携できたら最高

**先に 1 点訂正させてください。現在のコードには Google Analytics（あるいは他のアクセス解析）は入っていません。**

- `index.html` の外部スクリプトは Tailwind CDN / Chart.js / Font Awesome の 3 つだけで、`gtag(` / `googletagmanager` / `sendBeacon` の呼び出しはリポジトリ内に**存在しません**（確認済み）。
- Good / Bad は `js/votes.js` が `localStorage`（キー `asn_votes_v1`）に保存するだけで、**端末の外へ出ていません**。

つまり本件は「GA から DynamoDB への**移行**」ではなく、**そもそも収集されていないフィードバックを初めて集約する新規構築**になります。裏を返すと、**移行の互換性を気にせずスキーマを最初から設計できる**という利点があります。

## 現在どんなデータが手元にあるか

`js/votes.js` の `submitVote()` / `clearVote()` が受け取り、localStorage に持っている情報です。そのまま送信ペイロードの土台にできます。

| 項目 | 内容 |
| --- | --- |
| `targetType` | `ai`（AI 回答）/ `resource`（学習リソース） |
| `targetId` | 投票対象の識別子（AI: `explain\|{examId}\|{term}` / `quiz\|{examId}\|{taskId}`、リソース: リソース単位の ID） |
| `value` | `good` / `bad` |
| `at` | ISO8601 の投票時刻 |
| `meta` | `exam_id` / `ai_kind` / `ai_term` / `ai_task_id` / `ai_task_title` / `domain_id` / `resource_section` / `resource_title` / `resource_url` など |

あわせて、学習の実績側（`asn_quiz_history_v1`、`getQuizAnalytics()` が集計）にも正答率・ドメイン別成績があり、BI で突き合わせると「どのリソース / 解説が実際に正答率を上げているか」まで見られます。

## 提案アーキテクチャ

#162 の投稿プロキシと**同じ API 基盤を共用**します（エンドポイントを 1 本増やすだけ）。

```
ブラウザ（GitHub Pages）
   │ POST /events  { events: [ {type:'vote', ...}, ... ] }   ← まとめ送り（beacon 相当）
   ▼
Amazon API Gateway (HTTP API)  ── CORS を https://kenta-matsuda.github.io に限定
   │
   ▼
AWS Lambda（Node.js）── 入力検証・匿名 ID の付与・PII 除去
   │
   ▼
Amazon DynamoDB（オンデマンド課金）
   │  ┌ 直接可視化するなら: DynamoDB → S3 エクスポート → Athena → BI
   └─┤
      └ 継続的に流すなら: DynamoDB Streams → Firehose → S3（Parquet）→ Glue Catalog → Athena → BI
                                                                                        ▼
                                                                          Amazon Quick Sight（BI）
```

### DynamoDB テーブル設計（案）

イベントを追記するだけの設計にし、集計は BI 側で行います（RDB 的な正規化はしない）。

| 属性 | 例 | 役割 |
| --- | --- | --- |
| `pk`（パーティションキー） | `vote#ai#quiz\|clf-c02\|1.1` | 投票対象単位。対象ごとの good/bad 集計が 1 クエリで取れる |
| `sk`（ソートキー） | `2026-09-06T07:12:33.123Z#<ランダム>` | 時系列。範囲クエリで期間絞り込み |
| `type` | `vote` / `feedback` | 将来イベント種別が増えても同居できる |
| `value` | `good` / `bad` | — |
| `exam_id`, `domain_id`, `task_id` | `clf-c02`, `1`, `1.1` | 集計軸 |
| `resource_url`, `resource_title` | — | リソース評価の集計軸 |
| `anon_id` | Lambda 側で発行する匿名 ID（後述） | 同一ブラウザの重複投票の除外に使う |
| `app_version`, `locale` | — | 変更の前後比較に使う |
| `ttl` | エポック秒 | 保持期間を決めて自動削除（後述） |

- **GSI 案**: `exam_id`（PK）+ `sk`（SK）で「試験ごとの時系列」を引けるようにする。BI 用途なら S3 + Athena に流す方が柔軟なので、GSI は運用に必要な最小限で足ります。
- **課金モード**: 投票は低頻度（バースト的）なのでオンデマンドが素直です。

### プライバシー / 個人情報の扱い（設計前に決めること）

これは技術選定より先に決める必要があります。

- **匿名 ID は端末側で生成した UUID を送る**か、**送らない**か。UUID を送ると「同一ブラウザの重複投票除外」や「継続利用の分析」ができますが、疑似識別子となるためプライバシーポリシーへの記載が必要です。IP アドレスは**保存しない**方針を推奨します（濫用対策で必要ならハッシュ化 + 短期 TTL）。
- **収集内容の明示と同意**。現状のフィードバックはローカル保存のみなので、送信を始めるなら UI 上での説明（および `SECURITY.md` / プライバシー記載の更新）が必要です。
- **保持期間**。DynamoDB の TTL で自動削除する期間（例: 生イベント 13 か月、集計結果は無期限）を決めてください。
- **自由記述テキストを送るかどうか**。Good / Bad だけなら PII リスクは低いですが、フィードバック本文（#162）を同じテーブルに入れるなら扱いが変わります。**別テーブル / 別保持期間**を推奨します。

### BI ツール（名称の確認結果）

2026-09-06 に実測したところ、`https://aws.amazon.com/quicksight/` は **`https://aws.amazon.com/quick/quicksight/`（タイトル: "AI-Powered Business Intelligence – Quick Sight – AWS"）へリダイレクト**され、`https://aws.amazon.com/quick/` は "AI Assistant - Amazon Quick - AWS" でした。つまり BI 機能は **Amazon Quick 傘下の "Quick Sight"** という位置づけです。本リポジトリの試験データでも、AIB-C01 / AIP-C01 のスコープ内サービスとして「Amazon Quick」を採用しています。

- 接続方法は **Athena データソース**が最も素直です（S3 に Parquet で置き、Glue Catalog に登録 → Athena → Quick Sight）。DynamoDB を直接データソースにはできません。
- 費用は**ユーザー単位の月額**が発生します。閲覧者が自分だけなら 1 ユーザー分から始められます。CloudWatch ダッシュボードや Athena のクエリ結果で足りるなら、BI 導入は後回しにできます（費用対効果の判断が必要）。

## 段階的な進め方（推奨）

一度に全部作らず、価値が出る順に区切ることを推奨します。

1. **フェーズ 1（収集の開始）**: `/events` エンドポイント + Lambda + DynamoDB。可視化は CloudWatch Logs Insights と Athena（S3 エクスポート）で十分。ここまでで「どの解説 / リソースが Bad か」は分かります。
2. **フェーズ 2（分析基盤）**: DynamoDB Streams → Firehose → S3（Parquet）→ Glue Catalog。日次パーティションにする。
3. **フェーズ 3（BI）**: Quick Sight を Athena に接続してダッシュボード化。ここで初めてユーザー単位の月額費用が発生します。
4. **フェーズ 4（学習成果との突き合わせ）**: クイズ履歴（正答率）も同じ経路で送り、「Bad の多い解説と正答率の低いドメイン」を重ねて見る。

## 要人間対応事項

⚠️ 要人間対応: AWS操作が必要

- 必要な操作内容:
  1. プライバシー方針（匿名 ID の有無 / 保持期間 / 収集項目 / 同意表示）を決定する。
  2. DynamoDB テーブル（オンデマンド + TTL）を作成する。
  3. Lambda（イベント受信）と API Gateway のルートを追加し、CORS をオリジン限定にする。WAF / スロットリングを適用する。
  4. フェーズ 2 以降を進める場合、Firehose / S3 / Glue / Athena を用意する。
  5. Quick Sight を使う場合、サブスクリプションとユーザー数・費用上限を決める。
- 対象リソース: DynamoDB テーブル 1 個、Lambda 関数 1 個、API Gateway ルート 1 本（#162 と共用可）、（フェーズ 2 以降）Firehose 1 本 + S3 バケット 1 個 + Glue Database/Table、（フェーズ 3）Quick Sight サブスクリプション
- 想定コマンド（**未実行の提案**）:

```bash
# 1) イベントテーブル（オンデマンド + TTL）
aws dynamodb create-table \
  --table-name asn-feedback-events \
  --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
  --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
aws dynamodb update-time-to-live \
  --table-name asn-feedback-events \
  --time-to-live-specification 'Enabled=true,AttributeName=ttl'

# 2) Lambda 実行ロールに書き込み権限（PutItem のみ）
aws iam put-role-policy --role-name asn-events-ingest-role \
  --policy-name ddb-put-only --policy-document file://policy-ddb-put.json

# 3) 分析用に S3 へエクスポート（フェーズ 2 の簡易版）
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:<REGION>:<ACCOUNT_ID>:table/asn-feedback-events \
  --s3-bucket asn-analytics-<ACCOUNT_ID> --export-format DYNAMODB_JSON
```

## エージェント側で対応できる作業（バックエンドができたら）

- **[エージェント可]** `js/votes.js` に**送信を追加**する（localStorage 保存は維持し、送信は best-effort。失敗しても UI を壊さない）。
- **[エージェント可]** 送信のバッチ化・オフライン時のキューイング（`localStorage` に溜めて次回起動時に送る）。
- **[エージェント可]** 収集内容の説明 UI とオプトアウト設定（設定モーダルにトグルを追加）。
- **[エージェント可]** エンドポイント未設定時は送信しない（既存挙動のまま）フォールバック。
- **[エージェント可]** Playwright で `page.route` により送信をスタブし、成功 / 失敗 / 未設定 / オプトアウトの回帰テストを書く。

## 次のアクション（人間）

1. **プライバシー方針を決める**（これが決まらないと収集を始められません）。
2. フェーズ 1 のリソース（DynamoDB + Lambda + ルート）を作成するか判断する。
3. エンドポイントとオプトアウト方針が決まった時点で、クライアント側の送信実装をエージェントに依頼する。
