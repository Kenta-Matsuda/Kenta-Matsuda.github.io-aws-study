# Issue: デイリーチャレンジ（APIキー不要の一部機能） (#34)

## 概要

現状、クイズ機能はAIプロバイダ（Gemini / OpenAI）のAPIキー登録を前提としており、
初めて訪れたユーザーがすぐに学習を始められない（利用ハードルが高い）。

Issue #34「APIキー不要化」への対応として、**バックエンド不要でクライアントサイドのみで成立する最小スコープ**を実装する。
具体的には、#34 の「一部の試験でAPIキー不要とするパターン」に相当する **デイリーチャレンジ（1日5問）** を追加し、
APIキーが未登録でもすぐにクイズを体験できるようにする。

なお #34 の「全ての試験でAPIキー不要とするパターン」（試験データを事前生成してデータストアに保存）は
バックエンドを必要とするため、本対応の**スコープ外**とし、後述の「スコープ外 / 将来対応」に文書として退避する。

## 変更内容

### 1. 静的問題プールの追加 (`js/data/daily-challenge.js`)
- CLFレベルの基礎的なAWS問題を **24問** 同梱した静的プールを新設。
- 全問 **日本語 / 英語（ja / en）バイリンガル** で保持。
- AIの生成に依存しないため、ネットワークもAPIキーも不要で成立する。

### 2. 1日N問（既定5問）の決定論的ローテーション
- `getDailyChallengeQuestions(count = 5, date = new Date(), locale = 'ja')` を公開。
- **その日のうちは同じ問題セット**が返り、**日付が変わると別のセット**にローテーションする。
- 純粋・同期的な関数で、正規化された問題オブジェクト
  `{ question, choices[], correctIndex, explanation }` を返す。

### 3. ダッシュボードの導線ボタン
- Quiz Challenge カルーセルのスライドに `dailyChallengeBtn` ボタンとヒントを追加（`index.html`）。
- i18nキーを両ロケールにミラーリングして追加:
  - `dashboard.quizCarousel.dailyChallengeBtn`
  - `dashboard.quizCarousel.dailyChallengeHint`

### 4. APIキー未設定でもプレイ可能
- `js/ui.js` に `dailyChallengeBtn` ハンドラを追加。
- 事前生成済みクイズセッションのパス（mode `quick5`, `preGenerate = true`, `_isDailyChallenge` フラグ）をモデルに実装。
- 既存の `createQuizSession` / `renderInteractiveQuiz` / `handleQuizAnswer` を再利用し、
  **`getApiKey()` / `getOpenAiApiKey()` やAIプロバイダを一切呼ばない**。

### 5. XP付与は「1日1回」に制限（デイリーチャレンジ専用ガード）
- XP付与は既存の `addXp` の reason `'quiz'` パスを再利用する。
- ただし reason `'quiz'` のデイリー上限は **初回2xボーナスのみ** を抑制し、
  1問あたりの基礎XP（10）は毎回加算される。デイリーチャレンジは決定論的・無料・
  何度でも再挑戦できるため、この基礎XPを無制限にファーム（farming）できてしまう。
- そこで `FEEDBACK_XP_DAY_KEY` と同じパターンで、デイリーチャレンジ専用の
  1日1回ガード `DAILY_CHALLENGE_XP_DAY_KEY`（`asn_daily_challenge_xp_day`）を追加した。
  - その日最初に開始したデイリーチャレンジのセッションのみが5問分のXPを獲得できる。
  - 同一ローカル日での再挑戦（リロード・再オープン含む）ではXPは加算されない。
  - **プレイ自体は無制限**で、制限されるのはXP付与だけ。
  - このガードは `quizSession._isDailyChallenge` フラグで判定するため、
    通常のAIクイズのXP挙動には一切影響しない。

## 技術的な実装方針

### 問題データの正規化 shape
- 既存のクイズ描画が期待する正規化形 `{ question, choices[], correctIndex, explanation }` に合わせる。
- これにより `renderInteractiveQuiz` / `handleQuizAnswer` をそのまま再利用できる。

### 決定論的な日次選択アルゴリズム
`getDailyChallengeQuestions` は次の手順で「その日固定・日次ローテーション」を実現する:
1. ローカル日付の `YYYY-MM-DD` 文字列を生成（ローカルタイムゾーン基準）。
2. その文字列を **FNV-1a ハッシュ** で数値シード化。
3. シードを **mulberry32 PRNG** に投入して疑似乱数列を得る。
4. **Fisher-Yates シャッフル**でプールを並べ替え、先頭から重複しない N 問を採用。

同じ日付文字列からは常に同じシード・同じ並びが得られるため、
リロードしても当日中は同一の問題セットになり、日付が変わると別セットへローテーションする。
外部サービスへの問い合わせや永続ストレージへの状態保存を必要としない。

