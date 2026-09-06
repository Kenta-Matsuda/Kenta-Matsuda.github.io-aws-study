# AWS 公式リソース探索ノウハウ

- 最終更新日: 2026-09-06
- 対象範囲: `js/data/` 配下の学習リソース（`resources[].items[].url` / `urlEn`）を、より良い最新の AWS 公式ドキュメントへ差し替え・追加するための探索ノウハウ
- 出典/参照: issue #69 / issue #137 / `.kiro/agents/exam-content-maintainer.md` / `scripts/check-resource-links.mjs` / `scripts/list-aws-doc-pages.mjs` / AWS 公式ドメイン

> このページは、探索を実行するたびに得た知見を追記・更新して育てる Wiki ページです。スキーマ（メタデータ + 更新履歴）は [README](README.md) を参照してください。

## 信頼できる公式ドメイン一覧（例）

以下の AWS 公式ドメインを優先します。リソースを差し替える際は、原則としてこれらのドメイン配下のページを採用します。

- `docs.aws.amazon.com` — AWS 公式ドキュメント（ユーザーガイド / API リファレンス等）。
- `aws.amazon.com/certification` — 認定試験の公式情報（試験ガイド / サンプル問題）。
- `aws.amazon.com/blogs` — AWS 公式ブログ（What's New の補足・設計解説）。
- `aws.amazon.com/jp/blogs` — 日本語版公式ブログ（`url`（日本語向け）候補として有用）。
- `aws.amazon.com/whats-new` — サービス更新・新機能の一次情報。
- `aws.amazon.com/architecture` — アーキテクチャセンター / Well-Architected 関連。

**非公式・二次情報（個人ブログ、Q&A サイト、まとめ記事など）は原則採用しない**。どうしても補足として使う場合は、一次情報（公式）へのリンクを併記する。

## 検索クエリの型

- サービス名 + トピック + `site:docs.aws.amazon.com`（例: `S3 encryption site:docs.aws.amazon.com`）。
- 試験コード + `exam guide site:aws.amazon.com/certification`（例: `SAA-C03 exam guide`）。
- 新機能・更新確認: サービス名 + `site:aws.amazon.com/whats-new`。
- 日本語ページ探索: トピック + `site:aws.amazon.com/jp`。
- 既存 URL が生きているか / 移転先の確認: ページタイトルの一部で公式ドメイン内検索。

## 試験ガイド文言ドリブンの探索手順（リソース選定の基本方針）

- 最終更新日: 2026-09-06
- 出典: リポジトリオーナーの手作業による選定方針（ANS-C01 の作り方）/ `js/data/ans-c01.js` / `scripts/analyze-resource-coverage.mjs` の実測

**これがリソース選定の第一原則です。** 「試験の全体像から良さそうなドキュメントを選ぶ」のではなく、**試験ガイドの文言を一つ一つ辿り、その文言に紐づくドキュメントを片っ端から調べる**という順序で進めます。ANS-C01 はこの方法で手作業選定されており、1 タスクあたり items 中央値 8 件（最大 14 件）に達しています。一方で他試験は中央値 2〜5 件で、掘り込みの深さがそのまま件数差に出ています。

### 手順

1. **対象試験の公式試験ガイド（PDF）を開く。** データ側の `domains[].tasks[]` は試験ガイドのタスクステートメントに 1:1 対応し、`knowledge` / `knowledgeEn` はガイドの「知識」「スキル」箇条書きに対応します。まずこの対応関係を確認する。
2. **タスクステートメントを 1 件選び、その配下の箇条書きを 1 行ずつ分解する。** 1 行の中に含まれる**サービス名・機能名・概念語**をすべて列挙する（例:「ハイブリッド DNS を実装する」→ Route 53 Resolver / インバウンド・アウトバウンドエンドポイント / 転送ルール / Direct Connect / VPC DNS 属性）。
3. **列挙した語ごとに検索する。** 1 タスクに対して 1 回検索して終わりにしない。語の数だけ検索軸があると考える。
4. **見つかったページを評価**（後述「良し悪しの評価基準」）し、そのタスクの `resources[]` に追加する。既存の items と重複するテーマは追加しない。
5. **候補 URL は書き込む前に必ず実アクセス検証する**（`scripts/check-resource-links.mjs --urls "<候補>" --all`）。推測で URL を書かない。
6. タスクを 1 件仕上げたら次のタスクへ。**タスク単位で完結させる**ことで、途中で中断してもどこまで進んだかが `git diff` で分かる。

