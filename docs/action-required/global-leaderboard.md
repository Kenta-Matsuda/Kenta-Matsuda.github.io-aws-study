# グローバルリーダーボード（毎日 / 毎週 / 毎月 / 累積の XP ランキング）

🔴 未対応（要対応）

- 種別: 要人間対応（バックエンド / AWS インフラ）
- 関連: #32
- 補足: 本ファイルに記載する AWS リソース・コマンドは、**AWS 権限を持つ人間が検討・実行するための提案**です。エージェントは AWS 操作（`aws` / `sam` / `cdk` / `terraform` など）を一切実行しません。

## 症状

issue #32 が求める「毎日 / 毎週 / 毎月 / 累積のグローバル XP ランキング」を、現状のコードベースでは実装できません。

- 複数ユーザーの XP を**横断的に集計・共有**し、ランキングとして返す仕組みが存在しない。
- XP を書き込む先（サーバ側の永続ストア）と、それを読み出す API が無い。
- そのため「他のユーザーと比較したランキング」を表示する UI を作っても、表示すべきデータを取得できない。

## 推定原因

これは不具合ではなく、**アーキテクチャ上の制約**に起因します。

- このサイトは **ビルドステップの無い静的 PWA（Vanilla JS + HTML）** で、**GitHub Pages** から配信される純粋なフロントエンドです。
- **バックエンド（サーバ / API / データベース）が存在しません。** XP を含む学習状態は各ブラウザの `localStorage`（`js/storage.js`）にのみ保存され、端末外には出ません。
- グローバルリーダーボードは本質的に「**複数ユーザーのデータを 1 か所に集約し、全員へ共有する**」機能であり、クライアント単体（ブラウザ内のローカルデータのみ）では成立しません。集計・永続化・共有を担うサーバ側コンポーネントが必須です。
- したがって、XP ランキング機能の実現には、静的サイトの外に**書き込み経路（Write API）+ データストア + 集計 / 読み出し経路（Read API）**を用意する必要があり、これは AWS などのインフラ構築＝人間の対応が必要です。

## 切り分け手順

要人間対応と判断するに至った確認手順は次のとおりです。

1. **既存の永続層を確認する。** `js/storage.js` を確認し、XP・学習履歴が `localStorage` にのみ保存され、外部送信経路が無いことを確認する。
2. **バックエンド有無を確認する。** リポジトリ内に API サーバ / サーバレス関数 / データベース定義・接続設定が存在しないことを確認する（`js/` はすべてブラウザで動くクライアントモジュール）。
3. **配信形態を確認する。** GitHub Pages 配信の静的サイトであり、サーバサイド実行環境が無いことを確認する。
4. **機能要件との突き合わせ。** issue #32 の要件（毎日 / 毎週 / 毎月 / 累積の**グローバル**ランキング）は複数ユーザー横断の集計・共有を必須とするため、クライアントのみでは実装不能と結論づける。

上記より、クライアントサイドで前進できる成果物は「実装ではなく、この構造化された設計・引き継ぎドキュメント」であると判断した。

## 要人間対応事項

グローバルリーダーボードを実現するには、静的サイトの外にバックエンドを用意する必要があります。以下は AWS 権限を持つ人間が検討・実行するための**設計案と想定コマンド**です（エージェントは実行しません）。

### バックエンド設計案（概要）

複数ユーザーの XP を集計し、毎日 / 毎週 / 毎月 / 累積の 4 種類のランキングを返す構成の一例:

- **書き込み経路（Write API）**: クライアントが学習で XP を獲得したタイミングで、`{ userId, displayName, xpDelta, timestamp }` を送信する HTTP エンドポイント。認証（匿名 ID or 軽量サインイン）とレート制限、入力検証を伴う。
- **データストア**: ユーザー単位の XP と、集計単位（日 / 週 / 月 / 累積）ごとの合計を保持する。
- **集計 / 読み出し経路（Read API）**: 期間（daily / weekly / monthly / all-time）を指定して上位 N 件のランキングを返すエンドポイント。負荷対策として結果はキャッシュ / 事前集計する。
- **クライアント改修**: `js/storage.js` に「XP 獲得時にサーバへ非同期送信」する経路を追加し、ランキング表示 UI から Read API を呼ぶ。バックエンド未接続時は機能を無効化するフォールバックを持たせる。

