# Web/AI 検索での発見性向上（SEO / AI 検索対策）

🔴 未対応（要対応）

- 種別: 外部サービス設定 / 手動確認
- 関連: #125
- 補足: 本ファイルに残す作業は、**外部サービスのアカウント操作や記事の執筆・公開といった、人間が実施すべきマーケティング／運用タスク**です。エージェントはこれらを実行しません（記事を投稿した・検索エンジンに登録したなどの既成事実を作ることもしません）。

## 症状

issue #125 は「サイトが Web 検索や AI 検索（ChatGPT などの生成AI）でヒットしない」「Qiita 記事などを書いて認知を広げたい」という発見性（discoverability）の課題を挙げています。

- 検索エンジンや AI にサイトの存在・内容を認識してもらえていない可能性がある。
- 外部からの被リンクや言及が少なく、インデックスされにくい / 上位表示されにくい。

## 推定原因

これはコード上の不具合ではなく、**公開直後のサイトに共通する「認知・被リンク・インデックス登録の不足」**に起因します。技術的な SEO 基盤（メタ情報・構造化データ・クローラ許可・サイトマップ）はすでに整っており、そこがボトルネックではありません。

- 新規ドメイン／新規ページはクロールとインデックスに時間がかかり、初動では検索結果に出にくい。
- 外部サイト（技術ブログ・SNS 等）からの被リンクや言及が無いと、検索エンジンからの評価が積み上がらない。
- 検索コンソール類へのサイトマップ送信やインデックス登録リクエストを行わないと、インデックス反映が遅れる。

## 切り分け手順

現状の SEO 基盤がすでに整っていることを、次の手順で確認しました。

1. **`index.html` の `<head>` を確認。** `description` / `keywords` メタ、`canonical`、`hreflang`（ja / en / x-default）、OpenGraph、Twitter Card が設定済みであることを確認。
2. **構造化データ（JSON-LD）を確認。** `WebApplication`・`FAQPage` の JSON-LD が存在し、いずれも有効な JSON であることを確認（本 PR で `FAQPage` に Q&A を追加し、`BreadcrumbList` を新規追加）。
3. **`robots.txt` を確認。** 一般クローラに加え、AI クローラ（GPTBot, Google-Extended, ChatGPT-User, Claude-Web, PerplexityBot, Bytespider, CCBot）を許可済みであることを確認。
4. **`sitemap.xml` を確認。** メインページと各シェアページの URL が列挙され、well-formed な XML であることを確認（本 PR でメインページの `lastmod` を更新）。
5. **不足箇所の特定。** 技術的基盤は充足しており、残るボトルネックは**外部での認知獲得・被リンク・検索コンソールへの登録**という、リポジトリ内では完結しない運用タスクであると結論づけた。

## すでに実装済みの SEO 基盤（再調査・重複実装を避けるための記録）

- **メタ情報**: `title` / `description` / `keywords` / `author` / `robots(index, follow)` / `canonical`。
- **多言語**: `hreflang` = ja / en / x-default、`og:locale` + `og:locale:alternate`。
- **SNS カード**: OpenGraph（`og:*`、1200x630 画像）、Twitter Card（`summary_large_image`）。
- **構造化データ (JSON-LD)**: `WebApplication`、`FAQPage`（本 PR で Q&A 追加）、`BreadcrumbList`（本 PR で追加）。
- **クローラ制御**: `robots.txt` で一般クローラおよび主要 AI クローラを明示的に許可。
- **サイトマップ**: `sitemap.xml`（メインページ + シェアページ、hreflang 付き）。
- **PWA / アイコン**: `manifest.json`、各種アイコン、`theme-color` など。

## この PR で行った増分改善（コードで完結する範囲）

- `index.html` の `FAQPage` 構造化データに、実機能に即した Q&A を 2 件追加:
  - 「APIキーなしで使えますか？」→ デイリーチャレンジは APIキー不要・登録不要で1日5問。AI 機能のみ APIキーが必要、という実態を回答。
  - 「フィードバックの送信にGitHubアカウントは必要ですか？」→ コピー経路はアカウント不要、という実態を回答。
- `index.html` に `BreadcrumbList` の JSON-LD を新規追加（既存構造化データと重複しない範囲）。
- `sitemap.xml` のメインページ `lastmod` を現在日付に更新（XML の妥当性は維持）。

> 上記はいずれも**事実に即した内容**のみを追加しており、根拠のない主張や既存構造化データの重複は行っていません。

## 要人間対応事項

以下は、サイト運用者（人間）が外部アカウント・外部媒体で実施するマーケティング／運用タスクです。**エージェントは実行しません**。この PR の時点で、記事公開や検索コンソール登録は**未実施**です。

- [ ] **技術記事の執筆・公開**: Qiita / Zenn などにアプリの紹介記事を執筆・公開し、本サイトへのリンクを張る（被リンク獲得と認知拡大）。※内容・公開はアカウント所有者本人が行う。
- [ ] **Google Search Console への登録**: サイト所有権を確認し、`sitemap.xml`（`https://kenta-matsuda.github.io/Kenta-Matsuda.github.io-aws-study/sitemap.xml`）を送信。主要 URL のインデックス登録をリクエスト。
- [ ] **Bing Webmaster Tools への登録**: 同様にサイト登録とサイトマップ送信を実施（必要に応じて Search Console から取り込み）。
- [ ] **被リンク・言及の獲得**: SNS（X 等）、技術コミュニティ、関連リポジトリの README などから本サイトへ言及・リンクしてもらう導線を作る。
- [ ] **インデックス状況のモニタリング**: 公開後、Search Console のカバレッジ / 検索パフォーマンスでインデックス状況と検索クエリを定期確認し、`description` やコンテンツを改善する。
- [ ] **（任意）構造化データの検証**: Google のリッチリザルトテストや Schema Markup Validator で `FAQPage` / `BreadcrumbList` / `WebApplication` の認識を確認する。

> これらはリポジトリ内のコード変更では完結しない外部作業のため、実行せずにここへ記録します。完了したら本ファイルを削除（または `docs/issues/` へ確定内容を移行）し、一覧と `docs/index.md` を更新してください。
