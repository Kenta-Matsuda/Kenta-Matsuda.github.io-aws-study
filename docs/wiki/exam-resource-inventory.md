# 試験リソース棚卸し台帳

- 最終更新日: 2026-09-06
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
| AIB-C01 | `js/data/aib-c01.js` | 2026-09-06 | 棚卸し済み / 保留あり | 77 (50) | #143 | SageMaker Clarify のソフト 404 を後継ページへ。Clarify / Model Monitor は**新規顧客の受付終了**のため `recommend` を外し注記。Bedrock Evaluations とスコープ内サービス一覧を追加。Quick Suite → Quick に改称。保留: Skill Builder 2 件（ステップ 3 とステップ 5 が同一 URL） Bedrock Agents を後継の AgentCore へ差し替え。Clarify / Model Monitor は受付終了のため削除し Bedrock Guardrails を追加。 |
| AIF-C01 | `js/data/aif-c01.js` | 2026-09-06 | 棚卸し済み / 保留あり | 121 (94) | #144 | 廃止済み Amazon Machine Learning のガイドを現行解説ページへ。AI/ML・SageMaker プロダクトページの再編に追随。保留: Skill Builder 3 件 Bedrock Agents を AgentCore へ、Model Monitor を SageMaker AI MLflow へ差し替え。Clarify は削除し責任ある AI レンズを追加。 |
| AIP-C01 | `js/data/aip-c01.js` | 2026-09-06 | 棚卸し済み / 保留あり | 110 (83) | #145 | 403 の PDF 試験ガイドをドキュメント版へ。Bedrock 5 ページの再編に追随。Black Belt の IAM フラグメントを実表記へ。404 の RAG ブログを削除。保留: 削除ブログの代替候補 3 件・`troubleshooting` → `monitoring` の妥当性・Skill Builder 2 件 Bedrock Agents を AgentCore へ、Amazon Q Business を後継の Amazon Quick へ差し替え。 |
| ANS-C01 | `js/data/ans-c01.js` | 2026-09-06 | 棚卸し済み / 保留あり | 276 (245) | #146 | リポジトリ最大のファイル。404 の Route 53 Resolver ブログを同ファイル内で生きている `/blogs/security/` 版へ。TGW ソリューションと意思決定ガイドの移転に追随。保留: Skill Builder 3 件 |
| CLF-C02 | `js/data/clf-c02.js` | 2026-09-06 | 棚卸し済み | 199 (184) | #147 | **Migration Hub のプロダクトページが AWS Transform へ転送される誤誘導**を公式ドキュメントで是正。404 のコンピューティング意思決定ガイドを docs 側へ。Snow ファミリー → Snowball に改称 Migration Hub は受付終了だが試験ガイドのスコープ内のため例外掲載（注記あり）。 |
| DEA-C01 | `js/data/dea-c01.js` | 2026-09-06 | 棚卸し済み / 保留あり | 98 (88) | #149 | Black Belt のテキストフラグメント 3 件を実表記へ。Lake Formation の権限 / アクセス制御ページのソフト 404 を後継ページへ。保留: Skill Builder 2 件 |
| DOP-C02 | `js/data/dop-c02.js` | 2026-09-06 | 棚卸し済み / 保留あり | 190 (168) | #150 | **撤回済みの CodeCommit CI/CD ブログ**（CodeCommit は新規受付終了）を現行記事 + 公式チュートリアルへ。404 の DR ブログを `/blogs/architecture/` 版へ。保留: CI/CD ブログの選定・Skill Builder 2 件 |
| DVA-C02 | `js/data/dva-c02.js` | 2026-09-06 | 棚卸し済み / 保留あり | 140 (128) | #151 | 撤回済み CodeCommit CI/CD ブログを差し替え。ElastiCache `red-ug` → `dg` 統合、Lambda 2 ページのリネームに追随。保留: CI/CD ブログの選定・Skill Builder 2 件 |
| MLA-C01 | `js/data/mla-c01.js` | 2026-09-06 | 棚卸し済み / 保留あり | 112 (98) | #152 | 403 の PDF 試験ガイドをドキュメント版へ。ML Lens が**単一ページ構成に再編**され `mlops.html` が消失したためレンズ本体へ。Black Belt の CodePipeline フラグメントを実表記へ。保留: 当該項目の表示名・PDF の閲覧可否・Skill Builder 2 件 受付終了の SageMaker 機能 6 項目（Ground Truth / Clarify ×3 / Debugger / Model Monitor）を削除し MLflow と CloudWatch モニタリングを追加。 |
| SAA-C03 | `js/data/saa-c03.js` | 2026-09-06 | 棚卸し済み / 保留あり | 106 (101) | #153 | 404 のコンピューティング意思決定ガイドを docs 側へ。ElastiCache / DynamoDB / VPC エンドポイントのリネームに追随。保留: Skill Builder 3 件 |
| SAP-C02 | `js/data/sap-c02.js` | 2026-09-06 | 棚卸し済み / 保留あり | 131 (110) | #154 | **Prescriptive Guidance 5 ガイド**の `welcome.html` 移動に追随（3 件は 404）。後継のないデータ転送ページを移行意思決定ガイドへ。保留: 当該差し替え先・Skill Builder 2 件 Migration Hub は受付終了だが試験ガイドのスコープ内のため例外掲載（注記あり）。 |
| SCS-C03 | `js/data/scs-c03.js` | 2026-09-06 | 棚卸し済み / 保留あり | 109 (99) | #155 | 13 試験で**最も不具合が少なかった**（修正 5 箇所）。Security Reference Architecture / インシデント対応ガイドのソフト 404 を是正。保留: Skill Builder が**SCS-C02 版**を指している点・Skill Builder 2 件 Audit Manager は受付終了だが試験ガイドのスコープ内のため例外掲載（注記あり）。インシデント対応ガイドは後継の AWS Security Incident Response ユーザーガイドへ差し替え。 |
| SOA-C03 | `js/data/soa-c03.js` | 2026-09-06 | 棚卸し済み / 保留あり | 97 (95) | #156 | 削除済みの SSM 運用イベント自動化ブログを現行記事 + 公式ドキュメントへ。ElastiCache / VPC エンドポイントのリネームに追随。保留: Skill Builder が**SOA-C02 版**を指している点・差し替えブログの選定・Skill Builder 2 件 |