### 「良いものが無い」で終わらせないフォールバック順序

`docs.aws.amazon.com` に手頃なページが無いときに諦めるのが最大のアンチパターンです。次の順に**必ず 1 件以上を確保**します。上に行くほど優先度が高いだけで、下位が「格下」という意味ではありません（Black Belt や Well-Architected は試験対策として非常に有用）。

1. **AWS 公式ドキュメント**（`docs.aws.amazon.com`）— ユーザーガイドの該当章。目次とアンカーは `scripts/list-aws-doc-pages.mjs <guide-url> --titles` / `--anchors` で列挙でき、「章が見つからない」を機械的に解消できる。
2. **AWS Black Belt Online Seminar**（`aws.amazon.com/jp/blogs/news/aws-blackbelt-overview/` のテキストフラグメント、または `d1.awsstatic.com` の PDF）— 日本語で体系的。試験範囲との対応が良い。
3. **AWS 公式ブログ**（`aws.amazon.com/blogs` / `aws.amazon.com/jp/blogs`）— 設計パターン・実装解説。日本語版があれば `url` に、原文を `urlEn` に。
4. **AWS Skill Builder / トレーニング**（`skillbuilder.aws`, `explore.skillbuilder.aws`, `aws.amazon.com/training`）— コース・ラボ。ただし SPA なので死活判定に使えない点に注意（後述）。
5. **ホワイトペーパー / Well-Architected / アーキテクチャセンター**（`aws.amazon.com/whitepapers`, `/architecture`, `docs.aws.amazon.com/wellarchitected/`）— 「戦略を決定する」「〜の要件を満たす設計」系のタスクステートメントに強い。
6. **AWS Well-Architected Labs**（`wellarchitectedlabs.com`）/ **Builders' Library**（`aws.amazon.com/builders-library`）— 手を動かす教材・設計原理。
7. **AWS re:Post Knowledge Center**（`repost.aws/knowledge-center/...`）— 「トラブルシューティング」「よくある課題」系に強い。AWS 公式執筆のものに限る。
8. **What's New / サービス別 FAQ / 料金ページ**（`aws.amazon.com/whats-new`, 各サービスの `faqs/`, `pricing/`）— コスト最適化・新機能追随のタスクで有効。
9. **サービスのプロダクトページ**（`aws.amazon.com/<service>/`）— 概要把握には使えるが**単独では弱い**。これしか無い場合は「まだ掘り足りない」と考えて 1〜8 を再走査する。

戦略・ガバナンス・コスト最適化のように「特定のサービスに紐づかない」タスクほど、1（ドキュメント）で行き詰まりやすく、5（ホワイトペーパー / Well-Architected）や 3（ブログ）に答えがあります。実測でも SAP-C02 と AIB-C01 の薄いタスクはこの種類に偏っています。

### カバレッジ目標（守る数値）

- **必須**: すべてのタスクステートメントに **items 1 件以上**。0 件のタスクを残さない。
- **原則**: **items 3 件以上**。3 件未満のタスクは「未完」とみなし、補強候補として PR 本文に残す。
- **多角性**: 1 タスクに **2 種類以上のリソース種別**（ドキュメント / Black Belt / ブログ / ホワイトペーパー / re:Post など）。ドキュメントだけ、プロダクトページだけで構成されたタスクは掘り足りないサイン。
- **上限の目安**: ANS-C01 の最大 14 件が実績上の上限。1 タスクに 15 件以上並べると学習導線として選べなくなるため、そこまで増えたら `recommend` で優先度を示す。

### カバレッジの機械的な確認

薄いタスクを人力で探すのは高コストなので、必ずスクリプトで順位付けしてから着手します（ネットワーク不要）。

```
node scripts/analyze-resource-coverage.mjs
node scripts/analyze-resource-coverage.mjs --only sap-c02 --min 3 --top 40
node scripts/analyze-resource-coverage.mjs --md test-results/coverage.md
```

出力の `median` / `thin`（items がしきい値未満）/ `singleKind`（種別が 1 つだけ）が補強優先度です。2026-09-06 時点の実測ベースライン（全 13 試験 / 206 タスク / items 合計 979）:

