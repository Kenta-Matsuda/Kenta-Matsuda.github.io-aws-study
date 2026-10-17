# AWS 公式ドキュメントが対応する全言語へのサイト対応（多言語化）

🟢 対応済み（フェーズ 1 = 機構・UI 辞書、フェーズ 2 = 全試験コンテンツの 9 言語翻訳。残りは任意の改善のみ）

- 種別: エージェント作業（翻訳の量産）＋ 人間による任意の品質確認
- 関連: #197
- 位置づけ: 多言語化の設計と進捗の記録。**方針はユーザー決定（2026-10-13）で更新済み**（下記「方針」）。旧版にあった「機械翻訳は公開しない」「人間がプロダクト判断を下すまで待つ」は撤回された。

## 症状（要望）

issue #197（フィードバックフォームからの要望）:

> AWSの公式ドキュメントが対応している言語はすべて、このサイトでも対応できるようにして。

## 方針（ユーザー決定 2026-10-13）

1. **AI が生成する試験コンテンツは選択中の言語で出力する。** Gemini / OpenAI で生成する問題・解説・チャット・用語解説・AI 検索の回答は、日本語 / 英語に限らず表示ロケールの言語で生成する。
2. **それ以外の翻訳が必要なもの（UI 文言・静的な学習コンテンツ）は LLM 翻訳してよい。** その代わり、機械翻訳ロケールでは控えめな注記を出し、フィードバックで誤訳を報告できるようにする。
3. **対象は AWS ドキュメントの対応言語すべてを一度に。** 既存の日本語・英語に加え、`ko`（한국어）/ `zh-CN`（中文(简体)）/ `zh-TW`（中文(繁體)）/ `fr`（Français）/ `de`（Deutsch）/ `es`（Español）/ `it`（Italiano）/ `pt-BR`（Português）/ `id`（Bahasa Indonesia）の 9 言語。
4. **フォールバック:** ja / en 以外のロケールで訳が無いものは**英語**へフォールバックする（英語が無い項目に限り日本語）。URL は AWS ドキュメント（`docs.aws.amazon.com`）だけロケールのパス（`/ko_kr/` 等）へ向け、それ以外のサイトの URL は推測で作らない（英語版 URL、無ければ元の URL）。

## フェーズ 1（実装済み）

### 1. ja/en 二分岐の一般化

- `getLocale() === 'en' ? 英語 : 日本語` の分岐（js/ 全体で約 160 箇所）を次の 3 種に整理した。
  - **UI 文言** → `t()` キーへ（ja.json / en.json に追加）。en 表示でも日本語が出ていたハードコード文言（バッチ生成の通知・エラー、復習履歴、API キー保存メッセージ、学習履歴エクスポート、Gemini Batch のエラー等）もあわせて解消。
  - **静的データ（`js/data/*.js`）の対訳フィールド** → `js/localeContent.js` の `localizedField(obj, 'title')` に一本化。命名規則（`title`+`jpTitle` / `<field>`+`<field>En` / `<field>Ja`+`<field>En`）の差を吸収し、`ja` は日本語、`en` は英語、それ以外は **翻訳オーバーレイ → 英語 → 日本語** の順で返す。ui.js・studyPack.js・roadmapTaskStatement.js・daily-challenge.js・offline-exam-bank.js などの読み出しはすべてこれを通る。
  - **AI プロンプト** → `ja` は従来の日本語プロンプト、それ以外は従来の英語プロンプトを使い、`ja`/`en` 以外のロケールでは `outputLanguageDirective()` で「出力は Korean (한국어) で。AWS のサービス名・機能名は公式の英語表記のまま、JSON キー・選択肢記号・URL は変えない」を付与する（quiz の各 system prompt、examJudge の editor、用語解説、AI 検索、チャットの `Respond in …`）。ja / en のプロンプトは従来どおり。
- ロケールのメタデータ（ネイティブ名・英語名・Intl タグ・docs パス・機械翻訳フラグ）は `js/localeRegistry.js` の `LOCALE_METADATA` に集約。出荷ロケールの一覧は `LOCALE_REGISTRY`。
- ブラウザ言語の検出は `navigator.languages` を順に照合（`zh-Hant` / `zh-TW` / `zh-HK` / `zh-MO` → `zh-TW`、その他の `zh` → `zh-CN`、`pt*` → `pt-BR`、旧タグ `in` → `id`、`fr-CA` → `fr` など）。
- 日付は `Intl`（`formatDate`）で表示ロケールに合わせる。`<html lang>` は BCP 47 コード（`zh-TW` 等）。
- `?lang=<code>` のクエリ（共有リンク等）で言語を選んで記憶できる（`?lang=zh-HK` → `zh-TW` のように検出と同じ規則で丸める）。

### 2. 静的コンテンツの翻訳フォーマット（オーバーレイ）

- 訳文は **`js/data/i18n/<locale>/<sourceId>.json`** に置き、データファイル本体は変更しない。

  ```json
  {
    "locale": "ko",
    "source": "soa-c03",
    "machineTranslated": true,
    "strings": {
      "Register for the exam": "시험 등록",
      "- Skill 1.1.1: …": "- 스킬 1.1.1: …"
    }
  }
  ```

