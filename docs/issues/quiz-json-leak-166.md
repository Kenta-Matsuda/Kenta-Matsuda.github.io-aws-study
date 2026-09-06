# Issue: 「模擬問題を作成」で JSON がそのまま表示される問題 (#166)

## 概要

issue #166 のフィードバック。

> 模擬問題を作成、とすると json で表示されてしまうので対処して（スクリーンショット添付）

issue #84 で「AI 問題が生 JSON で表示される」問題は一度対処されており、`parseQuizResponse()` の
堅牢化と回帰テスト（`tests/quiz-parse.spec.mjs`）が入っています。今回は**パーサではなく表示側**に
残っていた 3 つの経路が原因でした。

## 原因（生 JSON が画面に出る 3 経路）

`generateQuiz()`（タスクカードの「模擬問題を作成」ボタン）で確認した経路。

1. **ストリーミング中の生表示**: `onTextDelta` が `updateAiModalContentStreaming()` を呼び、
   受信した部分テキストをそのままモーダルへ流していた。問題生成の応答は**プロース（散文）ではなく
   JSON 契約**なので、生成中はずっと JSON が流れて見える。スクリーンショットの状態がこれ。
2. **短い応答が「失敗」扱いされて素通し**: `isSuccessfulAiResponse()` は `text.length < 80` を
   失敗と見なす。正常な問題 JSON は 80 文字未満になり得るため、`updateAiModalContent(els, response)`
   で JSON がそのまま描画されていた。
3. **パース失敗時のフォールバック**: パースできなかった応答を「旧 markdown 形式かもしれない」として
   そのまま描画していた。JSON が壊れている場合はこれが生 JSON の表示になる。

## 対応

- **生成中は JSON を見せない**: `updateQuizGenerationProgress()` を追加し、問題生成中はローディング
  表示を維持したまま「問題を生成中...（N 文字受信）」だけを更新する。部分テキストはモーダルへ入れず、
  コピー用データにも入れない。
- **短い応答でも先にパースを試す**: `parseQuizResponse()` を `isSuccessfulAiResponse()` より先に
  実行する。パースできれば正常な問題として扱い、長さ判定で捨てない。
- **JSON 契約らしい応答は生表示しない**: `looksLikeQuizJson()`（`js/quiz.js` に追加）で
  「問題 JSON を出そうとして失敗した応答」を判定し、その場合は `quiz.generateFailed`
  （「問題を組み立てられませんでした…もう一度お試しください」）を表示する。生応答は
  `console.warn` にだけ残す。旧 markdown 形式（散文）はこれまでどおり表示する。

事前生成（スピード / 本番模擬 = `preGenerateQuestions()`）は元々オーバーレイで進捗のみを表示しており
生 JSON を出す経路ではないため変更していません。

## 検証

- `tests/quiz-json-leak.spec.mjs`（7 テスト）
  - `looksLikeQuizJson()` の純ロジック: 素の JSON / フェンス付き / 前置き散文つきを検出し、
    通常の散文・markdown 解説・旧形式（【問題文】…）・無関係な JSON は検出しない
  - **Gemini のストリーミングエンドポイントを `page.route` でスタブ**した E2E:
    壊れた問題 JSON では生 JSON が出ずに日本語のエラー文が出ること（`{` や `"question"` が
    モーダルに現れないこと）
  - 同じスタブで**正常な問題 JSON なら対話型クイズが描画される**こと（回帰防止）
- 回帰テストとしての有効性: `js/ui.js` の修正だけを `git stash` で戻すと E2E が失敗し、
  戻すと成功することを確認
- `npx playwright test`（全 30 テスト）成功