| 試験 | タスク数 | items 合計 | 中央値 | 薄い（<3） | 単一種別 |
| --- | --- | --- | --- | --- | --- |
| AIB-C01 | 13 | 34 | 2 | 7 | 7 |
| AIP-C01 | 20 | 68 | 3 | 0 | 0 |
| SOA-C03 | 13 | 43 | 3 | 0 | 0 |
| DEA-C01 | 17 | 71 | 4 | 0 | 0 |
| SAA-C03 | 14 | 63 | 4 | 0 | 0 |
| SCS-C03 | 16 | 64 | 4 | 0 | 0 |
| AIF-C01 | 14 | 66 | 5 | 0 | 0 |
| DOP-C02 | 19 | 90 | 5 | 0 | 0 |
| MLA-C01 | 12 | 63 | 5 | 0 | 0 |
| SAP-C02 | 20 | 74 | 5 | 9 | 6 |
| CLF-C02 | 19 | 110 | 6 | 0 | 0 |
| DVA-C02 | 13 | 93 | 7 | 0 | 1 |
| ANS-C01 | 16 | 140 | 8 | 0 | 1 |

0 件のタスクは無く、最優先の補強対象は **SAP-C02（薄い 9 タスク。最小は 2.6 / 3.4 の各 1 件）** と **AIB-C01（13 タスク中 7 タスクが 2 件、うち 5 タスクはドキュメントのみ）** です。

## 良し悪しの評価基準

差し替え候補・既存リンクは次の観点で評価します。

- **公式性**: 上記の公式ドメイン配下であること。一次情報を最優先。
- **鮮度**: より新しい公式ページ・最新のサービス名 / 機能に追随しているか。旧世代サービス名やアーカイブ済みページは差し替え候補。
- **言語（ja / en）対応**: 日本語向け `url` と英語向け `urlEn` を対で保守する。日本語ページが無い場合は英語ページを両方に暫定採用し、その旨を `note` / 更新履歴に残す。
- **網羅性 / 適合性**: そのステップ・トピックに対して過不足なく、学習導線として妥当か。
- **非推奨 / リンク切れ判定**: 404・恒久リダイレクト・「このページはアーカイブされました」等の表示があるものは差し替え・削除候補。

## リンク死活・鮮度チェックの観点

- **死活**: HTTP ステータス（200 / 3xx / 4xx / 5xx）、恒久リダイレクト先が妥当か、ドメイン移転の有無。
- **鮮度**: ページ内の更新日、参照しているサービス名 / API バージョンが最新か、より新しい公式ページの有無。
- **重複**: 同一テーマで複数リンクが重複していないか（重複は整理候補）。
- 判断が割れるもの（どちらの公式ページが「より良い」か等）は無理に置換せず、**根拠と候補を残してレビューに委ねる**。

### 手作業ではなくスクリプトで検証する（必須の第一手）

死活チェックを LLM が 1 件ずつ自然言語で行うのは非効率かつ不正確です。**必ず次のスクリプトを先に実行し、要約だけを読み込む**こと（詳細と実測効果は [効率化・自己拡張ログ](efficiency-log.md) 参照）。

```bash
# 全試験の死活・リダイレクト・ソフト 404・フラグメント陳腐化を分類して一覧化
node scripts/check-resource-links.mjs --concurrency 10 --fragments --json test-results/links-all.json

# 差し替え候補の実在とリダイレクト先を、書き込む前に確認する
node scripts/check-resource-links.mjs --urls "https://candidate-a,https://candidate-b" --all

# ガイド内の実在ページ / ページ内アンカーを列挙して、より適切な章を事実ベースで選ぶ
node scripts/list-aws-doc-pages.mjs <guide-url> --titles
node scripts/list-aws-doc-pages.mjs <guide-url> --anchors
```

**候補 URL を推測で書き込まないこと。** `--urls` で 200 かつリダイレクトなしを確認してからデータファイルへ反映します。

### HTTP ステータスだけでは判定できない落とし穴（実測で確認済み）

