# 生成した問題の品質評価: 決定的チェック・Solver・Judge・Editor と回帰評価 (#225 / PR 6)

## 背景

設計書 [`../design/exam-generation-pipeline.md`](../design/exam-generation-pipeline.md) §5（段 2'〜4）と §8 の実装（段階導入計画の PR 6）。

多段化（PR 4）とカード（PR 5）で「何を問うか」は制御できるようになったが、生成された問題そのものの品質（正解が本当に正しいか、正解が 1 つに決まるか、誤答がもっともらしいか、手がかり漏れがないか）は測っていなかった。改善が感覚論にならないよう、評価の層を入れ、数字で回帰を見る。

## 実装したもの

### `js/examJudge.js`（新規・純ロジック）

| 層 | 関数 | 内容 | コスト |
|---|---|---|---|
| 1 決定的チェック | `runDeterministicChecks` | 選択肢数 ≠ 4、重複選択肢、「上記のすべて／いずれでもない」、正解インデックス不正、**正解だけが明らかに長い**（手がかり漏れ）、指定位置と違う記号、解説なし、渡した資料以外の URL 引用 | 無料 |
| 2 Solver | `buildSolverPrompt` / `parseSolverResponse` | 正解・解説を見せずに解かせる。正解キーと不一致なら「曖昧さ」の信号 | 1 回 |
| 3 Judge | `buildJudgePrompt` / `parseJudgeResponse` | 5 軸（accuracy / uniqueness / distractors / fit / cues）を 1〜5 で採点し、verdict（pass / fix / reject）と具体的な指摘・修正案を返す。カード素材・推奨リソース・出題設計・Solver の結果を渡す | 1 回 |
| 判定 | `decideVerdict` | 合格 = 全軸 ≥ 3 かつ合計 ≥ 18、verdict ≠ reject、accuracy ≥ 3、構造的フラグなし。Solver の不一致は uniqueness ≤ 3 のときだけ fix の根拠。「正解だけが長い」は fix | 無料 |
| 4 Editor | `buildEditorPrompt` | fix 判定の問題を指摘に沿って 1 回だけ修正（正解位置は維持）。再確認は決定的チェックのみ。直らない構造的不正は破棄、それ以外は指摘付きで提供 | ≤ 1 回 |

### `js/examGenerator.js`（新規）

前面逐次経路の段 0〜4 を `ui.js` から切り出したオーケストレーター。モデル呼び出し（`callModel`）、プロンプトの土台、リソース、永続化・進捗のフック（`onPlan` / `onQuestion` / `onProgress`）を注入する設計なので、**ブラウザと回帰評価スクリプトが同じコードを実行**する。返り値の `metrics` に生成数・エラー・解析失敗・重複再生成・却下・修正・計画の失敗/重複除去・正解クラスタ・査読数/通過数/平均点・段ごとの呼び出し回数を含む。

### `js/ui.js`

- `preGenerateQuestions` の生成ループを `generateExamQuestions` の呼び出しに置き換え（進捗表示は「出題計画を作成中／n / N 問／査読中／修正中」）。メトリクスは問題セットに保存。
- **査読の既定**: 1 問あたり呼び出しが 2〜3 倍になるため、**Gemini の本番模擬試験のみ既定で有効**。`localStorage.asn_pipeline_judge` を `'on'` / `'off'` にすると全モードで上書き（OpenAI は既定オフ）。
- 問題セット一覧に「査読通過 n/m」「正解の重複 最大 k」を表示。

### `scripts/eval-exam-pipeline.mjs`（回帰評価）

`GEMINI_API_KEY` を環境変数で渡し、実際の API で 1 セット生成して指標を出す。目標（設計 §8.4）: **最大クラスタ ≤ 2、出題単位の網羅率 ≥ 90%、査読通過率 ≥ 85%**。各問題の正解テキストと査読結果も一覧表示し、`--out` で JSON 保存。プロンプト・モデル・カードを変えたら必ず回して before / after を PR に載せる。

## スコープ外（後続）

- Batch 経路の査読（Judge / Solver を 2 つ目のジョブとして連鎖し、Editor を 3 つ目に）— PR 6b。現状 Batch は決定的チェックなしの従来どおり。
- Judge の校正（人間採点 30 問との突合）と閾値の調整。
- 「選択肢だけで解けるか」の Solver（手がかり漏れの直接検査）— 決定的チェックで代替中。

## 検証

- `tests/exam-judge.spec.mjs`: 決定的チェックの各フラグ、プロンプトのマーカーと内容、パーサの寛容さ、`decideVerdict` の判定規則、集計。**スクリプト化した偽モデル**で生成器を回し、計画 1 → 作問 7（6 + 重複再生成 1）→ Solver 6 → Judge 6 → Editor 1、却下 1、修正 1、最終 5 問、呼び出し順序を確認。計画失敗時の設計図フォールバックと、短いセッションでの計画省略。
- 既存の E2E（スピードチャレンジ）は査読が既定オフのため呼び出し回数は不変。`asn_pipeline_judge='on'` にした E2E で Solver / Judge の呼び出しとセットの査読メトリクスを確認。