### APIキー要件のバイパス
- デイリーチャレンジは事前生成済み（`preGenerate = true`）のセッションとして起動する。
- そのため生成系の呼び出し（`getApiKey()` / `getOpenAiApiKey()` / AIプロバイダ）は経由しない。
- 既存のクイズ体験（描画・採点・XP）はそのまま流用するため、UI/挙動の一貫性を保つ。

### XPの扱い
- reason `'quiz'` の既存経路を利用してXPを付与するが、reason `'quiz'` の
  デイリー上限は初回2xボーナスのみを抑制し、基礎XPは毎回加算される点に注意。
- デイリーチャレンジは決定論的・無料・再挑戦自由のため、基礎XPの無制限ファームを
  防ぐ専用ガード `DAILY_CHALLENGE_XP_DAY_KEY`（1日1回）を `js/ui.js` に追加した。
  `FEEDBACK_XP_DAY_KEY` の実装パターンを踏襲し、XP付与のみをローカル日単位で
  1回に制限する（プレイは無制限、`_isDailyChallenge` セッション限定）。

### 疑似試験ID（`__beginner__`）の結果タグ付け
- ダッシュボードの選択が「初心者ガイド」擬似モード（`state.examId === '__beginner__'`）
  の場合、`__beginner__` は truthy のため単純な `|| 'clf-c02'` フォールバックが効かず、
  結果やXPが実在しない試験IDに紐づいてしまう（`getExamById('__beginner__')` は該当なし）。
- そこで `isRealExamId()`（`getExamById` で実在判定）を追加し、実在する試験でない場合は
  `clf-c02` にフォールバックするよう修正。`createQuizSession` / `lastAiRequest.examId` /
  `addQuizResult` のすべてで実在する試験IDが使われるようにした。

## スコープ外 / 将来対応

### 全試験でAPIキー不要とするパターン（#34）は本対応のスコープ外
#34 の「全ての試験でAPIキー不要とするパターン」は、**事前生成した問題データをデータストアに保存し配信する**必要があり、
クライアントサイドのみでは成立しない（バックエンド・インフラ構築を伴う）。
本ブランチでは実装せず、以下のとおり将来対応として退避する。

> ### ⚠️ 要人間対応: AWS操作が必要
>
> **必要な操作内容**
> - 全試験分の問題データを事前生成（バッチ/オフラインでのJSON生成）。
> - 生成したデータをデータストアへ保存し、フロントから取得可能な形で配信。
> - フロントから静的JSON（またはAPI）を読み込む取得層の追加。
>
> **対象リソース（いずれかの構成例）**
> - 静的JSON配信: **Amazon S3 + Amazon CloudFront**（バケットにJSONを配置し、CDN経由で配信）。
> - 動的API配信: **Amazon API Gateway + AWS Lambda + Amazon DynamoDB**（問題をDynamoDBに格納しAPIで返す）。
>
> **想定コマンド（例示のみ・エージェントは実行しない）**
> ```bash
> # ※これらは例示であり、本エージェントは一切実行していない / 実行してはならない
> aws s3 cp questions.json s3://<bucket>/daily/questions.json
> aws cloudfront create-invalidation --distribution-id <dist-id> --paths "/daily/*"
> ```
>
> **注記:** 上記の `aws` コマンドは**要件・想定を記録するための例示**である。
> 本エージェントはいかなる `aws` コマンドも実行しておらず、また実行してはならない。
> 実際のリソース作成・データ配信は人間による対応が必要。

### ドキュメント整理に関する注記
- 別PR #93 が `docs/index.md` と `docs/action-required/` を導入予定。
- **#93 マージ後**に `docs/index.md` から本ドキュメント（`docs/issues/daily-challenge.md`）へのリンクを追加すること。
- ただし本ブランチでは、マージコンフリクトを避けるため **`docs/index.md` および `docs/action-required/` は意図的に作成しない**。

## 受入条件
- [ ] APIキー未登録でもデイリーチャレンジ（既定5問）をプレイできる。
- [ ] 静的問題プール `js/data/daily-challenge.js` から出題され、AIプロバイダ / `getApiKey` を一切呼ばない。
- [ ] 同一日内はリロードしても同じ問題セットになり、日付が変わるとローテーションする。
- [ ] ダッシュボードのQuizカルーセルにデイリーチャレンジのボタンとヒントがJa/En両ロケールで表示される。
- [ ] 既存のクイズ描画（`renderInteractiveQuiz` / `handleQuizAnswer`）と採点・XP機構を再利用する。
- [ ] XPは reason `'quiz'` の既存デイリーボーナス上限に従い、無制限に加算されない。
- [ ] 既存機能（AI利用のクイズ、チャット、XP等）に影響がない。
- [ ] 「全試験でAPIキー不要」パターンはスコープ外として文書化され、AWS操作は要人間対応として退避されている。