期間別ランキングの実現方式の一例:

- **時系列イベントを保存し、読み出し時に期間で集計**する方式（柔軟だが集計コストが高い）。
- **期間キーを持つ集計行を先に持つ**方式（例: パーティションキーに `LEADERBOARD#DAILY#2026-09-03` のような期間バケットを使い、書き込み時に該当バケットへ加算）。読み出しが軽く、リーダーボード向き。日次 / 週次 / 月次バケットには TTL を設定し、累積は別途保持する。

### 候補 AWS リソース

上記設計を AWS で構築する場合の候補（いずれも人間が構成を検討・決定するもの）:

- **Amazon DynamoDB**: XP 集計行・ランキング用テーブル。期間バケットをキーに設計し、TTL で日次 / 週次 / 月次データを自動失効させる案。
- **AWS Lambda**: Write / Read API の処理本体（サーバレス）。
- **Amazon API Gateway**（HTTP API）: クライアントからの Write / Read エンドポイントを公開。CORS を GitHub Pages のオリジンに限定。
- **Amazon Cognito**（任意）: 匿名 / 軽量認証でユーザーを識別し、なりすまし・多重投稿を抑止。
- **AWS WAF / スロットリング**（任意）: 不正な書き込み・過剰リクエストの抑止。
- **IaC**: AWS SAM または AWS CDK でスタックとして管理する案。

> なお issue #32 のコメントで「DynamoDB を使った場合の月額コスト試算」が求められています。試算には想定 MAU・XP 更新頻度・ランキング参照頻度が必要です。以下の「DynamoDB 月額コスト試算」セクションに、前提値を明示したうえでの机上見積もりをまとめました。

## DynamoDB 月額コスト試算（机上見積もり）

issue #32 のメンテナコメントで求められた「DynamoDB を使った場合の月額コスト試算」に応えるための机上見積もりです。**実際の AWS 操作（`aws` / Pricing API 等）は一切行っていません。** 数値は一般に知られた概算レンジであり、確定値ではありません。