> 各行の「保留: Skill Builder N 件」について: 2026-09-06 の第 2 次対応で、AWS 自身の sitemap（`https://skillbuilder.aws/sitemap.xml`）に載っている**試験対策ページの直リンク**を特定し、ANS-C01 / DEA-C01 / DOP-C02 / DVA-C02 / SAA-C03 / SAP-C02 / SCS-C03 / SOA-C03 の 8 試験で検索 URL から差し替えました。残る保留は「公式練習問題集の個別コース URL」と「sitemap に試験対策ページが無い AIF-C01 / AIP-C01 / MLA-C01」です。詳細と要人間対応の範囲は [Skill Builder のコース URL 失効](../action-required/skillbuilder-course-urls.md) を参照してください。

## カバレッジ台帳（タスクステートメント単位）

- 集計日: 2026-09-06
- 集計方法: `node scripts/analyze-resource-coverage.mjs`（`domains[].tasks[]` の `resources[].items[]` を集計。ネットワーク不要）
- 目標値（`docs/wiki/aws-resource-discovery.md`「試験ガイド文言ドリブンの探索手順」参照）: 全タスクで items **1 件以上（必須）** / **3 件以上（原則）** / **2 種別以上（多角性）**
- 全体: 13 試験 / 206 タスク / items 合計 979。**0 件のタスクは無し**。薄い（3 件未満）16 タスク、単一種別のみ 15 タスク。

| 試験 | タスク数 | items 合計 | 中央値 | 最小 | 最大 | 薄い（<3） | 単一種別 | 補強優先度 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AIB-C01 | 13 | 34 | 2 | 2 | 4 | 7 | 7 | 高（13 タスク中 7 が 2 件、うち 5 はドキュメントのみ） |
| AIP-C01 | 20 | 68 | 3 | 3 | 6 | 0 | 0 | 中 |
| SOA-C03 | 13 | 43 | 3 | 3 | 5 | 0 | 0 | 中 |
| DEA-C01 | 17 | 71 | 4 | 3 | 6 | 0 | 0 | 中 |
| SAA-C03 | 14 | 63 | 4 | 3 | 7 | 0 | 0 | 中 |
| SCS-C03 | 16 | 64 | 4 | 3 | 6 | 0 | 0 | 中 |
| AIF-C01 | 14 | 66 | 5 | 3 | 6 | 0 | 0 | 低 |
| DOP-C02 | 19 | 90 | 5 | 4 | 6 | 0 | 0 | 低 |
| MLA-C01 | 12 | 63 | 5 | 4 | 8 | 0 | 0 | 低 |
| SAP-C02 | 20 | 74 | 5 | 1 | 7 | 9 | 6 | **最高**（2.6 / 3.4 が各 1 件。コスト最適化・信頼性・運用の戦略系タスクが薄い） |
| CLF-C02 | 19 | 110 | 6 | 3 | 8 | 0 | 0 | 低 |
| DVA-C02 | 13 | 93 | 7 | 3 | 12 | 0 | 1 | 低 |
| ANS-C01 | 16 | 140 | 8 | 4 | 14 | 0 | 1 | 低（手作業選定の基準ケース） |

