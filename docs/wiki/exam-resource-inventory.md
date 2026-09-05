# 試験リソース棚卸し台帳

- 最終更新日: 2026-09-06
- 対象範囲: `js/data/` 配下の全 13 試験のリソース（`steps[].resources[].items[]` の `url` / `urlEn`）棚卸し状況
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