1. **ロケールリダイレクトはリンク切れではない**（実測 206 件）。`aws.amazon.com/certification/...` は `Accept-Language` や地域に応じて `aws.amazon.com/jp/certification/...` へ、`docs.aws.amazon.com/...` は `docs.aws.amazon.com/ja_jp/...` へ相互にリダイレクトされます。`url`（日本語）と `urlEn`（英語）を対で持つ本リポジトリでは大量に発生するため、**先頭のロケールセグメント（`jp` / `ja_jp` など）を除いて比較**しないと誤検知に埋もれます。`check-resource-links.mjs` はこれを `locale-redirect` として分離し、既定で出力しません。
2. **ソフト 404（親ページへの吸収）が最重要シグナル**（実測 24 件）。AWS ドキュメントは削除されたページを 404 にせず、**そのガイドのルートへ 200 でリダイレクト**します（例: `.../sagemaker/latest/dg/clarify-fairness-and-explainability.html` → `.../sagemaker/latest/dg/`）。ステータスだけ見ると健全に見えるため、**リダイレクト先が元 URL のより浅いパスかどうか**で判定します（`soft-404` 分類）。
3. **テキストフラグメント（`#:~:text=`）の陳腐化はステータスに出ない**（実測 19 件のうち偽陽性を除いて 5 件が実害）。Black Belt 一覧ページのように 1 ページへ多数のアンカーを張っている場合、ページは 200 でも**アンカー先の文字列が消えている**ことがあります。`--fragments` で本文を取得して実在を照合します。照合時は**本文と needle の両方に同じ空白正規化**をかけること（フラグメントに `%0A`（改行）が含まれると、正規化しないと全件が偽陽性になる）。
4. **SPA ドメインは全パスで 200 を返すため死活判定に使えない**。`skillbuilder.aws` は存在しないパス（例: `/this-path-should-not-exist-xyz123`）でも 200 を返します。Skill Builder のリンクは**ステータスでは検証できない**ため、リダイレクト先のクエリパラメータなど別の証拠で判断します（下記参照）。
5. **`d1.awsstatic.com` の PDF は 403 を返すことがある**（実測 4 件）。ボット対策の可能性が高く、リンク切れとは断定できません。`forbidden` として分離し、人間の目視確認に委ねます。

### 実行環境について

実際の HTTP アクセスによる検証は、**ネットワークが利用可能な環境**（利用者の Kiro automations 等）で実行します。外部アクセスが遮断された環境（INTEGRATIONS_ONLY）では上記スクリプトの `--no-fetch`（抽出と重複検出のみ）までしか実行できないため、その場合は**未検証である旨を PR 本文に明記**します。

## 既知の URL 移転パターン（2026-09-06 実測）

同じ形の移転が複数試験に波及します。1 件見つけたら**同じパターンを全試験で検索**してください。

| パターン | 旧 | 新 | 備考 |
| --- | --- | --- | --- |
| AI/ML 系プロダクトページの `ai/` 配下への再編 | `aws.amazon.com/machine-learning/`<br>`aws.amazon.com/machine-learning/ai-services/`<br>`aws.amazon.com/machine-learning/responsible-ai/`<br>`aws.amazon.com/generative-ai/use-cases/` | `aws.amazon.com/ai/machine-learning/`<br>`aws.amazon.com/ai/services/`<br>`aws.amazon.com/ai/responsible-ai/`<br>`aws.amazon.com/ai/generative-ai/use-cases/` | 恒久リダイレクトあり |
| SageMaker プロダクトページの `sagemaker/ai/` 配下への再編 | `aws.amazon.com/sagemaker/clarify/`<br>`aws.amazon.com/sagemaker/ml-governance/` | `aws.amazon.com/sagemaker/ai/clarify/`<br>`aws.amazon.com/sagemaker/ai/ml-governance/` | `sagemaker-ai/...` ではなく `sagemaker/ai/...` |
| 意思決定ガイドのフラット化 | `docs.aws.amazon.com/decision-guides/latest/<slug>/<slug>.html` | `docs.aws.amazon.com/decision-guides/latest/decision-guides/<slug>.html` | 例: `waf-or-shield.html` / `genai-guide.html`。日本語版は無く `ja_jp/` を付けても英語ページへ寄せられる |
| 意思決定ガイドの `aws.amazon.com/getting-started/` からの移設 | `aws.amazon.com/getting-started/decision-guides/...` | `docs.aws.amazon.com/decision-guides/latest/decision-guides/...` | 旧 URL は **404** |
| ElastiCache ドキュメントのガイド統合 | `.../AmazonElastiCache/latest/red-ug/*`<br>`.../AmazonElastiCache/latest/UserGuide/*` | `.../AmazonElastiCache/latest/dg/*` | Redis/Memcached 別ガイドが `dg` に統合 |
| Skill Builder の移転 | `explore.skillbuilder.aws/learn/course/internal/view/elearning/<id>/<slug>` | （個別コース URL は未確定） | 旧 URL は `skillbuilder.aws/search?searchText=<slug>&showRedirectNotFoundBanner=true` へ飛ぶ。**`showRedirectNotFoundBanner=true` は AWS 自身が「移行先を見つけられなかった」と示すフラグ**であり、旧コース ID が失効した確定的な証拠。SPA なのでステータスでは検証できない |
| Amazon Quick（旧 Quick Suite） | `aws.amazon.com/quicksuite/` | `aws.amazon.com/quick/` | AIB-C01 試験ガイドの表記も「Amazon Quick」 |