- **キーは原文そのもの**（英語。英語の無い項目だけ日本語）。重複する文字列は 1 回訳せば全箇所に効き、データ側で原文が変わると旧キーは stale になり新しい原文は英語のまま表示される（検証スクリプトが検出）。
- ソース ID: 試験 ID（`clf-c02` 等）/ `common`（共通ステップ・リソース群の既定ラベル・試験カテゴリ）/ `daily-challenge` / `offline-exam-bank`。
- 実行時は `js/data/i18n/index.json`（目録）にあるファイルだけを、表示中のロケールと試験について遅延取得する（ja / en は取得しない）。試験切替・言語切替のたびに必要分を読み、届いたら再描画する。
- ツール: `scripts/content-overlay.mjs`

  | コマンド | 内容 |
  | --- | --- |
  | `node scripts/content-overlay.mjs sources` | ソース ID ごとの原文件数・文字数（作業量の見積もり） |
  | `node scripts/content-overlay.mjs extract --locale ko --source clf-c02 [--prune]` | 訳文 `""` のテンプレートを作成／既存ファイルに不足キーを追記（`--prune` で stale キー削除） |
  | `node scripts/content-overlay.mjs validate [--locale ko] [--source clf-c02] [--strict]` | 形式・stale・未翻訳・URL / `{{x}}` / 先頭の `- ` / `1.2.3` 形式の番号の保持、目録との整合（`--strict` で未翻訳もエラー） |
  | `node scripts/content-overlay.mjs index` | 訳文のあるファイルから `js/data/i18n/index.json` を再生成 |

- 翻訳の約束: AWS のサービス名・機能名・認定資格名は公式の英語表記のまま／URL・`{{placeholder}}`・先頭記号・番号はそのまま／値だけを訳しキーは変えない。
- **パイロット翻訳**: `soa-c03`（276 文字列）と `common`（51 文字列）を 9 言語すべてで翻訳済み。
- **フェーズ 2（2026-10-13 完了）**: 残り 14 ソース（約 6,054 文字列）も 9 言語すべてで翻訳し、全 144 ファイルが `validate --strict` を通過（未翻訳・stale・プレースホルダ欠落ゼロ、訳文に日本語の仮名なし）。

### 3. UI 辞書・切替 UI・注記

- `js/locales/<code>.json` を 9 言語分追加（`en.json` の完全なキーミラー、LLM 翻訳）。`LOCALE_REGISTRY` に登録し、`sw.js` でプリキャッシュ（`CACHE_VERSION` を v12 に）。
- 設定モーダルの言語切替はボタン列から `<select>` に変更（11 言語でもスマホ幅で使える。各 option はネイティブ名で `lang` 属性つき）。
- 機械翻訳ロケールでは、ヘッダー下に控えめな注記（「AI による機械翻訳です」＋「翻訳の問題を報告」ボタン → フィードバックフォームを `[翻訳の問題] (ko)` 付きで開く）を表示。閉じるとロケールごとに記憶。設定モーダルの言語欄にも同じ趣旨の注記。

### 4. テスト

- `tests/locale-content.spec.mjs`: `localizedField` のフォールバック順、オーバーレイのローダ、プロンプトの出力言語、問題バンク等の新ロケール挙動、オーバーレイ検証スクリプト、コミット済みオーバーレイの全件検証（未翻訳・stale・プレースホルダ欠落ゼロ）。
- `tests/locale-registry.spec.mjs`: 全辞書のキーミラー・プレースホルダ・配列長、SW プリキャッシュ、言語検出、docs URL 変換、言語メニュー。
- `tests/i18n-locales-e2e.spec.mjs`: 韓国語で UI・注記・オーバーレイが表示され主要画面に日本語が漏れないこと、言語切替、注記からのフィードバック導線、`zh-HK` / `pt-PT` ブラウザの検出。

## 残作業（任意の改善）

1. **原文データの修正**。翻訳中に見つかった原文側の問題（訳文は原文どおりに訳しているため、原文を直したら該当ソースを `extract --prune` → 再翻訳）:
   - 英語の対訳が無く日本語のみの項目（aip-c01 ドメイン 4–5 / clf-c02 タスク 3.2–4.3 / dea-c01 ドメイン 3–4、計約 300 件）。英語表示でも日本語のまま出ている。`titleEn` / `noteEn` 等を足すと en も改善する。
   - サービス名の誤り: ans-c01「Amazon Transit Gateway」→ AWS Transit Gateway、「AWS Route 53」→ Amazon Route 53／aip-c01「AWS Transcribe」→ Amazon Transcribe／daily-challenge「Amazon IAM」→ AWS IAM／offline-exam-bank「Amazon Snowball」→ AWS Snowball。
   - 表記: ans-c01 の Task 1.4 先頭の余分な空白、「Youtube」/「YouTube」の混在、dea-c01「Amazon Athena Athena SQL 編」の重複、「AWS CloudFormation#1」の空白欠落、clf-c02 の「6Rs」（sap-c02 は 7Rs）、offline-exam-bank の「Egress-Only Internet Gateway (IPv4)」（IPv6 専用）。
2. **学習パック（studyPack.js）の固定見出し**は ja 以外で英語（データ部分はオーバーレイで翻訳される）。必要なら辞書キー化する。
3. **静的 HTML の SEO 部分**（`<noscript>` 内の紹介文・JSON-LD・`og:locale`）は日本語のまま。`hreflang` は既存の ja/en と同じく全言語が同一 URL（canonical はルート）のため増やしていない。`?lang=` を言語別 URL として検索エンジンに出す場合は、canonical・`hreflang`・`sitemap.xml` をまとめて設計し直す。
4. 新しい UI 文言を ja.json / en.json に追加したら、9 言語の辞書にも同じキーを追加する（`tests/locale-registry.spec.mjs` がキーミラーとプレースホルダを検査する）。

## 要人間対応事項

⚠️ 必須の人間作業は無い（AWS 操作も不要）。任意で次を確認すると品質が上がる。

- 各言語のネイティブ話者による UI 辞書・コンテンツ翻訳の目視確認。誤訳はフィードバックフォーム経由でも集まる。
