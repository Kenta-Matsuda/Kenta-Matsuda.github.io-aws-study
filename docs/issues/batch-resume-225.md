# Gemini Batch のジョブを保存し、ブラウザを閉じても生成が続くようにする (#225 / PR 3)

## 背景

設計書 [`../design/exam-generation-pipeline.md`](../design/exam-generation-pipeline.md) §6.1 の実装（段階導入計画の PR 3）。

本番模擬試験の Gemini Batch 生成は、ジョブ自体は Google 側で動いているのに、ジョブ名をメモリにしか持っていなかったため「タブを閉じると中断されます」と案内し、実際に閉じると結果を受け取れなくなっていた。多段パイプライン（計画 → 作問 → 査読）は数十分かかりうるので、**投げて・閉じて・次に開いたときに受け取る**動きが必要になる。

## 実装したもの

### `js/geminiBatch.js`

- `callGeminiBatch` を「ジョブ作成」と「ポーリング」に分け、ポーリング部分を `pollGeminiBatch({ name, total })` として公開。
- `onCreated({ name })` コールバックを追加。ジョブのリソース名（`batches/…`）が分かった時点で呼ばれる。
- テスト用にポーリング間隔を `globalThis.__ASN_BATCH_POLL_MS__` で短縮できる（既定 5 秒）。

### `js/ai.js`

- `callAiBatch` に `onCreated({ name, model })` を通し、`resumeAiBatch({ jobName, total, model })` を追加（Gemini のみ）。

### `js/ui.js`

- バッチ送信時、問題セット（PR 2 の ExamSet）の `pipeline` に **スロットごとのメタデータ**（ドメイン / タスク / 参照リソース）を保存し、ジョブ作成直後に **`jobName` と `model` を保存**する。
- 起動時に `resumePendingBatchSets()`: `jobName` を持つ進行中セットがあれば、同じジョブのポーリングを再開して進捗トーストを出す。完了したら結果を解釈・保存し「クイズを開始する」を出す（通常経路と共通化した `completeBatchSet`）。
- 失敗（ジョブ失敗・解釈不能・再開エラー）はセットを `failed` にして `jobName` を消す。PR 2 の起動時スイープは `jobName` を持つセットには触らない。
- `beforeunload` の「閉じると中断」警告を削除し、確認ダイアログ・トーストの注意文を「閉じても生成は続き、次に開いたときに結果を受け取る」に変更。

## 制約

- 再開は **Gemini Batch を使った模擬試験のみ**。前面逐次生成（スピード／5 問連続、Gemini 3 系以外のモデル、OpenAI）はタブが開いている間だけ進む。できた分は PR 2 で保存される。
- 同時に再開するのは 1 セット（複数あれば最新 1 件）。
- API キーが別端末・別ブラウザに無ければ再開できない（キーはブラウザ内）。

## 検証

`tests/batch-resume.spec.mjs`（Batch API をスタブ、ポーリング間隔 150 ms）:

- 模擬試験を Batch で開始 → セットに `jobName` が保存される → **リロード** → 新しいジョブを作らずに同じジョブのポーリングが再開され、セットは `generating` のまま → ジョブ完了 → セットが `ready`（65 問、`jobName` 消去）になり、トーストの「クイズを開始する」から解ける。
- リロード後にジョブが失敗を返す → セットが `failed`、トーストに失敗理由。
