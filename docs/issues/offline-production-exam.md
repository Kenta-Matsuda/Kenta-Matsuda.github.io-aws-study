# Issue: APIキー不要の本番形式模擬試験（オフライン問題バンク） (#124)

## 概要

現状、クイズ機能のうち API キー不要で遊べるのは **デイリーチャレンジ（1日5問）** だけであり、
**本番形式（模擬試験・65問・時間制限あり）** は AI プロバイダー（Gemini / OpenAI）の API キーを前提としている
（`js/ui.js` の quiz-mode 経路 → `preGenerateQuestions` → `callAiStream` / `callAi` → キー未設定時は `onRequireApiKey`）。

Issue #124 のメンテナー確認（issue #124 コメント + PR #130）で、
**「API キー不要にすべき対象はデイリーチャレンジ（5問）ではなく、本番レベル（65問形式）である」**
と明確化された。本対応は、その本番形式を **クライアントサイドのみ・API キー不要** で成立させるために、
事前作問した静的な問題バンクを追加し、そこから本番形式のタイムド模擬試験を組み立てる導線を実装する。

なお、**完全な AI 生成模擬試験は引き続き API キーが必要**（既存の mock 経路は変更しない）。
本バンクは AI 生成の置き換えではなく、キー未設定ユーザーのための補完である。

## 変更内容

### 1. 静的問題バンクの追加 (`js/data/offline-exam-bank.js`)
- `js/data/daily-challenge.js` と同じバイリンガル規約
  （`{ question, choices[], correctIndex, explanation, questionEn, choicesEn, explanationEn }`、選択肢は `'A. '` 形式）で作問。
- 試験レベル（Foundational / Associate / Professional / Specialty / Business）ごとにプールを整理し、
  同一レベルの試験間で共有する（レベル解決は `js/quiz.js` の `getExamLevel(examId)` を再利用）。
- **全問の解説に AWS 公式ドキュメント（`https://docs.aws.amazon.com/...`）の出典 URL を付与**（`buildMockQuizSystemPrompt` の信頼性ルールに整合）。実在しないサービス／URL は使用していない。
- 公開アクセサ `getOfflineExamQuestions(examId, count, { locale, seed })` が、決定的にシャッフルした
  正規化オブジェクト `{ question, choices[], correctIndex, explanation }` を返す。`count` はプールサイズでクランプ。
- 補助: `getOfflineExamPoolSize(examId)`（UI で実際の出題数を正直に表示するため）、`getPoolForLevel(level)`。

### 2. 本番形式（APIキー不要）の出題導線 (`js/ui.js`)
- ダッシュボードの Quiz カルーセルに `offlineExamBtn` ハンドラを追加。
- `createQuizSession({ examId, mode: 'mock' })` で **本番形式（時間制限・65問枠）** のセッションを作り、
  `questions` を静的バンクから設定、`preGenerate = true`、`_isOfflineExam` フラグを立てる。
- 出題数はプールサイズでクランプし、UI ラベルに実際の問題数を反映。
- 時間制限があれば `startQuizTimer()` を開始（本番形式のタイマー体験）。
- **この経路は `getApiKey` / `getOpenAiApiKey` / `callAi` / `callAiStream` / `onRequireApiKey` を一切呼ばない。**
- 既存の AI 生成 mock 経路（`quizModeStartBtn` の mock）は**変更なし**。

### 3. 導線 UI（`index.html`）と i18n
- デイリーチャレンジボタンの隣に、正直なラベルの本番形式ボタンとヒントを追加。
- i18n キーを両ロケールにミラーリングして追加:
  - `dashboard.quizCarousel.offlineExamBtn`（ja: 「本番形式（APIキー不要）」 / en: 「Practice Exam (no API key)」）
  - `dashboard.quizCarousel.offlineExamBadge`
  - `dashboard.quizCarousel.offlineExamHint`
- 既存のデイリーチャレンジボタンと「APIキー不要」バッジはそのまま維持。

### 4. 結果／履歴のタグ付け
- `_isOfflineExam` セッションは、実在する試験 ID（`isRealExamId` で判定、擬似モード時は `clf-c02` にフォールバック）に紐づけて
  `addQuizResult` へ保存する（`_isDailyChallenge` の扱いに準拠）。
- AI 生成 mock セッションの試験別履歴には影響しない。

## 技術的な実装方針

### 決定的な選択アルゴリズム
`getOfflineExamQuestions` は daily-challenge.js と同じ手法で決定的に選択する:
1. `examId` から `getExamLevel` で試験レベルを解決し、そのレベルの共有プールを取得。
2. シード（明示指定がなければ `examId + level`）を **FNV-1a ハッシュ** で数値化。
3. **mulberry32 PRNG** に投入し、**Fisher-Yates シャッフル**でプールを並べ替え。
4. 先頭から `count`（プールサイズでクランプ）件を採用し、`locale` に応じて正規化。

同一 `examId` では毎回同じ順序になるため、リロードや再挑戦でも安定した本番形式セットが得られる。
外部サービスへの問い合わせや永続ストレージへの状態保存を必要としない。

### mock セッション機構の再利用
- `createQuizSession(mode: 'mock')` により、`EXAM_MOCK_CONFIG`（試験ごとの問題数65/75・時間制限・レベル）の枠組みをそのまま適用する。
- 描画・採点は既存の `renderInteractiveQuiz` / `handleQuizAnswer` を再利用し、UI/挙動の一貫性を保つ。

## スコープ（収録範囲）— 正直な記載
- **フル 65 問（本番形式）を組める試験**:
  - Foundational: `clf-c02`, `aif-c01`（Foundational プールは 65 問超）。
  - Associate: `saa-c03` ほか同レベル試験（`dva-c02`, `soa-c03`, `mla-c01`, `dea-c01`, `aip-c01`）。Associate プールは 65 問超。
- **「取得可能な最大数」を組む試験（65 問に満たない場合あり）**:
  - Professional（`sap-c02`, `dop-c02`）、Specialty（`ans-c01`, `scs-c03`）、Business（`aib-c01`）は、
    共有レベルプールの現状の問題数（65 問未満）を出題する。UI ラベルには実際の出題数を表示する。
- **完全な AI 生成模擬試験は引き続き API キーが必要**。本バンクはあくまで補完であり、置き換えではない。
- プールは後から問題を追加して拡張できる（同じバイリンガル規約 + AWS 公式出典 URL 必須）。

## 受入条件
- API キー未登録でも、静的バンクから本番形式（mock 相当・時間制限あり・最大65問）の模擬試験を開始・完了できる。
- 出題経路で AI プロバイダー / `getApiKey` を一切呼ばない。
- `js/data/offline-exam-bank.js` は daily-challenge.js のバイリンガル形式に従い、全問に AWS 公式ドキュメントの出典 URL を含む。
- 決定的アクセサが正規化クイズオブジェクトをプールサイズでクランプして返す。
- ダッシュボードに正直なラベルの導線が Ja/En 両ロケールで表示される。
- AI 生成 mock 経路は API キー保有ユーザー向けに従来どおり動作する（変更なし）。
