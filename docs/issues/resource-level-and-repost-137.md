# Issue: ブログの技術レベル表示と re:Post リソースの拡充 (#137)

## 概要

issue #137 のフィードバックは 2 点。

- AWS 公式ブログのリソースについて、分かるものは技術レベル（例: Level 200）を補足として表示してほしい（ANS の画面表示・リソース管理を参照）。
- AWS re:Post のリソースがほとんどないが、AWS 公式の有益な投稿もあるので確認・追加してほしい。

## 対応方針

### 1. 技術レベル表示の仕組み（実装済み）

リソースアイテムに任意フィールド `level` / `levelEn` を追加し、`js/ui.js` の `renderBlogCard` で
くすんだインディゴ色のレベルバッジとして表示する機構を実装した（ja/en i18n 対応、`recommend`
バッジとは色で区別）。詳細な実装点と付与基準は LLM Wiki に集約している。

- 実装: `js/data/*.js`（`level` / `levelEn`）、`js/ui.js`（`localizedResourceLevel` /
  `normalizeResourceItems` の whitelist / `renderBlogCard`）、`js/locales/{ja,en}.json`（`roadmap.level`）。
- リポジトリ内で根拠が明確なもの（ANS の一部）に限り控えめに `level` を付与して実証済み。

### 2. フォローアップ（ネットワーク可能環境で実施）

各ブログの技術レベルの網羅的な確定、および re:Post 記事の実地収集・検証は、外部 web アクセスが
必要で本サンドボックス（INTEGRATIONS_ONLY）では実行できない。判定基準・探索手順は LLM Wiki に
構造化して残し、ネットワーク可能な環境（利用者の Kiro automations / `exam-content-maintainer`
エージェント）で実行する前提とした。

- 判定基準・探索手順（本 issue の詳細）: [AWS 公式リソース探索ノウハウ](../wiki/aws-resource-discovery.md)
  - 「ブログの技術レベル判定基準 (Level 100/200/300/400)」
  - 「AWS re:Post (repost.aws) リソースの探索・検証手順」

> このファイルは追跡用のポインタです。基準・手順の本文は上記 LLM Wiki を参照（重複させない）。