## 「新規顧客の受付を終了」したサービスの扱い（重要）

AWS は一部サービスを**廃止せずに新規受付のみ終了**します。ページは 200 のまま残り、リンク死活チェックでは検出できないため、**リソースの内容確認時に本文の `Note` を読む**必要があります。

判定の手掛かり:

- 本文冒頭の `Note` に `is no longer open to new customers` / `we do not plan to introduce new features` が書かれている。
- 同じガイド内に `<service>-availability-change.html` という「提供状況の変更」ページが存在する（`scripts/list-aws-doc-pages.mjs` の目次に現れる）。

2026-09-06 時点で確認したもの:

- **Amazon SageMaker Clarify** — 新規顧客の受付終了。出典: [Clarify availability change](https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-availability-change.html)。AWS は代替として SageMaker AI の監視リファレンス実装 / SHAP / SageMaker AI MLflow / Amazon CloudWatch / **Amazon Bedrock Evaluations**・**Amazon Bedrock Guardrails** を案内している。
- **Amazon SageMaker Model Monitor** — 新規顧客の受付終了。出典: [Amazon SageMaker Model Monitor availability change](https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-availability-change.html)。

取り扱い方針:

- リンクが生きていても **`recommend: true` は外す**（新規に使えないサービスを「おすすめ」として提示しない）。
- 試験範囲の概念理解に必要なら**リンクは残し、`note` / `noteEn` に受付終了の事実を明記**する。削除は、より適切な現行リソースに置き換えられる場合に限る。

## ブログの技術レベル判定基準 (Level 100/200/300/400)

issue #137 の要望を受け、AWS 公式ブログ（`aws.amazon.com/blogs`, `aws.amazon.com/jp/blogs`）や Black Belt などの学習リソースについて、**分かるものには技術レベルを補足として表示**できるようにしました。データスキーマとレンダリング機構は FEAT-001 で追加済みで、ここではその値を**どう判定して付与するか**の基準を蓄積します。

### データフィールドとレンダリング（FEAT-001 で追加済み）

- `js/data/<試験コード>.js` の各 `resources[].items[]` に、任意（optional）フィールド `level` / `levelEn` を追加できます（例: `level: 'Level 200'`）。省略した場合、アイテムの表示は従来どおり変わりません（null-safe）。
- `js/ui.js`:
  - `normalizeResourceItems` が `level` / `levelEn` を通過させます（whitelist に追加済み。追加しないと描画前に除去される点に注意）。
  - `localizedResourceLevel` ヘルパが locale に応じて `levelEn`（en）/ `level`（ja）を選びます。
  - `renderBlogCard` が、`level` が非空のときだけ**くすんだインディゴ色のレベルバッジ**を描画します（`recommend` のオレンジバッジとは色で区別）。
  - i18n キー `roadmap.level`（ja: `技術レベル` / en: `Technical level`）はバッジの `title` / `aria-label` にのみ使用します。`Level 200` のような**数値表記はデータ側の値**であり、翻訳しません。

### AWS コンテンツレベルの規約

AWS のセッション / コンテンツ難易度表記に合わせ、次を規約とします（`level` 値は `Level 100` のように英数字表記で統一）。

- **100 = Introductory（入門）**: サービス概要・用語・ユースケースの紹介。
- **200 = Intermediate（中級）**: サービスの基礎機能・基本的な使い方の解説。
- **300 = Advanced（上級）**: 実装・設計の詳細、ベストプラクティス、複数サービス連携。
- **400 = Expert（エキスパート）**: 内部構造・最適化・高度なトラブルシューティングなど深い専門知識。

