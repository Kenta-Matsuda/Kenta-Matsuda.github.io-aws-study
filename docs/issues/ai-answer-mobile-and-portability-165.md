# Issue: スマホで AI 解説のコピーボタンが見切れる / 学習ライフ全体での使いやすさ (#165)

## 概要

issue #165 のフィードバックは 2 層に分かれます。

> スマホで使っているとき、ai 解説文生成すると下の good bad が大きくてコピーが見切れる。
> good bad はアイコンだけで十分でしょ？
> 逆にコピーだけでなく保存(後から見返せるようにする)とか、なんか別の saas (notebookLM など)との
> 接続インポートしやすいとか、学習者の色々な学習ライフ全体を考慮しながら、(このアプリを超えて)
> ユーザーが学習全体を通して使いやすいようなアプリにしたい

1. **すぐ直せる不具合**: スマホでフッターのボタン列が溢れ、コピーボタンが見切れる。
2. **より大きな要望**: 保存・他 SaaS への持ち出し（NotebookLM など）を含めた「学習ライフ全体」での使いやすさ。

本ドキュメントの対応は 1 に限定し、2 は設計メモとして残します（issue はクローズしません）。

## 1. フッターの見切れ（対応済み）

AI 回答モーダルのフッターは `flex justify-end gap-2` の 1 行で、Copy / Good / Bad / Retry /
Next Question / Close が並びます。幅 390px 相当のスマホではこれが収まらず、左端の Copy が
見切れていました。

- `index.html`: フッターを `flex flex-wrap justify-end items-center gap-2` にし、収まらない場合は
  **折り返す**（切り落とさない）ようにした。
- Good / Bad のテキストラベルを `sm` ブレークポイント未満で非表示（`hidden sm:inline`）にし、
  **スマホではアイコンのみ**にした。指摘のとおりアイコンで意味は通ります。
- アクセシビリティを落とさないため、両ボタンに `aria-label` と `title` を付与し、i18n キー
  （`common.helpful` / `common.notHelpful`）で日英に対応させた。ラベルを視覚的に隠しても
  スクリーンリーダーからは読める状態を保っています。

## 2. 保存・他 SaaS への持ち出し（未対応 / 設計メモ）

現状の到達点と、クライアントサイドだけで実現できる範囲を整理します。

### 現状

- **コピー**: `#aiCopyBtn` は解説を **Markdown のまま**クリップボードへコピーします（`data-aiCopyText`）。
  NotebookLM や Obsidian などは Markdown を貼り付けられるため、**最短の持ち出し経路は既に存在**します。
- **保存**: クイズの履歴（`asn_quiz_history_v1`）と復習機能はありますが、**AI 解説文そのものを
  保存して後から見返す仕組みはありません**。

### クライアントサイドで実現できる案（バックエンド不要）

| 案 | 実現方法 | 備考 |
| --- | --- | --- |
| 解説のローカル保存 + 一覧 | `localStorage` に `{examId, term/taskId, markdown, createdAt}` を追記し、履歴ビューから再表示 | 容量上限（数 MB）に注意。件数上限と古い順の破棄が必要 |
| Markdown ファイルとしてダウンロード | `Blob` + `URL.createObjectURL` で `.md` を保存 | NotebookLM はファイルアップロードに対応。1 クリックで持ち出せる |
| まとめてエクスポート | 保存済み解説を 1 つの `.md` / `.zip` に束ねて出力 | NotebookLM の「ソース」として投入しやすい |
| 共有（Web Share API） | `navigator.share()` でスマホの共有シートへ | 対応ブラウザのみ。他アプリへの受け渡しが最短になる |

### バックエンドが必要になる案

- 端末をまたいだ同期（別のスマホ / PC で同じ保存内容を見る）。
- NotebookLM 等への**API 連携**（OAuth とトークン管理が必要。ブラウザだけでは秘密情報を保持できない）。

これらは既存の [バックエンド実装計画](../action-required/issue-117-backend-implementation-plan.md) と
同じ検討軸（認証・データストア・費用）に載るため、そちらへ統合して判断するのが妥当です。

### 推奨する次の一手

