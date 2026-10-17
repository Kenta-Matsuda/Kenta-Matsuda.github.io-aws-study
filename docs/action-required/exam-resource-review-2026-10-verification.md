# ANS-C01 基準のリソース見直し（2026-10-17）で追加した URL の HTTP 確認と内容確認

🔴 未対応（要対応）

- 種別: 手動確認（ネットワーク要 / リンクの死活チェックと本文の確認）
- 関連: #69（棚卸し）/ #190（試験ガイドの Web 版）/ ブランチ `ccr-401565f2-65wnfo`（PR 未作成）
- 判定基準: [AWS 公式リソース探索ノウハウ](../wiki/aws-resource-discovery.md#ans-c01-基準のリソースレビュー技術的な学び--recommend-の判定基準) / 集計: [試験リソース棚卸し台帳](../wiki/exam-resource-inventory.md#2026-10-17-ans-c01-基準の見直し)

## 症状

2026-10-17 に、ANS-C01 を基準にして ANS-C01 以外の 12 試験のタスク別リソースと `recommend` を見直しました（ANS-C01 は試験ガイドのリンクだけを変更）。

- タスク別リソース（`domains[].tasks[].resources[].items[]`）は全 13 試験で 1,042 件から 2,079 件に増え、`recommend` の割合は 45% から 24% に下がりました。
- 新しく入った URL は、日英を 1 本と数えて **621 本**です。内訳は `docs.aws.amazon.com` 421 本、`aws.amazon.com` 180 本、`repost.aws` 20 本です。
- 作業環境から `docs.aws.amazon.com` と `aws.amazon.com` へ HTTP でアクセスできませんでした（プロキシが 403 を返す）。そのため新しい URL は「WebSearch の結果にその URL が出た」ことだけを根拠に採用しています。**HTTP の死活・リダイレクト・ソフト 404・本文の内容は確認していません**。
- 日本語版の URL は、英語版の URL のホスト直後に `/ja_jp` を挿入して作っています。日本語版が実在するかも未確認です。

## 推定原因

作業環境のネットワークポリシーで、AWS のドメインへの直接アクセスが許可されていなかったためです。データの誤りが見つかっているわけではありません。

## 切り分け手順

1. ネットワークが使える環境で、全試験のリンクを検証します。

   ```
   node scripts/check-resource-links.mjs --concurrency 10 --fragments --json test-results/links-all.json
   ```

2. `broken` / `soft-404` / `redirect` / `fragment-miss` に分類された URL を直します。直し方は [既知の URL 移転パターン](../wiki/aws-resource-discovery.md#既知の-url-移転パターン2026-09-06-実測) を先に確認してください。
3. 下の「特に確かめてほしい URL」は、検索結果に出た形からロケールや拡張子を外したり、旧形式のパスを使ったりしたものです。1 で問題がなくても、リンク先が題名どおりのページかを目で確かめてください。
4. 「本文で確かめてほしい note」は、本文を読まずに検索結果の題名や抜粋から書いたものです。リンク先の本文と食い違っていれば `note` / `noteEn` を直します。

### 特に確かめてほしい URL

| 試験 | タスク | URL（英語版） | 理由 |
| --- | --- | --- | --- |
| SAA-C03 | 1.1 / SCS-C03 4.2 | `IAM/latest/UserGuide/access_policies_identity-vs-resource.html` | 検索結果はロケール付きの URL だけ |
| SAA-C03 | 1.2 / 3.4 | `vpc/latest/userguide/vpc-example-private-subnets-nat.html` | 同上 |
| SAA-C03 | 1.3 / DOP-C02 3.1 | `AmazonS3/latest/userguide/replication.html` | 同上 |
| SAA-C03 | 2.2 / DOP-C02 3.1 / SOA-C03 2.2 | `AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html` | 同上 |
| SAA-C03 | 2.2 / SOA-C03 1.3 | `AmazonRDS/latest/UserGuide/rds-proxy-planning.html` | 同上。題名は slug から作成 |
| SAA-C03 | 3.3 | `AmazonRDS/latest/AuroraUserGuide/rds-proxy.howitworks.html` | 同上 |
| SAA-C03 | 2.2 | `wellarchitected/latest/framework/rel_manage_service_limits_limits_considered.html` | 同上 |
| SAA-C03 | 1.3 / SCS-C03 5.2 | `AmazonS3/latest/userguide/object-lock.html` | 旧パス `/dev/` から変更。検索結果は `.md` 版と二重スラッシュ版だけ |
| SAA-C03 | 4.4 | `vpc/latest/userguide/vpc-nat-comparison.html` | ロケールや拡張子を外して使用 |
| SAA-C03 | 3.3 | `AmazonRDS/latest/UserGuide/USER_ReadRepl.html` / `CHAP_Storage.html` | 同上 |
| SAA-C03 | 3.3 | `amazondynamodb/latest/developerguide/DAX.html` | 同上 |
| SAA-C03 | 4.1 | `AmazonS3/latest/userguide/RequesterPaysBuckets.html` | 同上 |
| SAA-C03 | 3.1 | `efs/latest/ug/performance.html` | 同上 |
| SAA-C03 | 3.1 | `https://aws.amazon.com/fsx/when-to-choose-fsx/` | 製品サイトのページ（具体的な学びがあるため残すと決定済み） |
| SAA-C03 | 3.2 | `batch/latest/userguide/best-practices.html` | ロケールや拡張子を外して使用 |
| SAA-C03 | 4.2 | `outposts/latest/userguide/what-is-outposts.html` | 英語版を日本語版から推定 |
| SAA-C03 | 4.4 | `apigateway/latest/developerguide/api-gateway-request-throttling.html` | ロケールや拡張子を外して使用 |
| SAA-C03 | 4.3 | `dms/latest/userguide/CHAP_SchemaConversion.html` | 同上 |
| SOA-C03 | 2.1 | `autoscaling/ec2/userguide/as-scaling-target-tracking.html` | 同上 |
| SOA-C03 | 3.1 | `AWSCloudFormation/latest/UserGuide/stacksets-troubleshooting.html` | 同上 |
| SOA-C03 | 5.3 | `elasticloadbalancing/latest/application/load-balancer-access-logs.html` | 同上 |
| SOA-C03 | 5.3 / 5.2 | `AmazonCloudFront/latest/DeveloperGuide/cache-hit-ratio.html` / `understanding-the-cache-key.html` | 同上 |
| SOA-C03 | 4.1 | `IAM/latest/UsingPolicySimulatorGuide/iam-policy-simulator-guide.html` | 同上。日本語版が無い可能性あり |
| SCS-C03 | 3.1 | `whitepapers/latest/guidelines-for-implementing-aws-waf/bad-bots.html` | 英語版を日本語版から推定 |
| SAP-C02 | 3.1 | `fis/latest/userguide/what-is.html` | 検索結果は `.md` 版だけ |
| DOP-C02 | 2.1 / 6.3 | `AWSCloudFormation/latest/UserGuide/stacksets-drift.html` | 検索結果は `UserGuide//stacksets-drift.html`（二重スラッシュ） |
| DOP-C02 | 2.1 | `AWSCloudFormation/latest/UserGuide/drift-aware-change-sets.html` | 題名は slug から作成 |
| DEA-C01 | 1.2 / 2.1 / 3.2 | `decision-guides/latest/analytics-on-aws-how-to-choose/analytics-on-aws-how-to-choose.html` | 意思決定ガイドの旧形式のパス（2026-10-17 の検索ではこの形で出た） |
| AIB-C01 | 4.2 / 4.1 | `whitepapers/latest/aws-caf-for-ai/platform-perspective-infrastructure-for-and-applications-of-aiml.html` / `foundational-ai-capabilities.html` | 英語版をロケール付きの版から推定 |
| AIB-C01 | 3.3 | `ai/responsible-ai/nova-2-lite/overview.html`（`docs.aws.amazon.com`） | 日本語版の有無が不明 |

### 同じ日の 2 回目の対応で足した URL

オーナーの追加の指示（CodeCommit 前提の資料を戻す・具体的な学びの無い資料を外す・試験ガイドの改訂を反映する）で、次の URL を足しました。どれも英語版の URL が検索結果に出たものです。日本語版はドキュメントは `/ja_jp`、`aws.amazon.com` のページは `/jp/` を挿入して作っています。

- CodeCommit（DOP-C02 1.1 / DVA-C02 3.4）: `codepipeline/latest/userguide/tutorials-simple-codecommit.html`、`codepipeline/latest/userguide/tutorials-codecommit-gitclone.html`、`codecommit/latest/userguide/approval-rule-templates.html`、`codecommit/latest/userguide/getting-started.html`
- 差し替え先: `pricing-calculator/latest/userguide/what-is-pricing-calculator.html`（AIB-C01 2.2 / CLF-C02 4.2）、`https://repost.aws/knowledge-center/get-aws-technical-support`（CLF-C02 4.3）、`prescriptive-guidance/latest/agentic-ai-frameworks/strands-agents.html`（AIP-C01 2.1）、ML Blog `using-strands-agents-to-create-a-multi-agent-solution-with-metas-llama-4-and-amazon-bedrock`（AIP-C01 2.5）
- CLF-C02 1.1: `https://aws.amazon.com/what-is-cloud-computing/`（日本語版 `/jp/` は推定）、Migration & Modernization Blog の Cloud Value Framework（ビジネスの俊敏性）の記事
- 試験ガイドの改訂で増えた項目: `bedrock/latest/userguide/evaluation-judge.html`・`bedrock-agentcore/latest/devguide/common-use-cases.html`（AIF-C01）、`verifiedpermissions/latest/userguide/terminology.html`・`amazondynamodb/latest/developerguide/specifying-conditions.html`（DVA-C02）、`devopsagent/latest/userguide/devops-agent-incident-response.html`・`devopsagent/latest/userguide/devops-agent-incident-response-starting-investigations.html`・`securityagent/latest/userguide/how-it-works.html`（SOA-C03。AWS Security Agent は検索結果の題名で「now part of AWS Continuum」と表示）
- 元の DevOps Blog「Complete CI/CD with AWS CodeCommit, AWS CodeBuild, AWS CodeDeploy, and AWS CodePipeline」（`/blogs/devops/complete-ci-cd-with-aws-codecommit-aws-codebuild-aws-codedeploy-and-aws-codepipeline/`）は、2026-09-06 の実測で撤回されて一覧ページへ転送されていたため戻していません。2026-10-17 の検索ではこの URL が「AWS DevOps & Developer Productivity Blog」という題で出ました。記事が再公開されていれば DOP-C02 1.1 / DVA-C02 3.4 に戻してください。

### ディレクトリ形式の URL（meta refresh のスタブの可能性）

2026-09-06 の棚卸しで、ガイドのディレクトリ URL が中身の無いスタブ（クライアント側で 1 ページ目へ転送）になっている例が見つかっています。次の URL がスタブなら、1 ページ目の実体ページへ直リンクにしてください。

- `whitepapers/latest/how-aws-pricing-works/`（CLF-C02 1.4・4.1、SAP-C02 2.6）
- `prescriptive-guidance/latest/strategy-database-disaster-recovery/`（DOP-C02 3.1、SOA-C03 2.3）
- `prescriptive-guidance/latest/aws-multi-region-fundamentals/`
- `whitepapers/latest/aws-security-incident-response-guide/`（DOP-C02 6.3）
- `prescriptive-guidance/latest/strategy-migration/`、`prescriptive-guidance/latest/large-migration-guide/`（SAP-C02 4.1）
- `prescriptive-guidance/latest/retrieval-augmented-generation-options/`（AIF-C01 3.1）
- `prescriptive-guidance/latest/security-reference-architecture/`（SAP-C02 1.2。2026-09-06 に welcome.html がディレクトリルートへ移ったことを確認済み）

### 本文で確かめてほしい note

- **AIB-C01**: 「AI の良し悪しはデータで決まる」（1.1、4.2 ★）、「自動化からエージェンシーへ」（1.2 ★）、「Amazon Bedrock のモデルライフサイクルを理解する」（2.1）、「エージェンティック AI を大規模に活用するためのビジネスの準備」（2.1）、「AI への信頼を築く: EU AI 法に対する AWS のアプローチ」（3.2）、「AI ライフサイクルのリスク管理: ISO/IEC 42001:2023」（1.1）、「AI ビルダーを育てる」（4.1）。いずれも note を題名と検索結果の抜粋から書いています。
- **CLF-C02**: 2.1 の RDS / Lambda の責任分担、1.3 の CAF の成果と「移行戦略（7 Rs）」の題名、4.3 の「AWS サポートプランの比較」。第 1 弾で本文を読まずに書き直しました。
- **DEA-C01**: 1.1「Amazon Data Firehose によるアクセスの制御」。note の一部（IP アドレス範囲）はエージェントの知識から書いています。
- **DVA-C02**: 3.3「AWS Step Functions のテストと CI/CD パイプラインの作成」と「AWS CodePipeline と AWS CDK で CI/CD パイプラインをセットアップする」（パターン）。どちらも CodeCommit を前提にしている可能性があるため `recommend` を外しています。
- **DOP-C02 / DVA-C02**: 「AWS CodePipeline と AWS DevOps Agent で GitHub での開発を効率化する」（DVA 3.4 / DOP 5.3）。記事が AWS DevOps Agent を主題にしているかを確かめ、両試験で題名を揃えてください。
- **AIP-C01**: 2.2 の推論アーキテクチャの規範ガイダンスは PDF 版の URL しか見つかっていません。

### Black Belt の Archived 表記と日付

- SOA-C03 で、VPC（2020/10）、Route 53 導入編（2023/05）、IAM Part1（2019/01）の Archived 表記を他試験に揃えました。一覧ページで実際の表記を確かめてください。
- Lambda Part1 の日付が SOA-C03（2019/10）と DVA-C02（2018/02）で食い違っています。
- SCS-C03 の Audit Manager（2021/03）、Artifact（2021/03）、Firewall Manager（2022/06）、Network Firewall 入門（2021/06）の日付は未確認です。
- DEA-C01 の「AWS Glue」「Amazon Redshift」「AWS Step Functions」のように、サービス名だけのテキストフラグメントは別のセミナーへ飛ぶ可能性があります（見直し前から存在）。AIF-C01 の「Amazon Bedrock」フラグメントは 5 タスクで使っています。`--fragments` の結果で確かめてください。

## 要人間対応事項

1. **リンクの検証と修正**: 上の切り分け手順 1〜4 を実行し、壊れたリンク・題名と合わないリンク・本文と食い違う note を直します。結果は [試験リソース棚卸し台帳](../wiki/exam-resource-inventory.md) の各試験の行（最終棚卸し日・状態・備考）に反映します。
2. **判断が必要な事項**（メンテナの判断を待っています）:
   - **Security Hub と Security Hub CSPM**: `securityhub/latest/userguide/` 配下のページは、検索結果の題名で「Security Hub CSPM」の内容になっています。SCS-C03 / SOA-C03 / SAP-C02 / CLF-C02 / DOP-C02 で、どちらの Security Hub のページを載せるかを決めてください。
   - **RDS Performance Insights**（SOA-C03）: CloudWatch Database Insights への移行の扱い（未確認）。
   - 決定済み（2026-10-17 のオーナーの指示）: FSx の選び方のページは、具体的な学びのあるプロダクトページなので残す。ISO/IEC 23053 は、資料を AWS 公式に限るため無資料のままにする。CodeCommit 前提の CI/CD 資料は戻す（上の「同じ日の 2 回目の対応で足した URL」）。
3. **ANS-C01 で気づいた点**（メンテナが全件確認済みの試験のため、データは変えていません。直すかどうかの判断をお願いします）:
   - 3.2 に同じブログ（`automating-connectivity-assessments-with-vpc-reachability-analyzer`）が 2 回載っています。
   - 4.2 は 4 件ですべて同じ種別で、`recommend` がありません。
   - 同じブログが試験内のタスクによって違うレベルになっています（7 件）。「CloudFront と Global Accelerator…」（1.1: 100 / 1.3: 300）、「HSTS を AWS サービス全体で実装する」（1.1: 300 / 4.3: 200）、「Gateway Load Balancer のデプロイに関するベストプラクティス」（1.3: 200 / 4.1: 300）、「Direct Connect Gateway を使用したハイブリッドクラウドアーキテクチャ」（1.5: 300 / 2.1・3.1・3.3: 200）、「SD-WAN デバイスを Transit Gateway と Direct Connect に統合する」（1.5: 300 / 2.1: 200）、「Transit Gateway Connect を使用したハイブリッドネットワークのセグメンテーション」（1.5: 300 / 3.1: 200）、「IP アドレス範囲が重複するネットワークの接続」（1.6: 300 / 3.1: 200）。
   - 3.3 のブログ「AWS とハイブリッドネットワークのパフォーマンスを最適化する」の URL は ENA Express の記事（`using-ena-express-to-improve-workload-performance-on-aws`）で、題名と合っていません。
4. 対応が済んだら、このファイルを削除し、`docs/action-required/README.md` と `docs/index.md` の一覧を更新して、`node scripts/list-action-required.mjs --write` で CHECKLIST を再生成します。
