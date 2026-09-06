# Issue: 問題生成が失敗したときに原因が分からない (#169)

## 概要

issue #169 のフィードバック。

> 問題生成に失敗する。ネットワークをwifiに途中で切り替えたから？それとも別の問題がある？

## 回答（原因の切り分け）

**はい、生成中のネットワーク切り替えは失敗の原因になります。** 本アプリは Gemini / OpenAI の
ストリーミング（SSE）で応答を受け取るため、受信中に回線が切り替わると読み取りが中断され、
`fetch()` が `TypeError: Failed to fetch` で reject します。プロバイダ側の実装はモデル候補ごとに
3 回（1 秒 / 2 秒 / 4 秒バックオフ）リトライしますが、切断が続くと最終的に失敗します。

問題は**その失敗が「エラーが発生しました: Failed to fetch」としてそのまま表示されていた**ことで、
これでは利用者に原因も対処も伝わりません。「別の問題があるのか」を判断できない状態でした。

## 対応

失敗の種類を分類し、ネットワーク起因なら**何が起きて何をすればよいか**を日本語 / 英語で伝えます。

- `js/aiErrors.js`（新規）: `classifyAiFailure(error, { online })` を追加。DOM / i18n に依存しない
  純ロジックとして切り出し、単体テスト可能にした。
  - `AbortError` → `aborted`
  - `TypeError`（`fetch` の失敗）や `Failed to fetch` / `NetworkError` / `Load failed` /
    `net::ERR_INTERNET_DISCONNECTED` / `fetch failed` 等の文言 → `network`
  - 同じ失敗で `navigator.onLine === false` のとき → `offline`
  - サーバ / API 由来のエラー（`Server Error: 500`、APIキー不正、クォータ超過など）→ `unknown`
    として**元の詳細メッセージを保持**する（原因調査のため潰さない）
- `js/gemini.js` / `js/openai.js`: 最終的な失敗の戻り値を `describeFailure()` に集約し、分類結果に
  応じた文言を返す。既存の失敗検知が `errors.generic` の接頭辞を見ているため、**メッセージは
  `errors.generic` で包んだまま**にして互換性を保つ。
- `js/locales/{ja,en}.json`: `errors.networkInterrupted` / `errors.offline` / `errors.aborted` を追加。
  ネットワーク中断の文言では「生成中に Wi-Fi とモバイル回線を切り替えると発生する」ことを明示した。
- `js/ui.js` の `isSuccessfulAiResponse()`: 失敗判定が日本語リテラル固定だったため、現在のロケールの
  `errors.generic` 接頭辞でも判定するようにした（英語表示時に長いエラー文が「成功」と誤判定されるのを防ぐ）。
  従来の日本語リテラル判定も残している。

なお、モーダルの再試行ボタン（`aiRetryBtn`）は従来どおり有効なので、接続が戻ったらそのまま再実行できます。

## 検証

- `tests/ai-error-classify.spec.mjs`（9 テスト）
  - `classifyAiFailure()` の純ロジック: `TypeError: Failed to fetch` → `network`、`onLine === false`
    → `offline`、各種ネットワーク文言、`AbortError` → `aborted`、API エラーは `unknown` のまま、
    `null` / `undefined` / 文字列でも例外を投げないこと、キーとロケールエントリの対応
  - **`page.route(..., route.abort('connectionfailed'))` で回線切断を再現**した E2E:
    モーダルに「通信が中断されました」が表示され、`Failed to fetch` が出ないこと
- `npx playwright test`（全 32 テスト）成功
