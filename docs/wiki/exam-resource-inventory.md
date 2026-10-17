# 試験リソース棚卸し台帳

- 最終更新日: 2026-10-17
- 対象範囲: `js/data/` 配下の全 13 試験のリソース（`steps[].resources[].items[]` の `url` / `urlEn`）棚卸し状況・カバレッジ状況・リソース規模の統計
- 出典/参照: issue #69 / `.kiro/agents/exam-content-maintainer.md` / `js/data/*.js` / `scripts/check-resource-links.mjs` / `docs/action-required/skillbuilder-course-urls.md`

> 各試験のリンク鮮度・品質の棚卸し状況を記録する台帳です。エージェントは棚卸しを行うたびに該当行の「最終棚卸し日 / 状態 / 備考」を更新します。スキーマ（メタデータ + 更新履歴）は [README](README.md) を参照してください。

## 状態の凡例

- **未棚卸し**: まだ一度も棚卸しを実施していない（初期状態）。
- **棚卸し済み**: 直近の棚卸しで全リンクを確認済み。
- **要対応**: リンク切れ・非推奨・より良い候補ありなど、差し替え/削除/追加の対応が必要。
- **保留**: 判断が割れる候補があり、レビューに委ねている。

## 棚卸し台帳

「URL 数」は `url` / `urlEn` フィールドの実測件数（括弧内はユニーク URL 数）です。「保留」列は、判断が割れる / 機械的に検証できないためレビューに委ねた件数です。

