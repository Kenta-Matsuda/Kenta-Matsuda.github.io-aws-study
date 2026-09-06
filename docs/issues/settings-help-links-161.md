# Issue: API 設定画面の Google AI Studio リンクが消えていた問題 (#161)

## 概要

issue #161 のフィードバックは 1 点。

> 前まで api 設定画面に google ai studio のリンクがあってとべた。これを復活させて

## 原因

`js/i18n.js` の `translateStaticElements()` は `data-i18n` を持つ要素に対して
`el.textContent = translated` を実行する。`index.html` の Gemini API キーの説明文は
`data-i18n="settings.geminiKeyHelp"` を持つ `<p>` の中に Google AI Studio への
`<a>` を含んでいたため、**翻訳が適用された瞬間に子要素の `<a>` が破棄されて
プレーンテキストになっていた**。

同じ原因で OpenAI Platform のリンク（`settings.openaiKeyHelp`）も失われていた。

## 対応

`textContent` の一括置換で消える構造をやめ、**翻訳文の中にリンクの差し込み位置を持たせる**
仕組みを追加した。

- `js/i18n.js`: `data-i18n-tmpl` 属性を新設。翻訳文に含まれる `{{link}}` を境に前後を
  テキストノードへ分割し、要素内の `data-i18n-slot` を持つ既存ノード（リンク）を
  そのまま挟み込んで再構築する（`replaceChildren`）。
- `index.html`: 2 つの説明文を `data-i18n` から `data-i18n-tmpl` に変更し、`<a>` に
  `data-i18n-slot` を付与。
- `js/locales/{ja,en}.json`: 該当文言に `{{link}}` プレースホルダを追加。

### 設計上の判断

- **`href` / `rel` / `target` は HTML 側に残す**。locale JSON にマークアップを持たせて
  `innerHTML` で流し込む方式は採らなかった。URL の二重管理を避け、locale ファイル由来の
  マークアップ注入経路を作らないため。
- 翻訳文に `{{link}}` が無い場合はリンクを末尾に付けてフォールバックする（リンクを
  黙って落とさない）。

## 検証

- `tests/settings-links.spec.mjs` を追加。ja / en の両ロケールで、Gemini・OpenAI の
  ヘルプ文にリンクが 1 個存在し、`href` / `target` / `rel` と表示テキストが正しく、
  周囲の文言が翻訳済みで `{{link}}` が露出していないことを検証する。
- 修正前は 3 テストすべて失敗、修正後は全て成功することを確認（回帰テストとして有効）。
- 既存の Playwright スイート（26 テスト）も全て成功。