### 作業の切り分け（オフラインで可能な範囲 / ネットワークが必要な範囲）

レベル付与は、外部アクセスの要否で 2 段階に分かれます。混同しないでください。

- **(a) オフラインで完結する backfill（ネットワーク不要）**: アイテムの `note` / `noteEn` / `title` に**既に明示的なレベル手掛かり**（`(Level NNN)` / `Level NNN` の文字列、Black Belt の `Deep Dive`、`基礎編` / `(Basics)` など）が含まれている場合、その値を `level` フィールドへ**そのまま転記**するだけです。決定的な文字列抽出であり推測ではないため、**本サンドボックス（INTEGRATIONS_ONLY）でも実行できます**。ANS（`js/data/ans-c01.js`）では、`note` に `(Level NNN)` を持つ全アイテムと Black Belt のタイトル手掛かり分について、この backfill を**完了済み**です。
- **(b) ネットワークが必要な範囲（実地検証）**: 上記のような明示的手掛かりが**リポジトリ内に無い**アイテムのレベル判定と、re:Post の新規 URL 探索・死活/鮮度・執筆者確認は、実ページの確認を要します。これらは**ネットワーク可能な環境（利用者の Kiro automations / `exam-content-maintainer` エージェント）**で実施します（本サンドボックスでは対象外）。

### ライブページで確認すべき手掛かり（signal）

上記 (b) のネットワーク可能な環境で実ページを確認し、次のような手掛かりからレベルを判定します。

- **セッション / コンテンツのレベル表記そのもの**: `Level 200`、`Session Level: 300`、AWS Summit / re:Invent のセッションコード末尾（例: `NET301`, `SEC401`）など、公式に明示された難易度。
- **入門・基礎寄りの語**: `Getting Started`、`入門`、`はじめての`、Black Belt の `基礎編` → 100〜200 の目安。
- **上級・詳細寄りの語**: `deep dive`、`アーキテクチャ`、`内部構造`、`ベストプラクティス`、Black Belt の `Deep Dive` → 300〜400 の目安。

### 付与ルール（推測で埋めない）

- レベルは**根拠が明確に示せる場合のみ**設定します。手掛かりが弱い / 判断が割れる場合は**付与を見送る**（`level` を省略する）ことを優先し、不確実なレベルを大量に付けません。
- 上記 (a) に該当する、リポジトリ内に明示的な手掛かり（`note` / `noteEn` の `Introductory/Intermediate/Advanced (Level NNN)`、Black Belt の `基礎編` / `Deep Dive` など）を持つアイテムは、**ネットワーク不要**で `level` を転記できます。この backfill は ANS で実施済みです（`js/data/ans-c01.js`）。他試験のデータファイルにも同じ手掛かりがあれば、同様にオフラインで backfill できます。
- 上記 (b) に該当する、リポジトリ内に手掛かりが無いアイテムの網羅的なレベル確定は**実ページ確認が必要**なため、ネットワーク可能な環境（Kiro automations / `exam-content-maintainer` エージェント）で実施します。本サンドボックス（INTEGRATIONS_ONLY）では外部アクセスができないため対象外です。

## AWS re:Post (repost.aws) リソースの探索・検証手順

issue #137 では「AWS re:Post のリソースがほとんどないが、AWS 公式の有益な投稿もあるので確認してほしい」との要望がありました。re:Post 由来の有益な公式コンテンツを見つけて追加するための手順・基準をここに蓄積します。

### 前提（既存の受け皿）

- `repost.aws` は既に公式ドメインの許可リスト（`js/config.js`）に含まれています。
- `repost.aws` へのリンクは `js/data/ans-c01.js` と `js/data/clf-c02.js` に既存の先例があり、既存スキーマ（`resources[].items[]` の `url` / `urlEn` / `title` / `titleEn` / `note` / `noteEn` / `recommend`）でそのまま追加できます。

### 探索先

- **Knowledge Center 記事**: `repost.aws/knowledge-center/...`。AWS 公式が執筆・監修する「よくある課題と解決策」のナレッジで、試験タスクとの対応が明確なものは有用です。
- **公式 / AWS 執筆の回答・記事**: 投稿者が AWS（`AWS-User` ではなく AWS 公式アカウント / モデレータ）であるもの、`Official` バッジや公式タグが付くもの。

