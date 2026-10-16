# AWS Study Navigator

[![Live Demo](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://kenta-matsuda.github.io/Kenta-Matsuda.github.io-aws-study/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
![visitor badge](https://visitor-badge.laobi.icu/badge?page_id=Kenta-Matsuda.github.io-aws-study&left_text=visitors)

**AWS認定 全13資格に対応した、無料の学習ナビゲーター。**  
試験ガイドに準拠したドメイン別ロードマップと AWS 公式リソース、AI 搭載クイズ・模擬試験で効率的に合格を目指せます。アカウント登録は不要で、学習記録はブラウザ内に保存されます。

**https://kenta-matsuda.github.io/Kenta-Matsuda.github.io-aws-study/**

---

## 対応資格（2026年10月時点）

| レベル | コード | 正式名称 | 改定・廃止の予定 |
|--------|--------|----------|------------------|
| Foundational | CLF-C02 | AWS Certified Cloud Practitioner | |
| Foundational | AIF-C01 | AWS Certified AI Practitioner | |
| Associate | SAA-C03 | AWS Certified Solutions Architect – Associate | |
| Associate | DVA-C02 | AWS Certified Developer – Associate | DVA-C03 へ改定（DVA-C02 は 2026/11/30 まで） |
| Associate | SOA-C03 | AWS Certified CloudOps Engineer – Associate | |
| Associate | MLA-C01 | AWS Certified Machine Learning Engineer – Associate | MLA-C02 へ改定中（日本語の MLA-C01 は MLA-C02 の一般提供 2027/1/14 予定まで） |
| Associate | DEA-C01 | AWS Certified Data Engineer – Associate | |
| Professional | SAP-C02 | AWS Certified Solutions Architect – Professional | SAP-C03 へ改定（SAP-C02 は 2026/11/16 まで） |
| Professional | DOP-C02 | AWS Certified DevOps Engineer – Professional | |
| Professional | AIP-C01 | AWS Certified Generative AI Developer – Professional | |
| Specialty | ANS-C01 | AWS Certified Advanced Networking – Specialty | 2026/12/31 で廃止（後継なし） |
| Specialty | SCS-C03 | AWS Certified Security – Specialty | |
| Business | AIB-C01 | AWS Certified AI Business Strategist | |

### 試験の改定・廃止スケジュール

AWS が発表している日程です（出典: [AWS Training and Certification Blog — September 2026](https://aws.amazon.com/blogs/training-and-certification/september-2026-new-offerings/)、各試験の公式ページ）。

- **MLA-C01 → MLA-C02**: 英語の MLA-C01 は 2026/9/28 で終了し、MLA-C02 のベータ試験（英語のみ）が 2026/9/29 から始まっています。日本語・韓国語・簡体字中国語の MLA-C01 は、MLA-C02 の一般提供（2027/1/14 予定）まで受験できます。
- **SAP-C02 → SAP-C03**: SAP-C02 は 2026/11/16 まで。SAP-C03 は 2026/11/17 から（受験登録は 2026/10/27 から）。
- **DVA-C02 → DVA-C03**: DVA-C02 は 2026/11/30 まで。DVA-C03 は 2026/12/1 から（受験登録は 2026/10/27 から）。
- **ANS-C01**: 2026/12/31 が最終受験日で、後継の試験はありません。取得済みの認定は通常どおり 3 年間有効です。

学習内容は、いま受験できるバージョンの試験ガイドに準拠しています。該当する試験を選ぶと、サイト上にも日付に応じたお知らせ（移行日を過ぎると自動で文言が切り替わります）とサイドバーのバッジが表示されます。予定は [`js/data/exam-lifecycle.js`](./js/data/exam-lifecycle.js) で管理しており、新バージョンへの切り替え手順は [docs/issues/exam-version-lifecycle.md](./docs/issues/exam-version-lifecycle.md) にまとめています。

## 主な機能

### 学ぶ

- **ドメイン別学習ロードマップ** — 試験ガイドのドメイン・配点・タスクステートメント（日英）と、タスクごとの AWS 公式リソース（ドキュメント、Black Belt、ブログ、Skill Builder、re:Post など。技術レベル表示付き）
- **はじめての AWS 認定ガイド** — AWS 認定試験の基本情報と、全試験に共通の学習リソース
- **リソース横断検索** — 全試験の学習リソースをキーワードで検索。AI 検索（HyDE によるクエリ拡張）にも対応
- **AI チューター** — 選択中の試験について質問できるチャット。試験ガイド・対象サービス・改定予定などの公式情報を踏まえて回答
- **学習パックの書き出し** — リソースリンク集（Markdown / CSV）、学習ルート（Markdown）、リソース用語集（CSV）。NotebookLM などに取り込めます

### 解く

- **AI クイズ** — 1問チャレンジ / 5問連続 / スピードラン / 本番模擬試験 / スマート復習（間違えた問題・苦手分野の復習）
- **本番模擬試験** — 試験ごとに本番と同じ問題数・制限時間。出題をタスク単位で配分し、出題計画 → 作問 → 重複検査 → AI による査読（Gemini の模擬試験で既定有効）の多段パイプラインで生成
- **問題セットの保存と再開** — 生成した問題は 1 問ごとにブラウザ内に保存され、中断しても再開できます（Gemini の Batch 生成はブラウザを閉じても続行）
- **API キー不要の問題** — デイリーチャレンジ（1日5問）と、内蔵の問題バンクによる本番形式の模擬試験
- **クイズ履歴** — 回答履歴の確認と CSV 書き出し

### 続ける

- **XP と称号** — 学習を積み上げるゲーミフィケーション。称号は X（Twitter）で共有できます
- **学習ストリークとリマインダー**、**ミッション**（デイリー / ウィークリー / マンスリー）
- **受験予定日のカウントダウン** と合格のお祝い
- **スキルレーダー** — ドメイン別の強み・弱みを可視化

### そのほか

- 日本語 / 英語、ライト / ダーク テーマ
- PWA 対応（ホーム画面に追加でき、オフラインでも閲覧できます）
- アカウント不要のフィードバック送信（画像添付可）と、AI の回答への Good / Bad 評価

## 使い方

1. [サイトにアクセス](https://kenta-matsuda.github.io/Kenta-Matsuda.github.io-aws-study/)
2. 画面左上の **☰** から受験予定の資格を選択（`#saa` のように URL の末尾で直接開くこともできます）
3. ドメインタブで学習範囲を確認し、公式リソースで学習
4. クイズで理解度をチェック（AI クイズには API キーが必要。デイリーチャレンジと本番形式の模擬試験はキー無しで使えます）
5. XP を貯めて称号をアンロック！

## AI 機能の設定

画面右上の **⚙️（設定）** から API キーを登録します。

| プロバイダ | 対象 | 料金 |
|-----------|------|------|
| Google Gemini | 18歳以上 | 無料枠あり |
| OpenAI | 13歳以上（18歳未満は保護者の同意が必要） | 従量課金 |

> API キーはブラウザ内（localStorage）にのみ保存され、AI プロバイダ（Google / OpenAI）の API を呼び出すとき以外には送信されません。

## ローカル起動

ビルドは不要です（Vanilla JS の ES Modules + HTML）。

```bash
node dev-server.mjs
# http://localhost:8000/
```

## テスト

```bash
npm install
npx playwright install chromium
npx playwright test
```

`playwright.config.mjs` がテスト用の開発サーバー（ポート 8877）を自動で起動します。`npm test` はプレースホルダのため使いません。

## ディレクトリ構成

| パス | 内容 |
|------|------|
| `index.html` | アプリ本体（1 ページ構成） |
| `js/` | アプリのモジュール（UI・クイズ・AI 連携・保存・i18n など） |
| `js/data/` | 試験データ（試験ごとに 1 ファイル）、問題生成用のカード、改定・廃止スケジュール |
| `js/locales/` | 日本語 / 英語の文言 |
| `scripts/` | 保守用スクリプト（リンク死活チェック、リソースのカバレッジ分析など） |
| `infra/feedback/` | フィードバック収集バックエンド（AWS SAM） |
| `docs/` | 設計・解説ドキュメント（索引: [docs/index.md](./docs/index.md)） |
| `tests/` | Playwright のテスト |

## Contributing

Issue・Pull Request 歓迎です。詳しくは [CONTRIBUTING.md](./CONTRIBUTING.md) をご覧ください。

## License

[MIT](./LICENSE)