| 試験コード | データファイル | 最終棚卸し日 | 状態 | URL 数 | 修正 PR | 備考 |
| --- | --- | --- | --- | --- | --- | --- |
| AIB-C01 | `js/data/aib-c01.js` | 2026-10-17 | 棚卸し済み / 保留あり | 182 (147) | #143 | SageMaker Clarify のソフト 404 を後継ページへ。Clarify / Model Monitor は**新規顧客の受付終了**のため `recommend` を外し注記。Bedrock Evaluations とスコープ内サービス一覧を追加。Quick Suite → Quick に改称。保留: Skill Builder 2 件（ステップ 3 とステップ 5 が同一 URL） Bedrock Agents を後継の AgentCore へ差し替え。Clarify / Model Monitor は受付終了のため削除し Bedrock Guardrails を追加。 **2026-10-17**: ANS-C01 基準でタスク別リソースを入れ替え（items 54 → 108）。2026-10-17 に HTTP の死活・題名・note の本文・タスクステートメントの文言（公式 HTML 版ガイド）を確認済み（[HTTP 確認と本文確認](#2026-10-17-http-確認と本文確認)）。 |
| AIF-C01 | `js/data/aif-c01.js` | 2026-10-17 | 棚卸し済み / 保留あり | 276 (221) | #144 | 廃止済み Amazon Machine Learning のガイドを現行解説ページへ。AI/ML・SageMaker プロダクトページの再編に追随。保留: Skill Builder 3 件 Bedrock Agents を AgentCore へ、Model Monitor を SageMaker AI MLflow へ差し替え。Clarify は削除し責任ある AI レンズを追加。 **2026-10-17**: ANS-C01 基準でタスク別リソースを入れ替え（items 66 → 139）。2026-10-17 に HTTP の死活・題名・note の本文・タスクステートメントの文言（公式 HTML 版ガイド）を確認済み（[HTTP 確認と本文確認](#2026-10-17-http-確認と本文確認)）。 |
| AIP-C01 | `js/data/aip-c01.js` | 2026-10-17 | 棚卸し済み / 保留あり | 329 (262) | #145 | 403 の PDF 試験ガイドをドキュメント版へ。Bedrock 5 ページの再編に追随。Black Belt の IAM フラグメントを実表記へ。404 の RAG ブログを削除。保留: 削除ブログの代替候補 3 件・`troubleshooting` → `monitoring` の妥当性・Skill Builder 2 件 Bedrock Agents を AgentCore へ、Amazon Q Business を後継の Amazon Quick へ差し替え。 **2026-10-17**: ANS-C01 基準でタスク別リソースを入れ替え（items 68 → 196）。2026-10-17 に HTTP の死活・題名・note の本文・タスクステートメントの文言（公式 HTML 版ガイド）を確認済み（[HTTP 確認と本文確認](#2026-10-17-http-確認と本文確認)）。 |
| ANS-C01 | `js/data/ans-c01.js` | 2026-10-17 | 棚卸し済み / 保留あり | 274 (245) | #146 | リポジトリ最大のファイル。404 の Route 53 Resolver ブログを同ファイル内で生きている `/blogs/security/` 版へ。TGW ソリューションと意思決定ガイドの移転に追随。保留: Skill Builder 3 件 **2026-10-17**: オーナーの判断で、3.2 の重複ブログを削除し、3.3 の題名を URL の記事（ENA Express）に合わせ、タスクステートメントを公式 HTML 版ガイドの文言に揃えた（リソースはそのまま）。 |
| CLF-C02 | `js/data/clf-c02.js` | 2026-10-17 | 棚卸し済み | 283 (257) | #147 | **Migration Hub のプロダクトページが AWS Transform へ転送される誤誘導**を公式ドキュメントで是正。404 のコンピューティング意思決定ガイドを docs 側へ。Snow ファミリー → Snowball に改称 Migration Hub は受付終了だが試験ガイドのスコープ内のため例外掲載（注記あり）。 **2026-10-17**: ANS-C01 基準でタスク別リソースを入れ替え（items 110 → 157）。2026-10-17 に HTTP の死活・題名・note の本文・タスクステートメントの文言（公式 HTML 版ガイド）を確認済み（[HTTP 確認と本文確認](#2026-10-17-http-確認と本文確認)）。 |
| DEA-C01 | `js/data/dea-c01.js` | 2026-10-17 | 棚卸し済み / 保留あり | 323 (277) | #149 | Black Belt のテキストフラグメント 3 件を実表記へ。Lake Formation の権限 / アクセス制御ページのソフト 404 を後継ページへ。保留: Skill Builder 2 件 **2026-10-17**: ANS-C01 基準でタスク別リソースを入れ替え（items 71 → 179）。2026-10-17 に HTTP の死活・題名・note の本文・タスクステートメントの文言（公式 HTML 版ガイド）を確認済み（[HTTP 確認と本文確認](#2026-10-17-http-確認と本文確認)）。 |
| DOP-C02 | `js/data/dop-c02.js` | 2026-10-17 | 棚卸し済み / 保留あり | 369 (320) | #150 | **撤回済みの CodeCommit CI/CD ブログ**（当時 CodeCommit は新規受付終了。2025-11-24 に一般提供へ復帰したため 2026-10-17 に訂正）を現行記事 + 公式チュートリアルへ。404 の DR ブログを `/blogs/architecture/` 版へ。保留: CI/CD ブログの選定・Skill Builder 2 件 **2026-10-17**: ANS-C01 基準でタスク別リソースを入れ替え（items 90 → 191）。2026-10-17 に HTTP の死活・題名・note の本文・タスクステートメントの文言（公式 HTML 版ガイド）を確認済み（[HTTP 確認と本文確認](#2026-10-17-http-確認と本文確認)）。 |
| DVA-C02 | `js/data/dva-c02.js` | 2026-10-17 | 棚卸し済み / 保留あり | 272 (250) | #151 | 撤回済み CodeCommit CI/CD ブログを差し替え（CodeCommit は 2025-11-24 に一般提供へ復帰。2026-10-17 に訂正）。ElastiCache `red-ug` → `dg` 統合、Lambda 2 ページのリネームに追随。保留: CI/CD ブログの選定・Skill Builder 2 件 **2026-10-17**: ANS-C01 基準でタスク別リソースを入れ替え（items 93 → 147）。2026-10-17 に HTTP の死活・題名・note の本文・タスクステートメントの文言（公式 HTML 版ガイド）を確認済み（[HTTP 確認と本文確認](#2026-10-17-http-確認と本文確認)）。 |
| MLA-C01 | `js/data/mla-c01.js` | 2026-10-17 | 棚卸し済み / 保留あり | 224 (210) | #152 | 403 の PDF 試験ガイドをドキュメント版へ。ML Lens が**単一ページ構成に再編**され `mlops.html` が消失したためレンズ本体へ。Black Belt の CodePipeline フラグメントを実表記へ。保留: 当該項目の表示名・PDF の閲覧可否・Skill Builder 2 件 受付終了の SageMaker 機能 6 項目（Ground Truth / Clarify ×3 / Debugger / Model Monitor）を削除し MLflow と CloudWatch モニタリングを追加。 **2026-10-17**: ANS-C01 基準でタスク別リソースを入れ替え（items 63 → 126）。タスクステートメントで名指しされている受付終了の SageMaker 機能（Ground Truth / Clarify / Debugger / Model Monitor / Role Manager）は、注記付き・recommend なしで掲載に戻した。2026-10-17 に HTTP の死活・題名・note の本文・タスクステートメントの文言（公式 HTML 版ガイド）を確認済み（[HTTP 確認と本文確認](#2026-10-17-http-確認と本文確認)）。 |
| SAA-C03 | `js/data/saa-c03.js` | 2026-10-17 | 棚卸し済み / 保留あり | 273 (246) | #153 | 404 のコンピューティング意思決定ガイドを docs 側へ。ElastiCache / DynamoDB / VPC エンドポイントのリネームに追随。保留: Skill Builder 3 件 **2026-10-17**: ANS-C01 基準でタスク別リソースを入れ替え（items 63 → 159）。2026-10-17 に HTTP の死活・題名・note の本文・タスクステートメントの文言（公式 HTML 版ガイド）を確認済み（[HTTP 確認と本文確認](#2026-10-17-http-確認と本文確認)）。 |
| SAP-C02 | `js/data/sap-c02.js` | 2026-10-17 | 棚卸し済み / 保留あり | 360 (294) | #154 | **Prescriptive Guidance 5 ガイド**の `welcome.html` 移動に追随（3 件は 404）。後継のないデータ転送ページを移行意思決定ガイドへ。保留: 当該差し替え先・Skill Builder 2 件 Migration Hub は受付終了だが試験ガイドのスコープ内のため例外掲載（注記あり）。 **2026-10-17**: ANS-C01 基準でタスク別リソースを入れ替え（items 117 → 209）。2026-10-17 に HTTP の死活・題名・note の本文・タスクステートメントの文言（公式 HTML 版ガイド）を確認済み（[HTTP 確認と本文確認](#2026-10-17-http-確認と本文確認)）。 |
| SCS-C03 | `js/data/scs-c03.js` | 2026-10-17 | 棚卸し済み / 保留あり | 320 (304) | #155 | 13 試験で**最も不具合が少なかった**（修正 5 箇所）。Security Reference Architecture / インシデント対応ガイドのソフト 404 を是正。保留: Skill Builder が**SCS-C02 版**を指している点・Skill Builder 2 件 Audit Manager は受付終了だが試験ガイドのスコープ内のため例外掲載（注記あり）。インシデント対応ガイドは後継の AWS Security Incident Response ユーザーガイドへ差し替え。 **2026-10-17**: ANS-C01 基準でタスク別リソースを入れ替え（items 64 → 181）。2026-10-17 に HTTP の死活・題名・note の本文・タスクステートメントの文言（公式 HTML 版ガイド）を確認済み（[HTTP 確認と本文確認](#2026-10-17-http-確認と本文確認)）。 |
| SOA-C03 | `js/data/soa-c03.js` | 2026-10-17 | 棚卸し済み / 保留あり | 301 (296) | #156 | 削除済みの SSM 運用イベント自動化ブログを現行記事 + 公式ドキュメントへ。ElastiCache / VPC エンドポイントのリネームに追随。保留: Skill Builder が**SOA-C02 版**を指している点・差し替えブログの選定・Skill Builder 2 件 **2026-10-17**: ANS-C01 基準でタスク別リソースを入れ替え（items 43 → 147）。2026-10-17 に HTTP の死活・題名・note の本文・タスクステートメントの文言（公式 HTML 版ガイド）を確認済み（[HTTP 確認と本文確認](#2026-10-17-http-確認と本文確認)）。 |