1. **Markdown ダウンロード**（実装量が小さく、NotebookLM への持ち出しに直結）
2. **解説のローカル保存 + 一覧**（「後から見返せる」の中核。容量管理の設計が要る）
3. 端末間同期 / API 連携は 1・2 の利用実態を見てから判断（バックエンド前提）

## 3. 追加フィードバック（2026-09-06 コメント）への対応

PR #180 に後から次の追加要望をいただきました。

> 保存 / 他 SaaS 連携について、以下の方針で実装してほしいです
> - 問題データの CSV ダウンロード（過去の問題復習とかするために、localStorage に保存していたはず）
> - NotebookLM 向けの"学習パック"を提供する（一次ソース一覧 / ホワイトペーパーのリンク集 / 問題集 CSV /
>   学習ルート Markdown / 用語集 CSV を ZIP にまとめる）
> - 一次リソース検索 API
> - 学習者の得意・不得意分析 API

これらを **クライアントサイドで実現できるもの**と **バックエンドが必要なもの**に切り分けて扱います。

### 3-1. 問題データの CSV ダウンロード（本 PR で対応済み）

localStorage の学習履歴（`asn_quiz_history_v1`。`addQuizResult` が問題文・選択肢・正解・自分の回答・
解説・所要時間を保存している）を **CSV としてダウンロード**できるようにしました。

- 変換ロジックは `js/quizCsv.js`（`quizHistoryToCsv` / `escapeCsvField` / `QUIZ_CSV_HEADERS`）へ
  ピュア関数として切り出し、localStorage やブラウザ無しでも単体テストできるようにした
  （`js/markdown.js` / `js/aiErrors.js` と同じ方針）。
- 学習履歴モーダル（`quizHistoryModal`）に既存の「Markdown で書き出し」ボタンの隣へ
  **「CSV で書き出し」ボタン**（`#quizHistoryExportCsvBtn`）を追加。選択中の試験で絞り込める。
- 列: `answeredAt / examId / domainId / mode / question / choiceA〜E / correctAnswer / yourAnswer /
  isCorrect / elapsedSec / explanation`。カンマ・引用符・改行は RFC 4180 でエスケープし、
  Excel の文字化けを避けるため UTF-8 BOM を付与してダウンロードする。
- 既存の Markdown 書き出しボタンは「Markdown で書き出し」に名称変更し、CSV と用途を明確化した。

これで「問題集 CSV」（学習パックの構成要素の 1 つ）はクライアント側で単体提供できます。

### 3-2. NotebookLM 向け学習パック / 各種 API（要人間対応）

NotebookLM 学習パック（複数資料の ZIP 一括提供）と、一次リソース検索 API・得意/不得意分析 API は、
その本質（横断集計・サーバ側の検索基盤・API 提供）からバックエンドが必要です。切り分けと想定設計は
[NotebookLM 学習パックと学習分析 API](../action-required/issue-165-notebooklm-pack-and-apis.md) に
構造化しました（学習パックの一部要素は 3-1 の CSV のようにクライアント側で個別提供できる余地も併記）。

## 検証

- `tests/ai-modal-footer.spec.mjs`（3 テスト）
  - 幅 390px で Copy ボタンがビューポート内に完全に収まり、ラベルも自身のボタン内に収まること
  - 幅 390px で Good / Bad のテキストが非表示になり、アイコンと `aria-label` が残ること
  - 幅 1280px ではテキストラベルが再表示されること
- 修正前は 3 テストとも失敗、修正後は成功することを確認
- `tests/quiz-csv.spec.mjs`（5 テスト）: `quizHistoryToCsv` / `escapeCsvField` のピュアロジック検証
  （空履歴でヘッダーのみ / 問題文の無いエントリを除外 / インデックス→文字と正誤ラベル / RFC 4180 エスケープ /
  カンマ入り問題文が 1 フィールドに収まる）。`js/quizCsv.js` を `node` で直接実行し、期待どおりの CSV が
  出力されることを確認済み。
- 追加のフッター修正時点では `npx playwright test`（全 26 テスト）成功。ただし本追加コミット（CSV）の実行環境は
  外部ネットワーク遮断（INTEGRATIONS_ONLY）で npm レジストリ / Playwright ブラウザを取得できないため
  `npx playwright test` は実行不可（`npm error 403 Forbidden`）。CSV ロジックは `node --check` と
  `node` での直接実行で代替検証した。