### 検証（vetting）基準

採否は次の観点で判断します（[良し悪しの評価基準](#良し悪しの評価基準)・[リンク死活・鮮度チェックの観点](#リンク死活鮮度チェックの観点)と共通の考え方）。

- **公式性 / 執筆者**: AWS 公式（Knowledge Center、AWS 執筆・監修）であること。ユーザー個人の投稿・未検証の Q&A は原則採用しない。
- **鮮度**: 記事の更新日が新しく、参照するサービス名 / 機能が最新であること。
- **試験タスクとの適合性**: 対象ステップ・トピックの学習導線として過不足なく妥当であること。既存の `docs.aws.amazon.com` / Black Belt で十分に代替できる場合は追加しない（重複回避）。

### 追加先と手順

1. 対象試験の `js/data/<試験コード>.js` を開き、該当する `steps[].resources[].items[]` グループに追記する。
2. `url`（日本語向け）/ `urlEn`（英語向け）を対で保守する（日本語ページが無ければ英語ページを両方に暫定採用し、`note` / 更新履歴にその旨を残す）。
3. 技術レベルが分かる場合は、上記「ブログの技術レベル判定基準」に従い `level` / `levelEn` を付与する。
4. 変更した JS は `env -u NODE_OPTIONS node --check <ファイル>` で構文チェックする。

### 実行環境

- 新しい re:Post URL の実地収集・死活検証・執筆者や鮮度の確認は**外部 web アクセスを要します**。ネットワークが利用可能な環境なら本ページ冒頭のスクリプトでそのまま検証できます。外部アクセスが遮断された環境（INTEGRATIONS_ONLY）では実行できないため、その場合は**未検証である旨を PR 本文に明記**してください（issue #137）。
- なお `repost.aws` は SPA 寄りの挙動をする可能性があるため、**HTTP ステータス 200 だけを根拠に「生きている」と判断しない**こと（[SPA ドメインの落とし穴](#http-ステータスだけでは判定できない落とし穴実測で確認済み)と同じ注意）。

## 更新履歴

- 2026-09-06: リポジトリオーナーの選定方針を反映し、「試験ガイド文言ドリブンの探索手順（リソース選定の基本方針）」節を新設。試験ガイドのタスクステートメント / 箇条書きを 1 行ずつ分解して語ごとに検索する手順、「良いものが無い」で終わらせないための 9 段のフォールバック順序、カバレッジ目標（1 件以上必須 / 原則 3 件以上 / 2 種別以上）、`scripts/analyze-resource-coverage.mjs` による機械的な確認手順と全 13 試験の実測ベースラインを追記。
- 2026-09-06: 初のネットワーク接続下での全試験棚卸しを実施し、実測に基づいて大幅に更新。(1) 死活チェックを `scripts/check-resource-links.mjs` / `scripts/list-aws-doc-pages.mjs` によるスクリプト実行を必須の第一手とする手順へ変更。(2)「HTTP ステータスだけでは判定できない落とし穴」（ロケールリダイレクト / ソフト 404 / テキストフラグメント陳腐化 / SPA ドメイン / `d1.awsstatic.com` の 403）を追記。(3)「既知の URL 移転パターン」表と「新規顧客の受付を終了したサービスの扱い」節を新設。(4) **従来「本サンドボックス（INTEGRATIONS_ONLY）では外部アクセスができない」と断定していた記述を訂正**し、環境によってネットワークが利用可能である前提に改めた（実行環境に応じて判断し、未検証点を PR に明記する方針へ統一）。
- 2026-09-03: 初版作成（issue #69）。信頼ドメイン一覧・検索クエリの型・評価基準・死活/鮮度チェックの観点を整理。
- 2026-09-05: issue #137: 技術レベル(level)データフィールドの追加に伴う判定基準（Level 100/200/300/400 の規約・手掛かり・付与ルール）と、AWS re:Post (repost.aws) リソースの探索・検証手順を追記。
- 2026-09-05: issue #137 レビュー反映: レベル付与作業を「(a) オフラインで完結する backfill（`note`/`title` に既存の明示的手掛かりがある場合は転記のみ・ネットワーク不要）」と「(b) ネットワークが必要な実地検証」に切り分けて明記。ANS の `note` に `(Level NNN)` を持つ全アイテムの `level` backfill を完了（オフラインで実施）。