> 各行の「保留: Skill Builder N 件」について: 2026-09-06 の第 2 次対応で、AWS 自身の sitemap（`https://skillbuilder.aws/sitemap.xml`）に載っている**試験対策ページの直リンク**を特定し、ANS-C01 / DEA-C01 / DOP-C02 / DVA-C02 / SAA-C03 / SAP-C02 / SCS-C03 / SOA-C03 の 8 試験で検索 URL から差し替えました。残る保留は「公式練習問題集の個別コース URL」と「sitemap に試験対策ページが無い AIF-C01 / AIP-C01 / MLA-C01」です。詳細と要人間対応の範囲は [Skill Builder のコース URL 失効](../action-required/skillbuilder-course-urls.md) を参照してください。

## 2026-10-17 ANS-C01 基準の見直し

- 依頼: リポジトリオーナーが全リソースを確認した唯一の試験である ANS-C01 を基準に、ほかの 12 試験のタスク別リソースと `recommend` を見直す。観点は「タスクステートメントに関連する技術的な学びがあるか」。AIB-C01 だけは技術的な学びより、ビジネスの意思決定に役立つかを重視する。判定基準は [AWS 公式リソース探索ノウハウ](aws-resource-discovery.md#ans-c01-基準のリソースレビュー技術的な学び--recommend-の判定基準) にまとめた。
- ANS-C01 は、試験ガイドのリンク（PDF → HTML 版）以外は変えていない。
- 進め方は 2 段階。第 1 弾で試験ごとに全タスクを見直し（入口ページとプロダクトページの差し替え、recommend の付け直し、受付終了サービスの扱い）、第 2 弾で、資料の無い箇条書きを検索で補った。
- **制約（解消済み）**: 見直しの作業環境からは AWS のドメインへ HTTP でアクセスできず、新しい URL は WebSearch の結果だけを根拠にしていた。同日、ネットワークが使える環境で全件を確認した（下の「HTTP 確認と本文確認」）。

| 試験 | items | recommend | 1 タスクの件数（中央値 / 最小 / 最大） | ブログ | 新規 URL（HTTP 未検証） |
| --- | --- | --- | --- | --- | --- |
| AIB-C01 | 54 → 108 | 28 (52%) → 28 (26%) | 4 / 3 / 6 → 9 / 6 / 10 | 0 → 40 | 85 |
| AIF-C01 | 66 → 139 | 29 (44%) → 34 (24%) | 5 / 3 / 6 → 10 / 7 / 12 | 0 → 25 | 76 |
| AIP-C01 | 68 → 196 | 46 (68%) → 47 (24%) | 3 / 3 / 6 → 10 / 6 / 13 | 3 → 66 | 150 |
| ANS-C01 | 140 → 140 | 34 (24%) → 34 (24%) | 8 / 4 / 14 → 8 / 4 / 14 | 83 → 83 | 0 |
| CLF-C02 | 110 → 157 | 36 (33%) → 39 (25%) | 6 / 3 / 8 → 8 / 6 / 13 | 1 → 3 | 48 |
| DEA-C01 | 71 → 179 | 33 (46%) → 40 (22%) | 4 / 3 / 6 → 11 / 6 / 14 | 1 → 19 | 136 |
| DOP-C02 | 90 → 191 | 41 (46%) → 45 (24%) | 5 / 4 / 6 → 10 / 8 / 12 | 3 → 28 | 139 |
| DVA-C02 | 93 → 147 | 48 (52%) → 37 (25%) | 7 / 3 / 12 → 11 / 9 / 13 | 29 → 31 | 114 |
| MLA-C01 | 63 → 126 | 27 (43%) → 29 (23%) | 5 / 4 / 8 → 10 / 9 / 13 | 2 → 16 | 66 |
| SAA-C03 | 63 → 159 | 33 (52%) → 36 (23%) | 4 / 3 / 7 → 11 / 10 / 14 | 4 → 19 | 91 |
| SAP-C02 | 117 → 209 | 50 (43%) → 55 (26%) | 6 / 4 / 8 → 10.5 / 8 / 12 | 7 → 45 | 47 |
| SCS-C03 | 64 → 181 | 39 (61%) → 43 (24%) | 4 / 3 / 6 → 12 / 8 / 13 | 1 → 40 | 134 |
| SOA-C03 | 43 → 147 | 29 (67%) → 35 (24%) | 3 / 3 / 5 → 11 / 10 / 14 | 2 → 26 | 76 |
| 合計 | 1042 → 2079 | 473 (45%) → 502 (24%) | | | 1162 |

- items / recommend は、タスク別リソース（`domains[].tasks[].resources[].items[]`）だけを数えた値（ステップのリソースは含まない）。中央値は比較元の `report-table` の計算（偶数件のときは 2 つの平均）。
- 「新規 URL」は、2026-09-06 の棚卸し時点のデータに無かった URL 文字列の数（日英を別々に数える）。全試験で重複を除くと 1,010、日英を 1 本にまとめると 621 本（`docs.aws.amazon.com` 421 / `aws.amazon.com` 180 / `repost.aws` 20）。

主な変更:

- 入口ページ（「〜とは」やガイドのトップ）とプロダクトページは、タスクの箇条書きに対応する機能単位の章に差し替えた。基礎試験（CLF-C02 / AIF-C01）の「〜とは」は残している。
- `recommend` は 1 タスク 1〜3 件、試験全体で 2〜3 割に絞った。入口ページ、Archived の古い Black Belt、受付終了サービスには付けていない。
- 受付終了サービスは、試験ガイドで名指しされているものだけ、注記付き・`recommend` なしで載せている（一覧は Wiki）。AIB-C01 1.2 の Amazon Bedrock Agents（Agents Classic）は後継の AgentCore に、AIP-C01 3.3 の Audit Manager は Bedrock の CloudTrail ログとガードレールの機密情報フィルターに差し替えた。
- CodeCommit は 2025-11-24 に一般提供へ復帰しているため、上の台帳の DOP-C02 / DVA-C02 行の「新規受付終了」の記述を訂正した。
- AI チャットに渡す試験の対象サービス一覧（`getExamServiceKeywords`、上限 25 件）が、ブログ名やガイド名（「AWS Machine Learning Blog」など）で枠を使い切り、実際のサービスを押し出していた。`js/exams.js` の抽出を直し、`tests/chat-grounding.spec.mjs` にテストを足した。
- `tests/exam-guide-hyde.spec.mjs` の実データテストは、「Amazon Q Developer とは」という題のリソースが入ったため前提が崩れた。どのリソースにも一致しない語句（「Amazon Q Developer の使い方」）に替え、テストの意図（拡張を外すと失敗する）は保っている。

残っている穴（資料が見つからなかった箇条書き。主に検索回数の上限による）:

| 試験 | 箇条書き・タスク |
| --- | --- |
| AIB-C01 | 1.1 ISO/IEC 23053（AWS のドメインに解説が見つからない） |
| AIF-C01 | 2.1 トークンの定義と拡散モデル / 3.2 プロンプトインジェクションなどのリスクを体系的に扱う資料 / 3.4 エージェントの評価 / 4.2 説明可能な AI の人間中心設計。3.4 の生成 AI レンズと 4.1・4.2・5.2 の責任ある AI レンズはトップページのまま |
| AIP-C01 | 5.1.5 RAG の評価と人間のフィードバックの収集 / 3.4.1 AgentCore Observability / 2.3.3 Bedrock 固有の IAM ポリシー例 / 2.5.2 OpenAPI による API ファースト開発 / 1.6.2 Comprehend による意図認識 / 3.1.3 JSON スキーマによる構造化出力。2.4.4 と 4.2.1 はブログと規範ガイダンスで代替 |
| CLF-C02 | 1.2 信頼性以外の柱の設計原則 / 2.3 ルートユーザーが必要なタスク / 2.4 セキュリティ情報の入手先 / 3.1 SDK / 3.2 データ主権 / 3.6 FSx / 3.7 Kendra / 3.8 Connect・SES・IoT Core / 4.2 Pricing Calculator / 4.3 APN・プロフェッショナルサービス（re:Post のトップを残している） |
| DEA-C01 | MWAA のトラブルシューティング / Redshift・RDS のロック / RDS の IP 許可リスト。Config・SAM・SCT は「〜とは」のまま |
| DOP-C02 | 1.4 EKS へのデプロイ / 2.1 Service Catalog・CloudFormation モジュール・CDK のコンストラクト / 2.3 Systems Manager の Inventory と Compliance / 3.3 FIS と AWS Backup のクロスリージョンコピー / 4.1 ログの KMS 暗号化とメトリクスストリーム / 5.3 CodeBuild のトラブルシューティングと Synthetics |
| DVA-C02 | 2.1 SigV4 / 2.2 SSH キーの生成 / 4.1 HTTP エラーコードと SDK の例外。AppConfig の Lambda 拡張機能はブログで代替 |
| MLA-C01 | 非同期推論とバッチ変換のページ / 自動モデルチューニングの早期停止とネットワーク分離の専用ページ |
| SAA-C03 | 3.1 パフォーマンス効率の柱のデータ管理 / 4.1 S3 Intelligent-Tiering の専用の章。CUR・Compute Optimizer・Outposts は「〜とは」のまま |
| SAP-C02 | 4.1 移行のブログ（TCO・ウェーブ計画）/ 3.1 ゲームデイとカオスエンジニアリングのベストプラクティス / 3.3 SLA / 1.1 ネットワーク要件に基づく配置（PERF04-BP06） |
| SCS-C03 | Verified Permissions / S3 の CORS / CloudFront の地理的制限 / JA3・JA4 / IoT のポリシー / Inspector の Lambda・ECR スキャン / Network Access Analyzer / Identity Center のトラブルシューティング / Glacier の Vault Lock / DLM / SNS のデータ保護 / ルートアクセスの一元管理 / cfn-guard・cfn-lint / Service Catalog |
| SOA-C03 | 1.3 プレイスメントグループと FSx / 2.1 予測スケーリング・ウォームプールと RDS のリードレプリカ / 2.3 RDS のポイントインタイム復元 / 4.1 パスワードポリシー / 5.1 Egress-Only インターネットゲートウェイ / 5.3 CloudFront とコンテナのログ |

### 追加対応（2026-10-17、オーナーの指示による 2 回目）

1. **CodeCommit 前提の CI/CD 資料を戻した**（CodeCommit は 2025-11-24 に一般提供へ復帰）。#150 / #151 で外した DevOps Blog「Complete CI/CD with AWS CodeCommit, AWS CodeBuild, AWS CodeDeploy, and AWS CodePipeline」は、2026-09-06 の実測で記事自体が撤回され一覧ページへ転送されていたため、同じ流れを扱う公式ドキュメントで戻した。
   - DOP-C02 1.1: CodePipeline の「シンプルなパイプラインを作成する (CodeCommit リポジトリ)」「CodeCommit パイプラインソースで完全クローンを使用する」、CodeCommit の「承認ルールテンプレートの操作」を追加。
   - DVA-C02 3.4: 上のパイプラインのチュートリアルと「Git と AWS CodeCommit の開始方法」（ブランチ・タグ）を追加。DVA-C02 3.3: CodeCommit 前提の可能性を理由に外していた「Step Functions のテストと CI/CD パイプラインの作成」の recommend を戻した。
2. **具体的な学びの無い資料を外した**（判定基準は Wiki の判定 1 の大前提）。
   - 外した: YouTube の検索結果ページ（AIF-C01 / CLF-C02 のステップ 1、共通ステップ）、CLF-C02 1.1 の「AWS とは」（マーケティングページ）と「Amazon Web Services の概要（はじめに）」（同じタスクに具体的な節がある）、SAA-C03 ステップ 4 の Well-Architected Labs のトップ、SAP-C02 ステップ 3 の研修カタログ（題名は Advanced Architecting on AWS）、AIB-C01 3.1 の責任ある AI の資料集のトップ、AIB-C01 4.3 の AWS Training for Teams、共通ステップの AWS ドキュメントのトップと Black Belt のアーカイブ一覧。
   - 差し替えた: `calculator.aws`（AIB-C01 2.2 / CLF-C02 4.2）→ Pricing Calculator ユーザーガイドの「AWS Pricing Calculator とは」、AWS re:Post のトップ（CLF-C02 4.3）→ ナレッジセンター「AWS のテクニカルサポートを受ける」、`strandsagents.com`（AIP-C01 2.1 / 2.5）→ Prescriptive Guidance「Strands Agents」と ML Blog のマルチエージェントの記事。
   - 足した: CLF-C02 1.1 に AWS の用語解説「クラウドコンピューティングとは」と、Cloud Value Framework のビジネスの俊敏性の記事。
   - 残した（中身のあるプロダクトページ）: FSx の選び方、Bedrock / EC2 の料金とデータ転送料金、`aws.amazon.com/compare/` の比較、`aws.amazon.com/what-is/` の用語解説、責任共有モデル、サポートプランの比較、リージョンとアベイラビリティーゾーン。AIB-C01 の Amazon Quick・責任ある AI・SageMaker の ML ガバナンス・Executive Insights はビジネスの具体的な学びとして残した。
3. **試験ガイドの改訂をタスクステートメントに反映した**（公式の文言との照合結果は下の「HTTP 確認と本文確認」）。改訂履歴のページが見つかった AIF-C01（v1.1、2026-04-30）・DVA-C02（v2.1、2024-12-12。知識とスキルを 1 つのスキルのリストに統合）・SOA-C03（v1.1、2026-06-01）を反映し、DEA-C01（v1.1）は反映済み、SCS-C03 は v1.0 のみと確認した。文言は検索結果の要約から復元していたが、同日、公式 HTML 版ガイドの日英の文言に全試験で置き換えた（下の「HTTP 確認と本文確認」）。
   - 新しい項目に資料を足した: AIF-C01（トークンベースの料金・AI エージェント・AgentCore Memory・LLM-as-a-judge・ビジネス目標との整合のメトリクス・AgentCore Identity・ガードレールとコンテキストグラウンディングチェック・モデル蒸留・Strands Agents・AgentCore）、DVA-C02（Amazon Q Developer・サーキットブレーカー・OpenSearch Service・Verified Permissions・DynamoDB のきめ細かなアクセスコントロール・CloudWatch Logs Insights）、SOA-C03（Bedrock のモニタリング・AWS DevOps Agent・AWS Security Agent・コンフォーマンスパック）。
   - 試験ガイドから消えた例に対応する資料を外した: AIF-C01 2.3 の PartyRock と Bedrock Data Automation の記事。Amazon Q Developer は 2.3 から 1.3 へ移した。
   - 2 回目の対応後のタスク別リソースは全 13 試験で 2,103 件。


### HTTP 確認と本文確認（2026-10-17、ネットワークが使える環境）

見直しの PR（#246）で確認できていなかった点を、ネットワークが使える環境で確認して直した。

- **HTTP の死活**: `node scripts/check-resource-links.mjs --concurrency 10 --fragments` で全 1,994 URL を確認した。
  - 確認時点の問題は broken 5 / soft-404 23 / redirect 12 で、fragment-miss は 0。
  - 直した後は broken / soft-404 / redirect / fragment-miss がすべて 0（locale-redirect は地域による `/jp/` への転送で問題なし）。
  - ディレクトリ形式の URL はすべて中身の無いスタブだったので、1 ページ目の実体ページへ直リンクにした。
- **タスクステートメントの文言**: 全 13 試験で、公式 HTML 版ガイド（ドメインページの日英）と `title` / `jpTitle` / `description` / `descriptionEn` を機械的に突き合わせ、公式の文言に置き換えた。
  - 英語はほとんどの試験で、日本語からの訳か PDF 時代の書き方（「Target Knowledge:」「e.g.」）だった。日本語の差は、サービス名の展開や旧訳などが中心。
  - 公式の日本語はすべての項目にあり、自前の訳は使っていない（AIP-C01 で新しく足した `knowledgeEn` のキーワードだけは自前の英訳）。
  - 置き換えた後の差分は 0。ただし DEA-C01 は公式の日本語の誤記（「AWSGlue」など）を直して載せている。SCS-C03 5.1.1 の公式英文の誤記（"when connecting to connect to resources"）は、オーナーの判断で公式どおり残した。
  - MLA-C01 の英語の HTML 版は、MLA-C02 への切り替えで廃止され 404 だった。英語はまだ公開されている C01 の PDF の文言を使い、試験ガイドの `urlEn` も PDF にした。
  - AIF-C01 の改訂履歴のページ（v1.1）は 1.3.4 に Amazon Q、4.2.2 に SageMaker Clarify を挙げているが、ドメインページには無い。オーナーの判断で、ドメインページに従った。
  - DVA-C02 の 4 タスクの日本語の見出しは、PR #195 で「本文に揃える」として変えていたものが、実際には公式と違っていたので、公式に戻した（例: 4.2「オブザーバビリティのためのコードの考案」は公式の表記）。
  - ANS-C01 は、オーナーの判断でタスクステートメントだけ公式に揃えた（リソースはそのまま）。
- **本文を読まずに書いていた note**: 要対応ファイルに挙げていた項目は、すべて本文を読んで直した。主な訂正は次のとおり。
  - DEA-C01 の Firehose のアクセス制御（IP の許可の書き方）
  - CLF-C02 の RDS の責任分担（本文に無かった「クエリのチューニング」を削除）
  - AIF-C01 の LLM-as-a-judge と AgentCore Identity の note
  - DevOps Blog「Streamline your GitHub journey with AWS CodePipeline and AWS DevOps Agent」は、主題が AWS DevOps Agent による失敗の原因調査だったので、DVA-C02 では 3.4 から 4.1（デプロイ失敗のトラブルシューティング）へ移した。日本語版は無いので英語の URL だけにした（DVA / DOP / SOA）。
- **Black Belt**: 一覧ページの表（日付のセルは題名の前にある）を解析し、全試験の資料の日付・Archived・PDF / YouTube の有無・テキストフラグメントの飛び先を照合した。
  - Lambda Part1 の日付は 2019/04（Archived）。SOA-C03 の 2019/10 と DVA-C02 の 2018/02（Lambda@Edge の日付）はどちらも誤り。
  - サービス名だけのフラグメントは、同名・前方一致の別の回に当たることがある（例: 「Amazon Bedrock」→ AgentCore runtime Dive Deep、「AWS DataSync」→ 2021/03 の Archived の回、「Amazon GuardDuty」→ Malware Protection for S3、「AWS Control Tower」→ 機能紹介編）。正式名か `日付-,題名,-PDF` の形で特定できるようにした。
  - Archived になっている資料の表記を揃え、Archived の資料からは `recommend` を外した。QuickSight は、オーナーの判断で「アクションにつながるビジュアルベストプラクティス」（2022/12、Archived）にした（SAA-C03 3.5 / DEA-C01 3.2）。
- **オーナーの判断（2026-10-17）**: Security Hub は新しい AWS Security Hub のページに統一した（`what-is-securityhub-v2.html` など。CSPM の話をするブログは「Security Hub CSPM」と注記して残した）。SOA-C03 は CloudWatch Database Insights を主にし、Performance Insights は移行の注記付きで `recommend` なし。AWS User Notifications は `recommend` なしで残した。
- **資料の無かった新しい項目を埋めた**: AIF-C01 のコンテキストエンジニアリング（2.1）・Kiro・Amazon Quick（2.3）、DVA-C02 の Amazon Q Developer によるテスト生成（3.3.6）・ヘルスチェックとレディネスプローブ（4.2.8）、SOA-C03 の Kiro（1.2.1）・Amazon S3 Files（1.3.4）。
- **CodeCommit の元のブログ記事**（Complete CI/CD with AWS CodeCommit…）は、2026-10-17 も `/products/developer-tools/` へ転送されており、再公開されていない。
- **確認後の規模**: タスク別リソースは全 13 試験で 2,118 件、`recommend` は 495 件（23%）。各試験 1 タスク 1〜3 件。
- **残した事項（低優先度）**:
  - 同じ URL に試験ごとに違う日本語の題名が付いているものが 125 件ある（多くは表記ゆれ）。
  - `aws.amazon.com/jp/blogs/...` の URL の中には、日本語版が無く英語のページを返すものがある（リンク切れではない）。


## カバレッジ台帳（タスクステートメント単位）

- 集計日: 2026-10-17（前回 2026-09-06）
- 集計方法: `node scripts/analyze-resource-coverage.mjs`（`domains[].tasks[]` の `resources[].items[]` を集計。ネットワーク不要）
- 目標値（`docs/wiki/aws-resource-discovery.md`「試験ガイド文言ドリブンの探索手順」参照）: 全タスクで items **1 件以上（必須）** / **3 件以上（原則）** / **2 種別以上（多角性）**。2026-10-17 の見直しでは ANS-C01 に合わせて **1 タスク 6〜12 件程度**を目安にした。
- 全体: 13 試験 / 206 タスク / items 合計 2,103（同日 2 回目の対応後）。**0 件のタスクと薄い（3 件未満）タスクは無し**。単一種別のみは 1 タスク（ANS-C01 4.2。基準の試験のため変更していない）。

| 試験 | タスク数 | items 合計 | 中央値 | 最小 | 最大 | 薄い（<3） | 単一種別 | 補強優先度 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ANS-C01 | 16 | 140 | 8 | 4 | 14 | 0 | 1 | 基準（メンテナが全件確認済み。4.2 は 4 件・単一種別・recommend なし） |
| CLF-C02 | 19 | 157 | 8 | 6 | 13 | 0 | 0 | 中（箇条書き単位の穴が多い。上の「残っている穴」） |
| AIB-C01 | 13 | 106 | 8 | 6 | 10 | 0 | 0 | 低 |
| AIF-C01 | 14 | 149 | 11 | 7 | 14 | 0 | 0 | 低 |
| AIP-C01 | 20 | 196 | 10 | 6 | 13 | 0 | 0 | 低 |
| DOP-C02 | 19 | 194 | 10 | 8 | 12 | 0 | 0 | 低 |
| MLA-C01 | 12 | 126 | 10 | 9 | 13 | 0 | 0 | 低 |
| DEA-C01 | 17 | 179 | 11 | 6 | 14 | 0 | 0 | 低 |
| DVA-C02 | 13 | 155 | 11 | 9 | 14 | 0 | 0 | 低 |
| SAA-C03 | 14 | 159 | 11 | 10 | 14 | 0 | 0 | 低 |
| SAP-C02 | 20 | 209 | 11 | 8 | 12 | 0 | 0 | 低 |
| SOA-C03 | 13 | 152 | 12 | 10 | 14 | 0 | 0 | 低 |
| SCS-C03 | 16 | 181 | 12 | 8 | 13 | 0 | 0 | 中（箇条書き単位の穴が多い。上の「残っている穴」） |

件数の面ではすべての試験が ANS-C01 の水準（中央値 8）に達しました。今後の補強は件数ではなく、上の「残っている穴」にある**箇条書き単位で資料が無いもの**を埋めることが中心になります。2026-09-06 時点の数値（items 979、薄い 16 タスク、単一種別 15 タスク。SAP-C02 と AIB-C01 が最優先）は更新履歴を参照してください。

「戦略を決定する」「機会を特定する」のように特定サービスへ紐づかないタスクは、ホワイトペーパー / Well-Architected / 規範ガイダンス / 公式ブログに答えがあることが多く、`docs.aws.amazon.com` のサービスガイドだけを探すと行き詰まります（2026-09-06 の知見。2026-10-17 の見直しでも同じ傾向）。

## リソース規模（統計）

- 集計日: 2026-10-17（前回 2026-09-06）
- 集計方法: `env -u NODE_OPTIONS node scripts/collect-resource-urls.mjs`（`js/data/` の各モジュールを import し `url` / `urlEn` を再帰抽出。`_placeholder.js` と URL を持たない `common-defaults.js` は除外）
- 指標の定義:
  - **リソース項目**: `resources[].items[]` の件数（サイト上のリソース 1 行）。
  - **URL 参照数**: `url` / `urlEn` の出現回数の合計（同一 URL の重複を含む）。
  - **ユニーク URL**: URL 文字列としての重複排除後の件数（日本語版 / 英語版は別カウント）。
  - **ユニーク文書**: `/jp`・`/ja_jp` のロケールパスを除去して ja/en を同一視した件数。テキストフラグメント（`#:~:text=`）は**別文書として保持**する（Black Belt 一覧ページ内の個別資料を指すため）。
  - **ユニークページ**: さらにフラグメントも除去した「URL のページ単位」件数。

| 指標 | 2026-10-17 | 2026-09-06 |
| --- | --- | --- |
| リソース項目（items） | 2,197 | 1,084 |
| URL 参照数（url + urlEn） | 3,735 | 1,771 |
| ユニーク URL | 1,980 | 1,092 |
| ユニーク文書（ja/en 統合・フラグメント保持） | 1,168 | 656 |
| ユニークページ（フラグメント除去） | 1,054 | 523 |
| うち AWS 公式ドメイン（ユニーク URL 基準） | 1,977 / 1,980（99.8%） | 1,089 / 1,092（99.7%） |

試験別（items / URL 参照数 / ユニーク URL / ユニーク文書。2026-10-17）:

| ファイル | items | 参照 | ユニーク URL | ユニーク文書 |
| --- | --- | --- | --- | --- |
| `aib-c01.js` | 121 | 185 | 150 | 100 |
| `aif-c01.js` | 151 | 248 | 203 | 125 |
| `aip-c01.js` | 203 | 329 | 261 | 162 |
| `ans-c01.js` | 148 | 276 | 245 | 129 |
| `clf-c02.js` | 168 | 288 | 258 | 155 |
| `dea-c01.js` | 187 | 317 | 274 | 160 |
| `dop-c02.js` | 198 | 364 | 315 | 172 |
| `dva-c02.js` | 154 | 250 | 230 | 145 |
| `mla-c01.js` | 133 | 224 | 210 | 124 |
| `saa-c03.js` | 167 | 267 | 244 | 153 |
| `sap-c02.js` | 217 | 360 | 292 | 180 |
| `scs-c03.js` | 188 | 315 | 299 | 180 |
| `soa-c03.js` | 154 | 285 | 281 | 154 |
| `common-steps.js`（共通） | 8 | 11 | 11 | 9 |
| `exam-lifecycle.js`（試験の改定・廃止スケジュールの出典） | 0 | 16 | 13 | 9 |

ドメイン内訳（ユニーク URL 基準、2026-10-17）: `docs.aws.amazon.com` 1,318 / `aws.amazon.com` 598 / `skillbuilder.aws` 30 / `repost.aws` 27 / `www.aws.training` 2 / `calculator.aws` 1 / `www.wellarchitectedlabs.com` 1 / 非 AWS 3（`www.youtube.com` 2 = 検索結果ページ、`strandsagents.com` 1 = AWS 製 OSS の公式サイト）。試験ガイドを HTML 版へ差し替えたため `d1.awsstatic.com` の PDF は 0 件になった。

> サイトのアピール文に使う場合の推奨表現（2026-09-06 の検証済みの値）: 「**AWS 公式ドキュメント約 650 本**（日本語 / 英語のペアを 1 本として集計、13 試験・リソース項目 1,084 件）」。2026-10-17 の値（ユニーク文書 1,168。HTTP 確認後に数件増減）は、同日に全 URL の HTTP 確認を済ませたので使ってよい。「ユニーク URL」は ja/en を別カウントした数、「ユニークページ」はページ単位（Black Belt 一覧の個別資料を 1 ページに集約）なので、用途に応じて指標を選ぶこと。

## 共通定義の注記

`common-steps.js` は全試験に波及する共通リソース定義で、`url`/`urlEn` 付きのリンクを含むため棚卸し（リンク走査）の対象です。`common-defaults.js` は共通の既定値定義で URL を持たないため、リンク走査の対象外です。これらを変更すると複数試験へ影響するため、棚卸し時は影響範囲に注意し、変更した場合は本台帳の備考に「共通定義の変更あり」と記録します。

**2026-09-06 の棚卸し結果**: `common-steps.js` の全 11 URL フィールドを検証し、**`broken` / `soft-404` / `redirect` はいずれも 0 件**でした（`locale-redirect` 2 件は `url` / `urlEn` を対で持つ構造上の正常な挙動）。したがって**共通定義の変更は行っていません**（全試験への波及なし）。

## 2026-09-06 棚卸しのサマリ

全 14 ファイル・`url`/`urlEn` **1,771 フィールド / ユニーク 1,092 URL** を実アクセスで検証しました（初のネットワーク接続下での全件棚卸し）。

| 分類 | 件数 | 意味 |
| --- | --- | --- |
| `broken` | 15 | 4xx / 5xx。明確なリンク切れ |
| `soft-404` | 24 | 200 だが**ガイドのルートへリダイレクト**。個別ページが失われている |
| `redirect` | 67 | ロケール以外の理由で移転している |
| `fragment-miss` | 5 | ページは 200 だが `#:~:text=` のアンカー文字列が本文に存在しない |
| `forbidden` | 4 | `d1.awsstatic.com` の試験ガイド PDF が 403（ボット対策の可能性） |
| `locale-redirect` | 206 | `aws.amazon.com/...` ↔ `/jp/...` の相互リダイレクト。**リンク切れではない** |
| `ok` | 757 | 問題なし |

### 横断的に見つかった要注意事項

- **新規顧客の受付を終了したサービス（8 件）**: Amazon Bedrock Agents（現 Agents Classic）/ Amazon Q Business / AWS Migration Hub / AWS Audit Manager / SageMaker Clarify / Model Monitor / Ground Truth / Debugger。**リンクは 200 を返しリダイレクトもしない**ため死活チェックでは検出できず、本文の `Note` を読む必要があります（`scripts/check-resource-links.mjs --notices` で機械的に検出）。
  - 方針は**掲載しない**（後継が明示されていれば差し替え、無ければ削除）。詳細と後継の対応表は [AWS 公式リソース探索ノウハウ](aws-resource-discovery.md#新規顧客の受付を終了したサービスの扱い重要) に記載しています。
  - **例外**: 公式試験ガイドのスコープ内サービスに明記されている 3 件（Migration Hub の CLF-C02 / SAP-C02、Audit Manager の SCS-C03）は、削除すると出題範囲のトピックが無資料になるため**掲載を継続**し、`recommend` を外して `note` に受付終了の事実を明記しています。
- **`<meta http-equiv="refresh">` スタブ（10 件）**: AWS ドキュメントのガイドのディレクトリ URL は中身のないスタブで、クライアント側で 1 ページ目へ転送しています。HTTP では 200 でリダイレクトもしないため死活チェックで検出できません。実体ページへ直リンクするよう修正済みです。
- **リンク先の内容と説明文のずれ**: リンクを変更した箇所について `scripts/check-link-descriptions.mjs` で `title` / `note` とページの実際の内容を突き合わせました（全 13 試験で計 126 件）。この過程で上記の meta refresh スタブと、セキュリティインシデント対応ガイドの世代交代を発見しています。
- **撤回された記事**: AWS CodeCommit ベースの CI/CD ブログ（DOP-C02 / DVA-C02）は記事自体が撤回され、プロダクト一覧ページへ転送されます。
- **プロダクトページ統廃合による誤誘導**: AWS Migration Hub（CLF-C02）は別サービス（AWS Transform）のページへ転送されます。
- **Skill Builder のコース URL が全 11 試験で失効**: 詳細と人間対応事項は [docs/action-required/skillbuilder-course-urls.md](../action-required/skillbuilder-course-urls.md) を参照。
- **既知の URL 移転パターン**（AI/ML プロダクトの `ai/` 配下再編、意思決定ガイドのフラット化、`welcome.html` のディレクトリルート化、ElastiCache のガイド統合など）は [AWS 公式リソース探索ノウハウ](aws-resource-discovery.md#既知の-url-移転パターン2026-09-06-実測) に表としてまとめました。次回はまずこの表を確認してください。

## 更新履歴

- 2026-10-17: 同日 3 回目の対応（ネットワークが使える環境で PR #246 の未確認事項を確認）を「HTTP 確認と本文確認」節に記録。12 試験の台帳の状態を「要対応（新 URL は HTTP 未確認）」から「棚卸し済み」に戻し、最終棚卸し日と URL 数を更新。ANS-C01 行にオーナーの判断による修正を追記。
- 2026-10-17: 同日 2 回目の対応（オーナーの指示: CodeCommit 前提の資料を戻す・試験ガイドの更新を反映する・具体的な学びの無い資料は含めない）を「追加対応」節に記録し、カバレッジ台帳を再集計（items 2,103）。
- 2026-10-17: 「2026-10-17 ANS-C01 基準の見直し」節を新設（試験別の before/after、主な変更、残っている穴）。カバレッジ台帳とリソース規模の統計を再集計（items 979 → 2,079、薄いタスク 16 → 0、単一種別 15 → 1。ユニーク文書 656 → 1,168）。見直しでリソースを入れ替えた 12 試験の台帳の状態を「要対応（新 URL は HTTP 未確認）」にし、URL 数を更新。DOP-C02 / DVA-C02 行の「CodeCommit は新規受付終了」を訂正（2025-11-24 に一般提供へ復帰）。HTTP 確認は `docs/action-required/exam-resource-review-2026-10-verification.md` に切り出した。
- 2026-09-06: 初のネットワーク接続下での全件棚卸しを実施し、**全 13 試験を「未棚卸し」から「棚卸し済み」へ更新**。台帳に URL 数・修正 PR・保留事項の列を追加し、`common-steps.js` の検証結果（問題なし・変更不要）と全体サマリ（`broken` 15 / `soft-404` 24 / `redirect` 67 / `fragment-miss` 5 / `forbidden` 4）、横断的な要注意事項を追記。Skill Builder のコース URL 失効は `docs/action-required/skillbuilder-course-urls.md` に切り出した。
- 2026-09-04: 試験略称コードを AIBS-C01 から AIB-C01 に訂正（正しい略称コードは AIB-C01。データファイルも js/data/aibs-c01.js -> js/data/aib-c01.js にリネーム）。
- 2026-09-03: 初版作成（issue #69）。`js/data/` 配下の全 13 試験を「未棚卸し」で初期化。
- 2026-09-04: 試験略称コードを AIBS-C01 から AIB-C01 に訂正（正しい略称コードは AIB-C01。データファイルも js/data/aibs-c01.js -> js/data/aib-c01.js にリネーム）。
- 2026-09-06: 「カバレッジ台帳（タスクステートメント単位）」節を新設。`scripts/analyze-resource-coverage.mjs` の実測（13 試験 / 206 タスク / items 979、0 件タスク無し、薄い 16 / 単一種別 15）と補強優先タスク一覧を記録。最優先は SAP-C02（薄い 9 タスク）と AIB-C01（中央値 2）。
- 2026-09-06: 「リソース規模（統計）」節を追加。`scripts/collect-resource-urls.mjs` による実測（ユニーク URL 1,092 / ユニーク文書 656 / ユニークページ 523 / items 1,084）と試験別・ドメイン別内訳を記録。
- 2026-09-06: Skill Builder の保留分について第 2 次対応の注記を追加。AWS の sitemap から試験対策ページの直リンクを特定し 8 試験で検索 URL を置換（出典: `https://skillbuilder.aws/sitemap.xml` / PR #157 のメンテナ指摘）。
