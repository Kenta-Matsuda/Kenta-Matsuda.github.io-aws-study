# Issue: AIチューターが古いサービス名で回答する / 試験ガイドに裏取りしない (#202)

## 概要

issue #202 のフィードバック。AIB-C01（AWS Certified AI Business Strategist）の学習中に
AIチューターへ「分析系のAIサービスって何があるっけ」と質問したところ、次のように**古いサービス名**で
回答した。

> Amazon QuickSight (Q機能)
> 特徴: 自然言語で質問するだけで、データ分析のグラフやインサイトを生成してくれるBIツールです。

報告者のコメント:

> AIチューターに聞いたら、変な答えになった。ちゃんと試験ガイド参照してたらAmazon Quickが出るはずだ

つまり、現在の正式名称である **「Amazon Q in QuickSight」** ではなく、旧来の呼称（「QuickSight の Q 機能」）で
回答しており、かつ試験ガイド（一次情報）にきちんと裏取りしている様子が見えなかった。

## 原因

チャットのシステムプロンプト（`js/chat.js` の `buildChatSystemPrompt`）は、`getExamOfficialRefs`
（`js/exams.js`）経由で試験の AWS 一次情報（公式試験ガイド・公式ページの URL）を注入し、Gemini の
`url_context` グラウンディングツールで裏取りさせる仕組みになっている。AIB-C01 についても
`getExamOfficialRefs('aib-c01')` は公式試験ガイド URL を正しく返しており、注入自体は機能していた
（本 issue の調査で確認済み。下記「検証」参照）。

一方で、既存のプロンプトは「試験そのものに関する事実（実在・正式名称・試験コード・出題ドメイン等）を
公式ページで裏取りする」ことは強く指示していたが、**回答本文で言及する個々の AWS サービス名について、
モデルが記憶している古い名称ではなく公式ドキュメント上の現在の名称を使う**、という明示的な指示が
無かった。AWS のサービス名・ブランドは時間とともに改名・再ブランド化されるため（QuickSight の
生成 AI 機能は「Amazon Q in QuickSight」に整理された）、この指示の欠落が旧称での回答を許していた。

## 対応（クライアント側のプロンプト・グラウンディング強化）

バックエンドを持たないクライアント側の修正で対応した。

- `js/chat.js`: システムプロンプトの「一次情報（AWS公式ドキュメント）で必ず裏取りする」ブロック
  （日本語 / 英語の両分岐）に、次の明示的なルールを追加した。既存の制約（公式ページ優先・記憶で
  上書きしない・根拠 URL を明記する等）は一切削除していない。
  - AWS のサービス名やブランド名は時間とともに変わる（改名・再ブランド化・他製品への統合）。
    記憶している古い名称ではなく、注入された AWS 公式ドキュメント・公式ページ上の
    **現在の正式なサービス名**をそのまま使うこと。例として「Amazon Q in QuickSight」のような
    現在の名称を旧称より優先する。名称に確信が持てないときは回答前に公式ページで確認すること。
- `js/chat.js`: プロンプト組み立てを、DOM / i18n ランタイムに依存しない純関数
  `buildExamGroundingPrompt(exam, { isJa, categoryLabel, officialRefs })` として切り出した
  （`js/markdown.js` / `js/aiErrors.js` の純モジュール化パターンに倣う）。`buildChatSystemPrompt`
  はロケール・区分ラベル・公式 refs を解決してこの純関数に渡すだけになり、グラウンディング契約を
  ブラウザ無しで単体テストできるようになった。挙動は従来と等価。

## 検証

このサンドボックスは INTEGRATIONS_ONLY（外部ネットワーク不可・npm 取得不可・ブラウザ無し）のため、
**Playwright（E2E）は実行できなかった**。実行できた静的検証と、追加した回帰スペックは以下のとおり。

- `env -u NODE_OPTIONS node --check js/chat.js js/exams.js tests/chat-grounding.spec.mjs` … 構文 OK
- `getExamOfficialRefs('aib-c01')` を直接実行し、公式試験ガイド URL
  （`.../ai-business-strategist-01/ai-business-strategist-01.html`）と公式ページ URL が
  ja / en とも返ることを確認。
- `buildExamGroundingPrompt` を Node から直接実行し、AIB-C01 のプロンプトに公式ガイド URL と
  「現在の正式なサービス名 / CURRENT service name」「Amazon Q in QuickSight」の指示が
  ja / en とも含まれること、既存制約の文言が残っていることを確認。
- 回帰スペック `tests/chat-grounding.spec.mjs`（純ロジック・ブラウザ不要）を追加。
  `getExamOfficialRefs('aib-c01')` がガイド URL を含むこと、AIB-C01 のシステムプロンプトが
  ガイド URL と現在のサービス名ルールを含むことを表明する。

### 人間による再現手順（E2E）

1. `node dev-server.mjs` を起動し、ブラウザで表示する。
2. 試験を AIB-C01（AWS Certified AI Business Strategist）に切り替え、API キーを設定する。
3. AI チャットを開き、「分析系のAIサービスって何があるっけ」と質問する。
4. 分析系サービスに言及する際、旧称ではなく公式ドキュメント上の現在の名称
   （例: 「Amazon Q in QuickSight」）で回答し、参照した AWS 公式 URL を明記することを確認する。