> ⚠️ **料金は変動します。** 下記の単価は東京リージョン（ap-northeast-1）のオンデマンド料金の「代表値」として引用した概算です。**必ず公式の [AWS DynamoDB 料金ページ](https://aws.amazon.com/jp/dynamodb/pricing/) および [AWS Pricing Calculator](https://calculator.aws/) で人間が最新の確定値を再確認してください。** 為替・値下げ・リージョン差・課金体系の変更により結果は変わります。

### 前提値（ここが変われば結果も変わります）

本サイトの実績・規模から次を仮定します。前提はすべて仮置きであり、確定には運用実測が必要です。

- **総ユーザー数（登録ベース）**: 約 4,500 人（2026 年 2 月リリース、これまでに 2 回バズった経緯）。
- **月間アクティブユーザー（MAU）**: 総登録 4,500 人の全員が毎月アクティブとは限らないため、レンジで想定する。
  - 保守的シナリオ: MAU ≈ 900 人（登録の約 20%）
  - 楽観的シナリオ: MAU ≈ 2,250 人（登録の約 50%）
- **1 ユーザーあたり 1 日の XP 獲得イベント数（= Write のトリガー回数）**: 学習セッションで問題に回答するたびに XP を獲得すると想定し、**1 日 20 イベント**と仮定。
- **アクティブ日数**: MAU のうち、月あたり平均 **15 日** 学習すると仮定（毎日ではない）。
- **ランキング参照頻度（= Read のトリガー回数）**: 1 ユーザーが 1 アクティブ日あたり **5 回** リーダーボードを開くと仮定。
- **書き込み増幅**: 既存設計に従い、1 回の XP 獲得を **daily / weekly / monthly / all-time の 4 バケット** へ加算する（= 1 イベントあたり **4 Write**）。
- **読み出し増幅**: 1 回のランキング参照で、4 種別のうち平均 **2 種別** を表示し、それぞれ上位 N 件（例: 上位 100 件）を取得すると想定。上位 N 件取得は 1 回の `Query` で最大 100 件を返すため、**1 種別あたり実質 1 read オペレーション相当**として概算（RCU 換算は後述）。

### DynamoDB のコスト構成要素（オンデマンド / PAY_PER_REQUEST）

- **Write Request Unit（WRU）**: 1 KB までの標準書き込み 1 回 = 1 WRU。東京リージョン代表値 **約 $1.4246 / 100 万 WRU**。
- **Read Request Unit（RRU）**: 4 KB までの結果整合性読み取り 1 回 = 0.5 RRU（強整合は 1 RRU）。東京リージョン代表値 **約 $0.285 / 100 万 RRU**。
- **ストレージ**: **約 $0.285 / GB-月**。
- **TTL 削除**: 期限切れアイテムの TTL 削除は **無料**（日次 / 週次 / 月次バケットの自動失効に有効）。
- **DynamoDB Streams（任意）**: 有効化する場合は読み取りリクエスト（GetRecords）に課金。今回の基本構成では未使用として試算。

集計行は 1 件あたり 1 KB 未満（userId / displayName / xp 合計 / 期間キー程度）を想定するため、Write は基本的に **1 WRU / 回**、ランキングの上位 100 件取得は返却データ数十〜100KB 規模で **数十 RRU / 回** に収まる想定とします。

### Write / Read 回数の積み上げ

**保守的シナリオ（MAU = 900 人）**

| 項目 | 計算 | 月間回数 |
|---|---|---|
| XP 獲得イベント | 900 人 × 20 回/日 × 15 日 | 270,000 |
| Write 回数（×4 バケット） | 270,000 × 4 | 1,080,000 WRU |
| ランキング参照 | 900 人 × 5 回/日 × 15 日 | 67,500 |
| Read オペレーション（×2 種別） | 67,500 × 2 | 135,000 回 |
| Read（上位100件 ≒ 25 RRU/回で概算） | 135,000 × 25 | 3,375,000 RRU |

**楽観的シナリオ（MAU = 2,250 人）**

| 項目 | 計算 | 月間回数 |
|---|---|---|
| XP 獲得イベント | 2,250 人 × 20 回/日 × 15 日 | 675,000 |
| Write 回数（×4 バケット） | 675,000 × 4 | 2,700,000 WRU |
| ランキング参照 | 2,250 人 × 5 回/日 × 15 日 | 168,750 |
| Read オペレーション（×2 種別） | 168,750 × 2 | 337,500 回 |
| Read（上位100件 ≒ 25 RRU/回で概算） | 337,500 × 25 | 8,437,500 RRU |

### 月額試算結果（DynamoDB 単体・レンジ）

| 費目 | 単価（代表値） | 保守的（MAU 900） | 楽観的（MAU 2,250） |
|---|---|---|---|
| Write | $1.4246 / 100万 WRU | 1.08M × 1.4246 ≈ **$1.54** | 2.70M × 1.4246 ≈ **$3.85** |
| Read | $0.285 / 100万 RRU | 3.375M × 0.285 ≈ **$0.96** | 8.4375M × 0.285 ≈ **$2.40** |
| ストレージ | $0.285 / GB-月 | 1GB 未満 ≈ **$0.29 未満** | 1GB 未満 ≈ **$0.29 未満** |
| TTL 削除 | 無料 | $0 | $0 |
| **DynamoDB 合計（概算）** | | **約 $3 〜 $4 / 月** | **約 $6 〜 $7 / 月** |

**結論: この規模（数千ユーザー）では、DynamoDB 単体のオンデマンド課金は月額数ドル規模** に収まる見込みです。さらに **AWS 無料利用枠（Free Tier）** を考慮すると、実質ゼロ〜数ドルに近づく可能性があります（DynamoDB には 25GB のストレージ無料枠等があります。無料枠の内容・適用条件も変動しうるため公式で要確認）。

### 総額を出すには周辺コストの合算が必要

上記は **DynamoDB 単体** の試算です。実際のグローバルリーダーボードには以下が加わり、**これらを合算しないと総額にはなりません**。

- **API Gateway（HTTP API）**: リクエスト従量課金（代表値: 100 万リクエストあたり約 $1〜。Write + Read のリクエスト数に比例）。
- **AWS Lambda**: 実行回数 + 実行時間（GB 秒）課金。軽量ハンドラなら無料枠内に収まりやすいが、リクエスト数が多いと積み上がる。
- **データ転送 (Egress)**: レスポンス送出のアウトバウンド転送。ランキング JSON は小さいが、参照回数が多いと無視できない。
- **Cognito / WAF（任意）**: 認証・不正対策を入れる場合は別途課金。

これらを含めても、本サイト規模なら **総額は月額十数ドル以下のオーダー** に収まる可能性が高いですが、確定には Pricing Calculator での積算が必要です。

### スパイク（バズ）時のリスク

- 本サイトは過去 2 回バズった実績があり、**突発的なアクセス集中時にはオンデマンド課金がそのままスパイク**します（オンデマンドはトラフィックに比例課金のため、青天井になりうる）。
- 対策として、**API Gateway / Lambda のスロットリング**、DynamoDB のリクエスト上限監視、CloudWatch による **請求アラート（Budgets）** の設定を推奨します。
- 恒常的に高トラフィックが見込める場合は、オンデマンドではなく **プロビジョンド + Auto Scaling** の方が単価が下がるケースもあるため、実測後に課金モードを再評価してください。

> 繰り返しになりますが、上記の単価・無料枠・計算はすべて概算です。**確定値は公式の [AWS Pricing Calculator](https://calculator.aws/) と [DynamoDB 料金ページ](https://aws.amazon.com/jp/dynamodb/pricing/) で人間が再確認してください。**

## DynamoDB を DB として使う場合のセキュリティ付帯サービス設計

issue #32 のメンテナコメント「**実際に DB として DynamoDB を使うとしたとき、セキュリティ面の付帯サービスも考慮して計画してほしい**」に応えるためのセキュリティ設計です。DynamoDB 単体ではなく、**認証・暗号化・アクセス制御・監査・可用性・DDoS 対策までを含む「付帯サービス」を一体で計画**します。以下はすべて **AWS 権限を持つ人間が検討・実行するための提案**であり、エージェントは AWS 操作（`aws` / `sam` / `cdk` / `terraform` など）を一切実行しません。記載する `aws` コマンドはすべて人間が精査・調整のうえ実行する例です。

> 設計原則: **多層防御（Defense in Depth）** と **最小権限（Least Privilege）**。ネットワーク・認証・データ・監査の各層で独立に守り、いずれか 1 層が破られても影響を限定します。

### 1. 保管時暗号化（Encryption at Rest）

- DynamoDB はデフォルトで保管時暗号化が有効。鍵の選択肢は 3 つ:
  - **AWS 所有キー（AWS owned）**: 追加料金なし・運用不要だが、キーの可視性・監査性・キーポリシー制御が無い。
  - **AWS マネージドキー（`aws/dynamodb`）**: アカウント内の KMS キーで CloudTrail に鍵利用が記録される。追加の KMS 料金が一部発生。
  - **カスタマー管理キー（KMS CMK）**: キーポリシー・キーローテーション・失効（アクセス遮断）・使用状況の監査までを自前で制御可能。**その代わり KMS のキー保管料（$1/月・鍵）と API リクエスト課金が加わる**。
- **トレードオフ:** 学習用途・低機密であればコスト重視で AWS 所有 / マネージドキーでも十分。ただし「XP・表示名という個人にひも付くデータ」を扱い、監査要件（誰がいつ復号したか）やキー失効による緊急アクセス遮断を将来求めるなら **KMS CMK を推奨**。CMK は後からの切り替えにコストと移行手間がかかるため、初期に方針を決めておく。

### 2. 通信時暗号化 / TLS（Encryption in Transit）

- クライアント（ブラウザ）→ API Gateway → Lambda → DynamoDB の全経路を **TLS 1.2 以上**で暗号化する。
- API Gateway / CloudFront では **TLS 1.2 以上を強制**する最小 TLS バージョンポリシーを設定。カスタムドメインを使う場合は **ACM 証明書**を用いる。
- DynamoDB / KMS への AWS SDK 呼び出しは既定で HTTPS。**エンドポイントポリシーや IAM の `aws:SecureTransport` 条件で HTTP（非 TLS）アクセスを明示的に拒否**する。

### 3. 最小権限の IAM ポリシー・ロール

- Lambda の実行ロールには **DynamoDB フルアクセスを与えない**。テーブル ARN を限定し、必要な API だけ（Write ハンドラは `PutItem`/`UpdateItem`、Read ハンドラは `Query`/`GetItem`）を許可する。
- Write 用ロールと Read 用ロールを **分離**し、Read ロールに書き込み権限を与えない。
- KMS CMK を使う場合は、その Lambda ロールにのみ `kms:Decrypt` / `kms:GenerateDataKey` を、対象 CMK ARN 限定で付与する。
- 管理者操作（テーブル作成・削除）はデプロイ用ロール / IaC 実行者に限定し、実行時ロールからは除外する。

  ```bash
  # 例: Read ハンドラ用の最小権限ポリシー（人間が精査・調整のうえ適用する提案）
  # dynamodb:Query / GetItem のみ、対象テーブルとその index に限定する。
  # {
  #   "Version": "2012-10-17",
  #   "Statement": [{
  #     "Effect": "Allow",
  #     "Action": ["dynamodb:Query", "dynamodb:GetItem"],
  #     "Resource": [
  #       "arn:aws:dynamodb:ap-northeast-1:<ACCOUNT_ID>:table/aws-study-leaderboard",
  #       "arn:aws:dynamodb:ap-northeast-1:<ACCOUNT_ID>:table/aws-study-leaderboard/index/*"
  #     ]
  #   }]
  # }
  ```

### 4. きめ細かいアクセス制御（Fine-Grained Access Control）

- 将来クライアントから（Cognito ID 経由で）DynamoDB に直接アクセスする設計を採る場合、**IAM condition key `dynamodb:LeadingKeys`** を使い、**各ユーザーが自分のパーティションキー（例: `USER#<cognitoSub>`）の項目だけを読み書きできる**ように制限する。他人の XP を書き換える・なりすます経路を IAM レベルで塞ぐ。
- 属性単位の制限が必要なら `dynamodb:Attributes` で公開してよい属性（表示名・XP 合計）に絞る。
- 本設計では原則 **Lambda 経由（クライアントに DynamoDB 権限を直接渡さない）** を推奨。直接アクセス方式を採る場合のみ `LeadingKeys` を必須とする。

  ```bash
  # 例: Cognito 認証ユーザーが自分の項目のみ操作できるようにする条件（提案・人間が適用）
  # "Condition": {
  #   "ForAllValues:StringEquals": {
  #     "dynamodb:LeadingKeys": ["USER#${cognito-identity.amazonaws.com:sub}"]
  #   }
  # }
  ```

### 5. VPC エンドポイント（ネットワーク分離）

- Lambda を **VPC 内**に配置する構成では、**DynamoDB 用の Gateway 型 VPC エンドポイント**を作成し、DynamoDB へのトラフィックを**パブリックインターネットを経由させない**。Gateway エンドポイントは**追加料金なし**。
- KMS / Secrets Manager / CloudWatch Logs など他サービスへは **Interface 型（PrivateLink）エンドポイント**を使う（こちらは時間課金・データ処理課金あり）。
- **エンドポイントポリシー**で、当該エンドポイント経由のアクセスを対象テーブル・対象アカウントに限定する。
- 注記: Lambda を VPC 外に置く軽量構成なら Gateway エンドポイントは不要で、DynamoDB へは AWS 網内の HTTPS で到達する。**VPC に入れるか否かはセキュリティ要件とコスト（NAT/PrivateLink 料金）のトレードオフ**で決める。

### 6. シークレット・設定管理

- API キー・外部連携トークン等の機微情報は**コードや環境変数に平文で置かない**。**AWS Secrets Manager**（自動ローテーション対応・シークレットあたり月額課金）または **SSM Parameter Store（SecureString）**（低コスト、KMS で暗号化）に保管する。
- Lambda からは実行ロールに `secretsmanager:GetSecretValue` / `ssm:GetParameter` を**対象 ARN 限定**で付与して取得する。
- DynamoDB アクセス自体は IAM ロールで完結するため、**DB 接続文字列やパスワードは不要**（Secrets 管理対象は外部 API 連携が生じた場合に限られる）。

### 7. 監査・ログ（Audit & Logging）

- **CloudTrail 管理イベント**でテーブル作成・削除・設定変更などの操作を記録。**CloudTrail data events（DynamoDB）** を有効化すると `PutItem`/`GetItem` など項目レベルの操作も監査可能（**data events は従量課金**なので、必要なテーブルに絞って有効化しコストを管理する）。
- **CloudWatch メトリクス / アラーム**でスロットリング（`ThrottledRequests`）・システムエラー・消費キャパシティを監視。Lambda / API Gateway のアクセスログ・実行ログも CloudWatch Logs に集約する。
- KMS CMK 利用時は `kms:Decrypt` の呼び出しが CloudTrail に残り、**「誰がいつ復号したか」**を追跡できる。

### 8. バックアップ・復旧（Backup & Recovery）

- **PITR（Point-in-Time Recovery）** を有効化し、直近 35 日間の任意時点へ復元可能にする（誤削除・不正書き込みからの回復。**ストレージ量に応じた課金**あり）。
- 長期保管・世代管理が必要なら **オンデマンドバックアップ**や AWS Backup で定期取得する。
- TTL による日次 / 週次 / 月次バケットの自動失効は「削除」であり**バックアップではない**点に注意。累積ランキングなど恒久データは PITR + オンデマンドバックアップで保護する。

### 9. API 層の DDoS / スロットリング / WAF

- **API Gateway のスロットリング**（ステージ / メソッド単位のレート・バースト上限、使用量プラン + API キー）で過剰リクエストと課金スパイクを抑制する。
- **AWS WAF** を API Gateway / CloudFront に適用し、レートベースルール・地理制限・悪性 IP・一般的な攻撃パターン（マネージドルール）を遮断する。
- **AWS Shield Standard** は無償で L3/L4 DDoS を緩和。大規模攻撃対策が要るなら **Shield Advanced**（有償）を検討。
- アプリ層では **入力検証（XP デルタの上限・型・署名検証）** と **1 ユーザーあたりの投稿レート制限**でなりすまし・水増しを防ぐ。前掲の `dynamodb:LeadingKeys` と併用する。

### セキュリティ観点のコスト・トレードオフ注記

- **追加料金が実質ゼロ / 低コスト:** 保管時暗号化（AWS 所有・マネージドキー）、TLS、最小権限 IAM、`LeadingKeys`、DynamoDB Gateway 型 VPC エンドポイント、Shield Standard、API Gateway スロットリング、SSM Parameter Store（標準）。**まずここを固めるのが費用対効果が高い。**
- **相応のコストが乗る:** KMS CMK（鍵保管 + API 課金）、CloudTrail data events（項目レベル監査の従量課金）、PITR / バックアップ（ストレージ課金）、AWS WAF（Web ACL + ルール + リクエスト課金）、Interface 型 VPC エンドポイント（PrivateLink 時間・データ課金）、Secrets Manager（シークレット月額）、Shield Advanced（月額固定 + 従量）。
- **本サイト規模（数千ユーザー・低機密の学習データ）の推奨初期構成:** 保管時暗号化（マネージドキー） + 全経路 TLS 強制 + 最小権限 IAM（Write/Read ロール分離） + API Gateway スロットリング + WAF レートベースルール + PITR + CloudWatch 監視 + 請求アラート。**KMS CMK・CloudTrail data events・VPC 化は監査 / 機密要件が高まった段階で追加**する段階的アプローチが費用対効果に優れる。
- いずれの単価も変動するため、**確定コストは [AWS Pricing Calculator](https://calculator.aws/) で人間が積算**すること。前掲「DynamoDB 月額コスト試算」に、これらセキュリティ付帯サービス分を加算して総額を評価する。

### ⚠️ 要人間対応: AWS操作が必要（セキュリティ付帯サービス）

- **必要な操作内容:**
  - 保管時暗号化のキー方式（AWS 所有 / マネージド / KMS CMK）を要件とコストから決定し、テーブルに適用する。
  - API Gateway / CloudFront に最小 TLS バージョン（1.2 以上）と、必要なら ACM 証明書を設定する。
  - Write / Read で分離した**最小権限の IAM ロール / ポリシー**を作成する（テーブル ARN 限定、`dynamodb:Query`/`GetItem` と `PutItem`/`UpdateItem` を役割別に付与）。
  - クライアント直アクセス方式を採る場合は `dynamodb:LeadingKeys` 条件でユーザー単位に限定する。
  - VPC 化する場合は DynamoDB 用 Gateway エンドポイントと、必要な Interface エンドポイント（KMS 等）を作成し、エンドポイントポリシーを設定する。
  - 機微情報がある場合は Secrets Manager / SSM Parameter Store（SecureString）へ格納し、実行ロールに対象 ARN 限定の取得権限を付与する。
  - CloudTrail data events（対象テーブル限定）と CloudWatch アラーム（スロットリング / エラー / 請求）を設定する。
  - PITR を有効化し、必要ならオンデマンドバックアップ / AWS Backup を構成する。
  - API Gateway スロットリングと AWS WAF（レートベース / マネージドルール）を適用する。
- **対象リソース:**
  - AWS KMS（CMK / キーポリシー / ローテーション、採用する場合）
  - AWS IAM（Write/Read 分離ロール・最小権限ポリシー・`LeadingKeys` 条件）
  - Amazon VPC（DynamoDB 用 Gateway エンドポイント / Interface エンドポイント / エンドポイントポリシー、VPC 化する場合）
  - AWS Secrets Manager または AWS Systems Manager Parameter Store
  - AWS CloudTrail（data events） / Amazon CloudWatch（メトリクス・アラーム・ログ）
  - Amazon DynamoDB（PITR / オンデマンドバックアップ） / AWS Backup（任意）
  - AWS WAF / API Gateway スロットリング / AWS Shield（Standard は既定、Advanced は任意）
  - AWS Certificate Manager（カスタムドメイン利用時）
- **想定コマンド:**（人間が内容を確認・調整のうえ実行する提案。エージェントは実行しない）

  ```bash
  # ここに記載するコマンドはエージェントが実行するものではなく、
  # AWS 権限を持つ人間が内容を精査・調整したうえで実行する「提案」です。

  # 例: KMS CMK で保管時暗号化してテーブルを作成する場合
  aws dynamodb create-table \
    --table-name aws-study-leaderboard \
    --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
    --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --sse-specification Enabled=true,SSEType=KMS,KMSMasterKeyId=<CMK_ARN>

  # 例: Point-in-Time Recovery（PITR）を有効化
  aws dynamodb update-continuous-backups \
    --table-name aws-study-leaderboard \
    --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true

  # 例: DynamoDB 用 Gateway 型 VPC エンドポイントを作成（Lambda を VPC 内に置く場合）
  aws ec2 create-vpc-endpoint \
    --vpc-id <VPC_ID> \
    --service-name com.amazonaws.ap-northeast-1.dynamodb \
    --route-table-ids <ROUTE_TABLE_ID>

  # 例: シークレットを Secrets Manager に保管（外部 API 連携が生じる場合のみ）
  aws secretsmanager create-secret \
    --name aws-study/leaderboard/external-api \
    --secret-string '<SECRET_JSON>'

  # 例: CloudTrail の DynamoDB data events を対象テーブルに絞って有効化する
  #     （項目レベル監査。data events は従量課金のため対象を限定する）
  aws cloudtrail put-event-selectors \
    --trail-name <TRAIL_NAME> \
    --advanced-event-selectors '<DYNAMODB_TABLE_DATA_EVENT_SELECTOR_JSON>'
  ```

  > これらのコマンドはあくまで方向性を示す例です。暗号化キー方式・IAM 権限境界・VPC 化の要否・WAF ルール・監査範囲・バックアップ方針は、機密要件とコストを踏まえて人間が決定してください。

### ⚠️ 要人間対応: AWS操作が必要

- **必要な操作内容:**
  - グローバルリーダーボード用のバックエンド（Write API / データストア / Read API）を設計・構築する。
  - DynamoDB テーブル（期間バケット設計 + TTL）、Lambda（Write / Read ハンドラ）、API Gateway（CORS を GitHub Pages オリジンに限定）を作成する。
  - 必要に応じて Cognito による匿名 / 軽量認証、WAF / スロットリングによる不正投稿対策を追加する。
  - DynamoDB 想定コストの机上試算は本ファイル「DynamoDB 月額コスト試算」に記載済み（issue #32 コメント対応）。単価・無料枠・前提値（MAU / XP 更新頻度 / ランキング参照頻度）は概算のため、公式の AWS Pricing Calculator で人間が確定値を再確認すること。
  - 構築後、クライアント（`js/storage.js` ほか）に XP 送信経路とランキング表示 UI を追加する改修を、別 issue / PR として起票する。
- **対象リソース:**
  - Amazon DynamoDB（ランキング集計テーブル）
  - AWS Lambda（Write / Read API ハンドラ）
  - Amazon API Gateway（HTTP API エンドポイント）
  - Amazon Cognito（任意 / ユーザー識別）
  - AWS WAF・API スロットリング（任意 / 不正対策）
  - AWS SAM または AWS CDK（IaC / スタック管理）
- **想定コマンド:**（人間が内容を確認・調整のうえ実行する提案。エージェントは実行しない）

  ```bash
  # ここに記載するコマンドはエージェントが実行するものではなく、
  # AWS 権限を持つ人間が内容を精査・調整したうえで実行する「提案」です。

  # 例: DynamoDB テーブル作成（期間バケットをキーに設計）
  aws dynamodb create-table \
    --table-name aws-study-leaderboard \
    --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
    --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST

  # 例: 日次 / 週次 / 月次バケットの自動失効に TTL を設定
  aws dynamodb update-time-to-live \
    --table-name aws-study-leaderboard \
    --time-to-live-specification "Enabled=true, AttributeName=expiresAt"

  # 例: SAM / CDK でスタックとして構築する場合（テンプレート作成後）
  sam build && sam deploy --guided
  # または
  cdk deploy
  ```

  > これらのコマンドはあくまで方向性を示す例です。実際のテーブル設計・IAM 権限・CORS 設定・コスト方針は人間が決定してください。
