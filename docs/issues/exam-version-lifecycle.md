# 試験バージョンの改定・廃止のお知らせ（対応資格の最新化 2026-10）

- 依頼: 「サイトの対応資格を最新の状態に合わせて。例えば CLF-C02 じゃなくて CLF-C03 とかが出た気がする」
- 調査日: 2026-10-16（AWS 公式ブログ・認定ページ・試験ガイドの検索結果で確認）

## 調査結果（2026-10-16 時点）

**CLF-C03 は発表されていません。** Cloud Practitioner の現行版は CLF-C02 のままです（試験ガイドも CLF-C02）。一方で、次の 4 試験に改定・廃止の発表があります。

| 試験 | 現行版 | 予定 | 日程（AWS 発表） |
| --- | --- | --- | --- |
| Machine Learning Engineer - Associate | MLA-C01 | MLA-C02 へ改定 | 英語の MLA-C01 は 2026-09-28 で終了。MLA-C02 のベータ（英語のみ）は 2026-09-29 から。日本語・韓国語・簡体字中国語の MLA-C01 は MLA-C02 の一般提供（2027-01-14 予定）まで受験可能 |
| Solutions Architect - Professional | SAP-C02 | SAP-C03 へ改定 | SAP-C02 は 2026-11-16 まで。SAP-C03 は 2026-11-17 から（受験登録は 2026-10-27 から） |
| Developer - Associate | DVA-C02 | DVA-C03 へ改定 | DVA-C02 は 2026-11-30 まで。DVA-C03 は 2026-12-01 から（受験登録は 2026-10-27 から） |
| Advanced Networking - Specialty | ANS-C01 | 廃止（後継なし） | 最終受験日は 2026-12-31。取得済みの認定は通常どおり 3 年間有効 |

残りの 9 試験（CLF-C02 / AIF-C01 / SAA-C03 / SOA-C03 / DEA-C01 / DOP-C02 / AIP-C01 / SCS-C03 / AIB-C01）は、サイトが扱っているバージョンが現行版です。

あわせて、模擬試験の設定（`js/quiz.js` の `EXAM_MOCK_CONFIG`）が公式の試験形式と食い違っていた 2 試験を直しました。

- AIF-C01: 65 問 / **90 分**（誤: 120 分）
- AIP-C01: **75 問 / 180 分 / Professional**（誤: 65 問 / 120 分 / Associate。ベータ終了後の標準版の形式）

出典:

