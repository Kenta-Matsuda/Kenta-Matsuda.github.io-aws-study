# 問題単位の学習イベントの蓄積と送信（`/events`） (#225 / PR 7)

## 背景

設計書 [`../design/exam-generation-pipeline.md`](../design/exam-generation-pipeline.md) §9 の実装（段階導入計画の PR 7）。

生成した問題が実際にどう解かれたか（正答率・所要時間・査読スコアとの関係）は、問題の品質を事後的に評価し、悪い出題単位を引退させるための土台になる（設計 §8.3 の Psychometrician）。利用者のブラウザにしか残らないと集計できないため、#162/#167 で作られたフィードバック・投票バックエンド（Lambda Function URL + DynamoDB）に **`POST /events`** を追加し、クライアントは問題単位のイベントを蓄積して送る。

## 実装したもの

### クライアント `js/learningEvents.js`（新規）

- イベント種別: `question_generated` / `question_shown`（未使用）/ `question_answered` / `question_voted`（未使用。AI 解説への Good/Bad は既存の `/votes` で送られている）/ `set_completed`。
- **ID だけを送る**（セット・問題・ドメイン・タスク・出題単位）。問題文・選択肢・解説は一切含めない。横断集計は端末ごとに違う `questionId` ではなく、安定した `examId` + `unitId` / `taskId` で行う。
- IndexedDB（`asn-learning-events`）に蓄積し、5 秒のデバウンス・50 件のバッチ・ページ非表示時の `keepalive` 送信で `${FEEDBACK_API_URL}/events` へ POST（`text/plain` の JSON = プリフライト無し、`/votes` と同じ作法）。受理（2xx）されたものだけ削除、失敗時は保留（最大 5,000 件）。バックエンド未設定（`FEEDBACK_API_URL` 空、localhost）では送らない。
- `setLearningEventSink()` で送信先を差し替え可能（テスト・将来の別経路）。

### 発火点（`js/ui.js`）

| イベント | 場所 | 主な属性 |
|---|---|---|
| `question_generated` | 問題がセットに保存された直後（`persistSessionQuestion`） | questionId, domainId, taskId, unitId, judgeScore |
| `question_answered` | 回答処理（`handleQuizAnswer`） | questionId, isCorrect, userAnswer, elapsedMs |
| `set_completed` | 結果画面（`showQuizSummary`） | setId, score（正答率）, total |

### バックエンド `infra/feedback/src/index.mjs`

- `POST /events`: 種別とフィールドの**許可リスト**で検証（ID は 120 文字で切り詰め、数値は範囲チェック、範囲外は保存しない）、1 リクエスト 100 件まで、**IP 単位のレート制限 60 件/分**、既存と同じ Origin 制限・停止スイッチ・IP ハッシュ化。
- 保存: `pk = event#<examId>#<type>`、`sk = <at>#<rand>`、`type = learning_event`、出題単位などは属性、TTL 約 800 日。
- `template.yaml` の変更は不要（ルーティングはコード内）。**デプロイ（`sam build && sam deploy`）は人間の AWS 操作**として `docs/action-required/issue-225-resource-grounded-exam-generation.md` に記載。

### エクスポート `scripts/export-learning-events.mjs`

AWS CLI の `scan`（`begins_with(pk, 'event#')`）で `learning-events.csv` と、**試験 × 出題単位ごとの生成数・回答数・正答率・平均所要時間・平均査読スコア**をまとめた `unit-summary.csv` を書き出す。Amazon Quick に渡す単位。

## 検証

- `tests/learning-events.spec.mjs`: 正規化（未知の種別・フィールドの除去）、ローカル蓄積と 50 件バッチ送信・失敗時の保留、バックエンド未設定時の無送信。ブラウザ（Gemini と `/events` をスタブ）: タスク別クイズを 1 問解くと `question_generated` → `question_answered` が記録され、`/events` へ送られた本文に問題文が含まれないこと。
- `tests/learning-events-lambda.spec.mjs`: 検証（許可リスト・切り詰め・範囲）、保存形式（pk/sk/属性/TTL/IP 非保存）、Origin 拒否・不正入力・レート制限（61 件目で 429）・停止スイッチ。