**ANS-C01 が突出しているのは手作業で試験ガイドの文言を一つ一つ辿って選定したため**であり、これが目指すべき水準です。中央値 2〜4 の試験は掘り込みが浅いだけで、補強の余地があります。

補強優先タスク（items が少ない順・上位）:

| 試験 | タスク | items | 種別 |
| --- | --- | --- | --- |
| SAP-C02 | 2.6 ソリューションの目標と目的を達成するためのコスト最適化戦略を決定する | 1 | doc |
| SAP-C02 | 3.4 信頼性を向上させるための戦略を決定する | 1 | doc |
| SAP-C02 | 1.5 コスト最適化と可視化の戦略を決定する | 2 | doc/product |
| SAP-C02 | 3.5 コスト最適化の機会を特定する | 2 | doc/product |
| SAP-C02 | 4.4 モダナイゼーションと機能強化の機会を決定する | 2 | product |
| SAP-C02 | 2.2 事業の継続性を確保するソリューションを設計する | 2 | blog/doc |
| SAP-C02 | 2.4 信頼性の要件を満たす戦略を策定する | 2 | doc |
| SAP-C02 | 2.5 パフォーマンス目標を満たすソリューションを設計する | 2 | doc |
| SAP-C02 | 3.1 全体的な運用上の優秀性を高めるための戦略を作成する | 2 | doc |
| AIB-C01 | 1.3 生成 AI の概念と技法を適用する | 2 | doc |
| AIB-C01 | 2.3 競争優位のために AI をポジショニングする | 2 | doc |
| AIB-C01 | 3.2 AI ガバナンス体制を構築し、規制コンプライアンスを確保する | 2 | doc/product |
| AIB-C01 | 4.1 AI 導入に向けたビジネスの準備状況と成熟度を評価する | 2 | doc |
| AIB-C01 | 4.2 AI のためのデータとインフラの基盤を整える | 2 | doc |
| AIB-C01 | 4.3 全社的な変革をリードし、AI に対応できる組織能力を築く | 2 | doc/training |
| AIB-C01 | 4.4 パイロットから全社展開へ AI をスケールさせる | 2 | doc |

薄いタスクは「戦略を決定する」「機会を特定する」のように特定サービスへ紐づかないものに偏っています。この種類はホワイトペーパー / Well-Architected / 公式ブログに答えがあることが多く、`docs.aws.amazon.com` だけを探すと行き詰まります。

## リソース規模（統計）

- 集計日: 2026-09-06
- 集計方法: `env -u NODE_OPTIONS node scripts/collect-resource-urls.mjs`（`js/data/` の各モジュールを import し `url` / `urlEn` を再帰抽出。`_placeholder.js` と URL を持たない `common-defaults.js` は除外）
- 指標の定義:
  - **リソース項目**: `resources[].items[]` の件数（サイト上のリソース 1 行）。
  - **URL 参照数**: `url` / `urlEn` の出現回数の合計（同一 URL の重複を含む）。
  - **ユニーク URL**: URL 文字列としての重複排除後の件数（日本語版 / 英語版は別カウント）。
  - **ユニーク文書**: `/jp`・`/ja_jp` のロケールパスを除去して ja/en を同一視した件数。テキストフラグメント（`#:~:text=`）は**別文書として保持**する（Black Belt 一覧ページ内の個別資料を指すため）。
  - **ユニークページ**: さらにフラグメントも除去した「URL のページ単位」件数。

| 指標 | 件数 |
| --- | --- |
| リソース項目（items） | 1,084 |
| URL 参照数（url + urlEn） | 1,771 |
| ユニーク URL | 1,092 |
| ユニーク文書（ja/en 統合・フラグメント保持） | 656 |
| ユニークページ（フラグメント除去） | 523 |
| うち AWS 公式ドメイン（ユニーク URL 基準） | 1,089 / 1,092（99.7%） |

