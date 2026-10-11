# 問題セットを IndexedDB に保存し、1 問ごとに保存・中断から再開できるようにする (#225 / PR 2)

## 背景

設計書 [`../design/exam-generation-pipeline.md`](../design/exam-generation-pipeline.md) §7 の実装（段階導入計画の PR 2）。

従来は、クイズを**全問解き終わったときにだけ** `quizHistory`（localStorage）へ結果が保存されていた。そのため

- 生成中にタブを閉じる・リロードすると、生成済みの問題も含めてすべて消える、
- 65 問の模擬試験を途中でやめると何も残らない、
- 同じ問題セットを解き直す手段がない、

という問題があった。多段パイプライン（計画 → 作問 → 査読）では生成に時間がかかるので、**問題は生成された瞬間に保存され、受験はそれと別に記録される**必要がある。

## 実装したもの

### `js/examSets.js`（新規）

IndexedDB（DB 名 `asn-exam-sets`、ストア `examSets` / `attempts`）に **ExamSet（問題セット）** と **Attempt（受験）** を分けて保存する。

- `createExamSet` / `appendExamSetQuestion` / `finalizeExamSet` / `updateExamSet` / `listExamSets` / `deleteExamSet`
- `createAttempt` / `recordAttemptAnswer` / `finishAttempt` / `listAttempts`
- `markInterruptedExamSets`: 起動時に、進行中のまま残ったセットを問題数に応じて `partial` / `failed` にする（プロバイダ側ジョブ名を持つセットは PR 3 の再開処理のために触らない）
- 純関数 `finishedStatusFor` / `summarizeExamSet`
- IndexedDB が使えない環境（プライベートモード・Node のテスト）では自動でメモリ内ストアに切り替わり、呼び出し側は分岐しない。

localStorage を使わない理由: 1 セットが 100〜200 KB になり、5 MB 制限では 20〜30 セットで詰まるため。

### `js/ui.js` の配線

- **全モードで保存**: 事前生成（スピード / 模擬）はループ内で 1 問ずつ、単発・5 問連続は表示前に、Gemini Batch は結果受信時に保存。デイリーチャレンジ・本番形式（オフライン）・スマート復習・解き直しは「インポート済みセット（`ready`）」として保存。
- **受験の記録**: 最初の回答時に Attempt を作り、回答ごとに追記。結果画面表示時に `finishAttempt`。従来の `addQuizResult`（`quizHistory`）も引き続き書くので、履歴モーダル・CSV エクスポート・スマート復習は従来どおり動く。
- **問題セット一覧モーダル**（`#examSetsModal`）: ダッシュボードの「問題セット」ボタンと、クイズモード選択画面の左下から開く。試験コード・モード・状態（生成中 / 準備完了 / 一部のみ / 失敗）・`n / N 問`・受験回数・作成日時を表示し、「開始／再挑戦」「削除」ができる。保存済みセットの開始は Batch 完了後の開始処理と共通化した `beginPreparedSession` を使う。
- アプリデータのリセット時に IndexedDB も空にする。

### その他

- `js/locales/{ja,en}.json` に `examSets.*` を相互ミラーで追加。
- `sw.js` に `js/examSets.js` を追加し `CACHE_VERSION` を v6 に。

## スコープ外（後続 PR）

- Gemini Batch のジョブ名の永続化と、起動時のポーリング再開（PR 3）。現時点では Batch 生成中にタブを閉じると結果は受け取れないが、再開は PR 3 で扱う。
- `quizHistory` を Attempt からの派生ビューに置き換えること。
- 問題単位イベントの送信（設計 §9）。

## 検証

`tests/exam-sets.spec.mjs`:

- メモリ内ストアでのセット成長・finalize・中断マーク・受験記録のロジック。
- ブラウザ（実 IndexedDB）: スピードチャレンジを生成途中でリロード → 生成済み問題が `partial` セットとして残り、一覧から開始できて回答が Attempt に記録される。タスク別クイズは**回答前に**セットが保存されている。デイリーチャレンジが `daily` ソースの `ready` セットとして保存される。
