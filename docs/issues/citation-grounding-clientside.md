# Issue: 解説の出典URL可視化とプロンプトgroundingの厳格化（クライアント側） (#109)

## 概要

issue #109（AWS ドキュメント MCP による grounding と LLM as a judge）の本質的な対応は、
静的サイトの外にバックエンドプロキシとリモート MCP 接続を要する**要人間対応事項**です
（設計は `docs/action-required/mcp-grounding-llm-judge.md` に整理済み）。

一方で、**追加の LLM / API 呼び出しを一切増やさずに**、クライアント側だけで信頼性の体感を
高められる小さな改善があります。本 PR は PR #113 のメンテナ指摘
「追加LLM呼び出し不要のクライアント側改善（出典URLの可視化強化・プロンプトgrounding厳格化）を
別の小さいPRに切り出す」に応えて、その**クライアント側スライスのみ**を切り出したものです。

この PR は #109 をクローズしません（本質部分の要人間対応が残るため）。

## 変更内容

### 1. プロンプト grounding の厳格化（`js/quiz.js`）
- `buildQuizSystemPrompt()` / `buildSpeedQuizSystemPrompt()` / `buildMockQuizSystemPrompt()`
  の信頼性ルールを、日本語・英語の両ブランチで強化。
  - 参考 URL は **`https://docs.aws.amazon.com/` ドメインに限定**するよう明示。
  - **推測・憶測での出題を禁止**する文言を追加。
  - URL を捏造しないよう明示。
- JSON 出力契約（`question` / `choices` / `correct` / `explanation`）は変更していません。
  パーサが期待しないフィールドは追加していません。

### 2. 出典URLの可視化とリンクの安全化（`js/ui.js`）
- クイズ解説の描画パスで、サニタイズ済み HTML 挿入後に**アンカーを安全化**
  （AI モーダルの `updateAiModalContent` と同様に `target="_blank"` / `rel="noopener noreferrer"`）。
- 解説本文から **AWS 公式ドキュメント URL（`https://docs.aws.amazon.com/...`）を抽出**し、
  解説の下に独立した**「出典」ブロック**として表示。本文に URL が埋もれず、
  ユーザーが一次情報へ辿りやすくなる。
- 出典ブロックは DOM ノード生成＋`textContent` / `href` 設定で構築しており、
  信頼できない文字列を生の `innerHTML` に流し込まない（XSS を作らない）。

### 3. i18n
- 見出しラベル `quiz.sourcesLabel` を `js/locales/ja.json` と `js/locales/en.json` の
  両方に追加（キー集合はミラー）。`t()` 経由で参照。

## 技術的な実装方針
- 追加の LLM / API 呼び出しは行わない（純粋にクライアント側の表示・プロンプト文言の強化）。
- 既存ヘルパ（`renderMarkdownToSafeHtml`、`escapeHtml`、AI モーダルのリンク安全化）と一貫。
- URL 抽出は `https://docs.aws.amazon.com/` プレフィックスに限定した正規表現で行い、
  de-dup と末尾句読点のトリムを行う。

## 受入条件
- 3 つのプロンプトビルダー（ja / en 両方）で参考 URL が `docs.aws.amazon.com` に限定され、
  推測での出題が禁止されている
- 解説に AWS 公式ドキュメント URL があるとき、独立した「出典」ブロックが表示される
- 解説内リンクが `target="_blank"` / `rel="noopener noreferrer"` で安全化されている
- 追加の LLM / API 呼び出しが無い
- 新規 i18n キーが ja / en にミラーされ、両方がパースできる
- `#109` をクローズしない