試験別（items / URL 参照数 / ユニーク URL / ユニーク文書）:

| ファイル | items | 参照 | ユニーク URL | ユニーク文書 |
| --- | --- | --- | --- | --- |
| `aib-c01.js` | 42 | 77 | 50 | 28 |
| `aif-c01.js` | 75 | 121 | 96 | 55 |
| `aip-c01.js` | 76 | 112 | 85 | 54 |
| `ans-c01.js` | 148 | 276 | 247 | 131 |
| `clf-c02.js` | 120 | 199 | 185 | 115 |
| `dea-c01.js` | 76 | 98 | 89 | 68 |
| `dop-c02.js` | 96 | 187 | 165 | 86 |
| `dva-c02.js` | 100 | 139 | 128 | 93 |
| `mla-c01.js` | 70 | 112 | 100 | 60 |
| `saa-c03.js` | 71 | 106 | 103 | 71 |
| `sap-c02.js` | 82 | 130 | 110 | 72 |
| `scs-c03.js` | 71 | 109 | 99 | 64 |
| `soa-c03.js` | 49 | 94 | 94 | 50 |
| `common-steps.js`（共通） | 8 | 11 | 11 | 9 |

ドメイン内訳（ユニーク URL 基準）: `aws.amazon.com` 523 / `docs.aws.amazon.com` 501 / `explore.skillbuilder.aws` 25 / `d1.awsstatic.com` 24 / `repost.aws` 7 / `skillbuilder.aws` 5 / `www.aws.training` 2 / `calculator.aws` 1 / `www.wellarchitectedlabs.com` 1 / 非 AWS 3（`www.youtube.com` 2 = 検索結果ページ、`strandsagents.com` 1 = AWS 製 OSS の公式サイト）。

> サイトのアピール文に使う場合の推奨表現: 「**AWS 公式ドキュメント約 650 本**（日本語 / 英語のペアを 1 本として集計、13 試験・リソース項目 1,084 件）」。「1,092 リンク」は ja/en を別カウントした数、「523」はページ単位（Black Belt 一覧の個別資料を 1 ページに集約）なので、用途に応じて指標を選ぶこと。

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

- 2026-09-06: 初のネットワーク接続下での全件棚卸しを実施し、**全 13 試験を「未棚卸し」から「棚卸し済み」へ更新**。台帳に URL 数・修正 PR・保留事項の列を追加し、`common-steps.js` の検証結果（問題なし・変更不要）と全体サマリ（`broken` 15 / `soft-404` 24 / `redirect` 67 / `fragment-miss` 5 / `forbidden` 4）、横断的な要注意事項を追記。Skill Builder のコース URL 失効は `docs/action-required/skillbuilder-course-urls.md` に切り出した。
- 2026-09-04: 試験略称コードを AIBS-C01 から AIB-C01 に訂正（正しい略称コードは AIB-C01。データファイルも js/data/aibs-c01.js -> js/data/aib-c01.js にリネーム）。
- 2026-09-03: 初版作成（issue #69）。`js/data/` 配下の全 13 試験を「未棚卸し」で初期化。
- 2026-09-04: 試験略称コードを AIBS-C01 から AIB-C01 に訂正（正しい略称コードは AIB-C01。データファイルも js/data/aibs-c01.js -> js/data/aib-c01.js にリネーム）。
- 2026-09-06: 「カバレッジ台帳（タスクステートメント単位）」節を新設。`scripts/analyze-resource-coverage.mjs` の実測（13 試験 / 206 タスク / items 979、0 件タスク無し、薄い 16 / 単一種別 15）と補強優先タスク一覧を記録。最優先は SAP-C02（薄い 9 タスク）と AIB-C01（中央値 2）。
- 2026-09-06: 「リソース規模（統計）」節を追加。`scripts/collect-resource-urls.mjs` による実測（ユニーク URL 1,092 / ユニーク文書 656 / ユニークページ 523 / items 1,084）と試験別・ドメイン別内訳を記録。
- 2026-09-06: Skill Builder の保留分について第 2 次対応の注記を追加。AWS の sitemap から試験対策ページの直リンクを特定し 8 試験で検索 URL を置換（出典: `https://skillbuilder.aws/sitemap.xml` / PR #157 のメンテナ指摘）。