- [Certification updates from AWS Training and Certification: September 2026](https://aws.amazon.com/blogs/training-and-certification/september-2026-new-offerings/)（日本語版: [AWS 認定資格 (MLA、SAP、DVA) に関するアップデート: 2026 年 9 月](https://aws.amazon.com/jp/blogs/news/september-2026-new-offerings/)）
- [Comparison of MLA-C01 and MLA-C02](https://docs.aws.amazon.com/aws-certification/latest/machine-learning-engineer-associate-02/mla-02-comparison.html)
- [AWS Certified Advanced Networking - Specialty](https://aws.amazon.com/certification/certified-advanced-networking-specialty/)
- [AWS Certified Generative AI Developer - Professional](https://aws.amazon.com/certification/certified-generative-ai-developer-professional/) / [AWS Certified AI Practitioner](https://aws.amazon.com/certification/certified-ai-practitioner/)

## なぜ学習内容は現行版のままなのか

- **SAP-C03 / DVA-C03** は 2026-10-16 時点で試験ガイド（ドメイン・タスクステートメント）を確認できませんでした。しかも SAP-C02 / DVA-C02 は 11 月末まで受験できる現行版です。今の時点で中身を差し替えると、これから C02 を受ける人に誤った範囲を見せることになります。
- **MLA-C02** は英語の試験ガイドが公開済みですが、このサイトの主な利用者が受ける日本語の試験は 2027-01-13 まで MLA-C01 です。
- そこで、学習データ（`js/data/<exam>.js`）は「今受験できるバージョン」の試験ガイドに準拠させたまま、改定・廃止の予定を**日付で自動的に切り替わるお知らせ**として表示する方式にしました。移行日を過ぎると「新バージョンへ移行済み（このページは旧版準拠）」の文言に自動で変わるため、移行日にコードを変更しなくても表示が古くなりません。

## ユーザー向けの挙動

1. **お知らせバナー**: 予定のある試験を選ぶと、メイン領域の先頭（スマホでも最初に見える位置）に、見出し・日程・出典リンク（AWS 公式）を表示します。予定のない試験と「初めて AWS 認定を受験する」ガイドでは表示しません。
2. **サイドバーのバッジ**: 試験一覧で「改定予定」「旧版」「廃止予定」「廃止」のバッジを表示します。
3. **AI チューター**: システムプロンプトに改定・廃止の予定と出典を渡します。SAP-C03 のように学習データより新しい後継バージョンを「存在しない」と否定しないよう指示しています（#138 / #202 と同じ一次情報グラウンディングの考え方）。
4. **模擬試験**: AIF-C01 と AIP-C01 の問題数・制限時間・難易度レベルを公式の試験形式に合わせました。AIP-C01 はレベルが Professional になったため、API キー不要の本番形式（オフライン問題バンク）は Professional の共有プールから出題します（[オフライン問題バンク](offline-production-exam.md) を参照）。

## 実装

- `js/data/exam-lifecycle.js` … 試験 ID ごとの予定（後継コード・フェーズ・出典）。フェーズは `from` / `until`（両端を含む暦日）で隙間なく並べ、最後のフェーズは期限なしにします。出典は `url`（日本語）/ `urlEn`（英語）の対で、`scripts/check-resource-links.mjs` の走査対象にも入ります。
- `js/examLifecycle.js` … 今日に当たるフェーズを選び、ロケールに合わせた文言と出典を返すピュア関数（`getExamLifecycleNotice(examId, { now, locale })`）。`now` を引数で受け取るのでブラウザ無しで単体テストできます。
- `js/ui.js` / `index.html` … バナー（`#examLifecycleNotice`）とサイドバーのバッジ（`.exam-lifecycle-badge`）。文言の見出し・バッジ・出典ラベルは `js/locales/ja.json` / `en.json` の `examLifecycle.*`。
- `js/chat.js` … `buildExamGroundingPrompt` に `lifecycleNotice` を追加。
- `sw.js` … 新規モジュール 2 件をプリキャッシュに追加し、`CACHE_VERSION` を更新。

## 保守手順

### 改定・廃止が発表されたら

1. `js/data/exam-lifecycle.js` に試験 ID のエントリを追加する（後継コード、フェーズごとの日英の文言、AWS 公式の出典）。
2. `node scripts/check-resource-links.mjs --urls "<出典 URL>"` で出典が 200 であることを確かめる。
3. `npx playwright test tests/exam-lifecycle.spec.mjs` を通す（フェーズの連続性・文言に試験コードが含まれること・出典が AWS ドメインであることを検査する）。

### 新バージョンへ切り替えるとき（試験ガイド公開後、旧版の受験期間が終わったら）

1. 新バージョンの試験ガイドに沿って `js/data/<新コード>.js` を作る（ドメイン・配点・タスクステートメント・スキルを日英で書き起こし、リソースは引き継げるものを引き継ぐ）。
2. `js/exams.js`（import / `ALL_EXAMS` / `EXAM_CATEGORIES` / `EXAM_HASH_MAP` — 短縮ハッシュ `#sap` などは新 ID に向け直す）、`js/config.js`（`PUBLIC_EXAM_IDS`）、`js/quiz.js`（`EXAM_MOCK_CONFIG`）、`index.html` / `manifest.json` / `README.md` の試験コード一覧を更新する。
3. **学習記録の扱いを決める**: XP 履歴・クイズ履歴・受験予定日などは試験 ID（例: `sap-c02`）をキーに端末へ保存されています。ID を切り替えると、旧 ID の記録は新 ID の画面には出ません。移行するか旧版として残すかを、そのときに決めてください。
4. `js/data/exam-lifecycle.js` から該当エントリを削除する。

### 廃止された試験

最終受験日を過ぎると「廃止」フェーズの文言が自動で出ます。サイトから外すかどうか（`PUBLIC_EXAM_IDS` と「全 13 資格」表記の更新）は、学習資料としての需要を見て判断してください。

## 検証

- `node --check` … 変更した JS（`js/examLifecycle.js` / `js/data/exam-lifecycle.js` / `js/ui.js` / `js/chat.js` / `js/quiz.js` / `sw.js` / `tests/exam-lifecycle.spec.mjs`）がすべて通過。
- `JSON.parse` … `js/locales/ja.json` / `en.json` が通過し、`tests/locale-registry.spec.mjs` のキー集合ミラー検査も通過。
- `tests/exam-lifecycle.spec.mjs`（21 件）… 日付境界・発表済みの日程・データ整合性・模擬試験設定・AI チャットのプロンプト・ブラウザでのバナー / バッジ表示を検査し、すべて通過。
- 全テスト（`npx playwright test`）… 作業環境では Tailwind / Chart.js / Font Awesome の CDN がネットワーク制限で読めないため、同じバージョンのライブラリを npm から取得してローカルの代替サーバーで配信し、変更前後を比較しました。変更後は 289 件すべて通過（変更前は 268 件すべて通過、差分は追加した 21 件）。CDN を代替しない状態でも、失敗する 21 件は変更前と同一（CDN 未読み込みによるもの）で、新たな失敗はありません。
- 画面確認 … バナーとバッジをデスクトップ / スマホ幅、日本語 / 英語、ライト / ダークで表示して確認しました。
- 出典 URL は、この作業環境のネットワーク制限で AWS のドメインへ直接アクセスできなかったため、検索結果で存在を確認しました。ネットワークが使える環境で `node scripts/check-resource-links.mjs --only exam-lifecycle` を実行して HTTP 200 を確かめてください。
