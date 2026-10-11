# 問題生成パイプライン設計（multi-agent 化と品質評価） — #225

- ステータス: 設計確定・段階実装中（2026-10-12）
- 関連: #225（起点）、#109 / #138（グラウンディング）、#124（オフライン問題バンク）、#162 / #167（フィードバック・投票バックエンド = 集計の送信先候補）
- 前段の調査: [`../action-required/issue-225-resource-grounded-exam-generation.md`](../action-required/issue-225-resource-grounded-exam-generation.md)（現状監査）、Step A/B の実装: [`../issues/exam-blueprint-225.md`](../issues/exam-blueprint-225.md)

## 1. 背景と課題

AIB-C01 の模擬試験で「AI CoE を設置する」が正解になる問題が繰り返し出た。調査の結果、**「CoE」という語は AIB のデータ（タスクステートメント・推奨リソース・オフライン問題バンク）のどこにも存在しない**。偏りの原因はデータではなく、以下の構造にある。

1. 1 問ずつ孤立して生成しており、試験全体として「何を問うか」の計画がない。
2. 重複回避が「直近 5 問の問題文の先頭 80 文字」という弱い手がかりで、**正解の概念**の重複を見ていない。
3. Gemini Batch 生成では重複回避が一切なく、65 問が互いを知らずに最頻解へ収束する。
4. 抽象的な試験（AIB など）では「違う AWS サービスで」という指示が効かない。

プロンプトの調整では根本解決にならないため、**生成の仕組みを多段・多役割に変え、生成物の品質を評価する**。

## 2. 設計原則

- **LLM が要らない工程はコードで決定的に行う**（試験構成・出題項目の割り当て・正解位置・シャッフル・形式検証・類似判定）。LLM は「計画」「作問」「査読」だけに使う。
- **「何を問うか」は資産（データ）にする**。カード（§4）は CI のエージェントが作り、人間がレビューして `js/data/` に置く。実行時に外部ページは読まない。
- **問題生成は利用者のブラウザで、利用者の API キーで行う**。長時間処理は Gemini Batch をプロバイダ側で走らせ、ブラウザは「投げて・閉じて・取りに行く」。
- **Gemini を標準とし、OpenAI は機能制約を明示したうえで動作させる**。
- **1 問できるごとに保存する**。解き終わるまで保存されない現状をやめ、問題セットと受験を分離する（§7）。
- **数字で評価する**。多様性・網羅率・査読通過率を測り、生成器の変更は回帰評価で確認する（§8）。

## 3. 試験プロファイル

問う対象の性質が試験で異なるため、3 つのプロファイルに分け、素材・カードの型・設問文法・誤答の作り方・査読の重みを切り替える。`EXAM_MOCK_CONFIG` に `profile` を持たせる。

| プロファイル | 対象試験（想定） | 問いの本質 | 主な素材 | カードの型 |
|---|---|---|---|---|
| `architecture` | SAA / SAP / ANS / SCS / DOP / DEA / SOA / MLA / DVA | 制約付きの具体的状況で、どの構成（サービスの組み合わせ）を選ぶか | AWS Blogs の構築事例、Well-Architected、Prescriptive Guidance、公式ドキュメントの設計ガイド | **ケースカード**（§4.1） |
| `framework` | AIB / AIF の戦略・ガバナンス領域 / CLF の一部 | 抽象的な状況にフレームワークの要素をどう適用するか（CAF for AI、責任ある AI、クラウド価値 等） | ホワイトペーパー、Executive Insights、Prescriptive Guidance | **フレームワーク・マップ**（§4.2） |
| `foundational` | CLF / AIF の大半 | 定義・サービス識別・責任共有 | 公式ドキュメントの概要ページ | **概念カード**（§4.3） |

- Professional（SAP / DOP）は `architecture` に加えて **横断問題の比率**（例: 50%）を持ち、1 枚のケースカードの判断ポイントを 2〜3 個連結して出題する。
- 1 試験が複数プロファイルの要素を持つ場合（AIF: 基礎用語 + 責任ある AI）、ドメイン単位でプロファイルを上書きできるようにする。

## 4. カード（事前整備するデータ）

### 置き場所と運用

- `js/data/cards/<exam-id>.js`（ES module、`export const CARDS_<CODE>`）。
- 生成は `exam-content-maintainer`（`.kiro/agents/exam-content-maintainer.md`）を拡張したカード採掘モードで行い、PR で人間レビューを経てマージする。機械生成したカードを未レビューでマージしない。
- 在庫要件: **プロファイルに応じた出題単位の数 ≥ 試験の問題数 × 1.5**（SAA 65 問なら判断ポイント 98 以上、SAP 75 問なら 113 以上）。`scripts/check-card-coverage.mjs` で検査し、不足している試験はパイプラインがカード無しのフォールバック（タスクステートメントのみ）で動く。
- 最初の対象: **AIB-C01（フレームワーク・マップ）** と **SAA-C03（ケースカード）**。

### 4.1 ケースカード（architecture）

```js
{
  id: 'saa-case-0001',
  source: { title, url, publishedAt, kind: 'blog' | 'docs' | 'whitepaper' | 'prescriptive' },
  context: '製造業。工場 30 拠点を 1 つの監視基盤へ…',   // 状況（業種・規模・前提）
  constraints: ['レイテンシ 100ms 以内', 'マルチアカウント', '監査ログ 7 年保持'],
  decisions: [                                        // 判断ポイント = 出題単位
    {
      id: 'd1',
      question: '拠点間の接続をどう集約するか',
      chosen: 'Transit Gateway を共有サービスアカウントに置き RAM で共有',
      why: '…',
      rejected: [{ option: 'VPC ピアリングのフルメッシュ', why: '拠点数の二乗で増える' }, …],  // 不採用案 = 誤答の種
      services: ['Transit Gateway', 'AWS RAM'],
      tasks: ['3.1', '2.3'],                         // 対応するタスクステートメント
      level: 'associate' | 'professional',
    },
  ],
}
```

不採用案とその理由をデータとして持つのがポイント。**もっともらしい誤答**を公式ドキュメントだけから作るのは難しく、構築事例が最良の供給源になる。

### 4.2 フレームワーク・マップ（framework）

```js
{
  id: 'aib-fw-caf-ai',
  framework: 'AWS CAF for AI',
  source: { title, url },
  axes: { perspective: ['Business', 'People', 'Governance', 'Platform', 'Security', 'Operations'], stage: ['Envision', 'Align', 'Launch', 'Scale'] },
  cells: [                                            // セル = 出題単位
    { id: 'people-align-literacy', perspective: 'People', stage: 'Align', capability: 'AI リテラシーの育成', summary: '…', misconceptions: ['CoE を置けば自動的に底上げされる', …], tasks: ['4.3'] },
  ],
}
```

目録を LLM に発明させず、**フレームワーク自身の構造をセルにする**。CoE は多数のセルの 1 つに過ぎないので、構造的に 1 問に収まる。

### 4.3 概念カード（foundational）

`{ id, term, definition, service?, source: { url }, confusables: ['似ていて混同しやすい概念'], tasks: [] }`。既存の推奨リソース（`docs` グループ）から機械的に起こせる部分が多い。

## 5. パイプラインと役割

```
[コード] Blueprint ─→ [LLM×1] Planner ─→ [コード] 計画検証
   └→ [LLM×N] Writer(+Distractor) ─→ [コード] 決定的チェック ─→ [LLM×N] Judge / Solver
         └→ 不合格 ─→ [LLM×k] Editor ─→ 再査読（1 回のみ）─→ [コード] Assembler ─→ ready
```

| 段 | 役割 | 入力 | 出力 | LLM |
|---|---|---|---|---|
| 0 | **Blueprint**（設計） | 試験データ・問題数・プロファイル・カード在庫 | スロット列: ドメイン / タスク / 出題単位（判断ポイント・セル・概念）/ 設問タイプ / 視点 / 業種 / 正解位置 | 不要 |
| 1 | **Planner**（計画） | 全スロット | スロットごとの「正解が問う概念」「シナリオの種」「誤答の方向性」。概念は試験全体で一意 | 1 回 |
| 1' | 計画検証 | 計画 | 概念の近似重複を削除（文字 bigram Jaccard ≥ 0.6）、網羅率算出 | 不要 |
| 2 | **Writer**（作問） | スロット + 計画行 + カード + 使用済み概念 | 問題 JSON（問題文・選択肢・正解・解説・引用 URL） | N 回 |
| 2' | 決定的チェック | 問題 | 形式・正解位置・選択肢重複・最長選択肢≠正解・引用 URL ⊂ 許可リスト・既存問題との類似・設計適合（出題単位の語を含む） | 不要 |
| 3 | **Judge**（査読） | 問題 + カード | ルーブリック採点（§8.2） | N 回 |
| 3' | **Solver**（受験者役） | 問題（解説なし）／選択肢のみ | 回答と理由。選択肢だけで正解できれば手がかり漏れ、妥当な理由で別解なら曖昧 | N 回（弱いモデル可） |
| 4 | **Editor**（修正） | 不合格問題 + 指摘 | 修正版（1 回だけ。直らなければ破棄） | k 回 |
| 5 | **Assembler** | 合格問題 | 順序シャッフル・不足分の報告・メトリクス | 不要 |
| 6 | **Psychometrician**（事後） | 受験データ・投票 | 正答率 / 識別力 / Bad 率で問題の引退候補 | 不要 |

失敗時の原則: **どの段が失敗しても生成を止めない**。Planner 失敗 → Blueprint のみで作問、Judge 失敗 → 未査読フラグ付きで提供、Editor 失敗 → 破棄して不足として報告。

## 6. 実行モデル

### 6.1 Gemini Batch 連鎖（標準・バックグラウンド）

多段パイプラインを **Batch ジョブの連鎖**として実行する。各段のジョブ名と中間成果物をローカル（IndexedDB の ExamSet）に永続化し、アプリ起動時に進行中のセットがあれば該当段から再開する。ブラウザを閉じてもプロバイダ側でジョブは進む。

```
planning ──(Planner: 通常呼び出し 1 回)──→ writing ──(Writer batch)──→ checking
   → judging ──(Judge+Solver batch)──→ fixing ──(Editor batch, 不合格分)──→ rejudging → ready
各状態: { stage, jobName?, submittedAt, attempts, partial results[] }
```

- 既存 `js/geminiBatch.js` の作成・ポーリングを「ジョブ作成」と「ジョブ再開（名前からポーリング）」に分離する。
- 現状の「タブを閉じると中断」の警告は、ジョブ名を永続化した時点で不要になる。
- Batch は現状 Gemini 3 系モデル限定（`isAiBatchEligible`）。料金が半額のため、査読段を足すコストを吸収しやすい。

### 6.2 前面逐次モード（Batch 非対応時）

Gemini 3 系以外・OpenAI では、タブが開いている間だけ進む逐次実行。**1 問ごとに保存し、リロード・再訪で中断箇所から再開する**。査読段は省略可（設定で有効化）。

### 6.3 OpenAI 利用時の制約（UI で明示）

- ブラウザを閉じると生成が止まる（できた分は残る）。
- Batch の割引が効かない。
- 査読段は既定で省略（有効化すると時間・コスト増）。
- `url_context` 非対応はカード化により実行時には影響しない。

## 7. データモデル（IndexedDB）

### 7.1 ExamSet（問題セット）と Attempt（受験）の分離

```
ExamSet {
  id, examId, mode ('single'|'quick5'|'speed'|'mock'), profile,
  createdAt, updatedAt,
  status: 'planning'|'generating'|'judging'|'ready'|'partial'|'failed',
  requested: 65, blueprint: [...], plan: [...],
  questions: [ { id, slotIndex, question, choices, correctIndex, explanation, sources[], domainId, taskId, unitId (判断ポイント/セル/概念), judge?: { score, flags[] } } ],  // 生成ごとに追記
  pipeline: { stage, jobName?, submittedAt?, attempts, provider, model },
  metrics: { coverage, largestCluster, judgePassRate }
}
Attempt { id, setId, examId, mode, startedAt, finishedAt?, answers: [ { questionId, userAnswer, isCorrect, elapsedMs, answeredAt } ], score, maxCombo, xpEarned }
```

- ストア: `examSets`（キー `id`、索引 `examId`, `status`, `createdAt`）、`attempts`（キー `id`、索引 `setId`, `examId`）。DB 名 `asn-exam-sets`、バージョン 1。
- localStorage を使わない理由: 1 セット 100〜200 KB で 5 MB 制限に 20〜30 セットで到達する。
- **全モードに適用**（単発・5 問・スピード・模擬）。デイリーチャレンジ・スマート復習・オフライン問題バンクは「既存問題からの Attempt」として同じ受験モデルに乗せる。
- 互換: Attempt の回答時には従来の `addQuizResult`（`quizHistory`）も書き続け、既存の履歴 UI・CSV エクスポート・スマート復習を壊さない。将来 `quizHistory` を Attempt からの派生ビューに置き換える。
- UI: 「問題セット一覧」（生成中: 進捗 / 準備完了: 開始 / 受験済み: 再挑戦・解説レビュー）。模擬試験は全問揃ってから開始、スピードは「10 問揃ったら開始」を選べる。

## 8. 品質評価

### 8.1 決定的チェック（無料・即時）

JSON 形式、選択肢 4 つで重複なし、正解位置が指定どおり、正解が最長選択肢でない（偏り）、「上記すべて／いずれでもない」禁止、引用 URL が渡したリソース・カードの URL 集合に含まれる、既存問題との類似度（正解 ≥ 0.55 / 問題文 ≥ 0.7 で重複扱い）、出題単位の語を含む、レベル相応の文長。

### 8.2 LLM 査読ルーブリック（各 1〜5、合格は全軸 ≥ 3 かつ合計 ≥ 22）

| 軸 | 見るもの |
|---|---|
| 正確性 | カード・引用リソースと矛盾しないか |
| 一意性 | 正解が 1 つに決まるか（Solver の結果と突合） |
| 誤答の質 | もっともらしく、かつ明確に誤りか。不採用案・誤解に基づいているか |
| 設計適合 | 指定の出題単位・設問タイプ・レベルか |
| 手がかり漏れ | 選択肢だけの Solver が正解できないか。極端語（常に・絶対）や長さの偏りがないか |
| 新規性 | セット内・既存バンクの問題と概念が重複しないか |

- Judge は Writer と別プロンプト（可能なら別モデル）。**人間が採点した 30 問程度で Judge を校正**し、閾値を決める。
- Solver は弱いモデルで足りる（Gemini Flash 系）。
- 実装（PR 6）での具体化: Solver は **1 回（問題文 + 選択肢。正解・解説は非提示）**とし、「選択肢だけで解ける」手がかり漏れは決定的チェック（正解だけが長い等）で代替してコストを抑えた。合格条件は全軸 ≥ 3 かつ合計 ≥ 18、verdict ≠ reject、accuracy ≥ 3、構造的フラグなし。Solver の不一致は uniqueness ≤ 3 のときだけ fix の根拠。「fix」は Editor 1 回 → 決定的チェックのみで再確認し、直らない構造的不正は破棄、それ以外は指摘付きで提供。
- 査読は 1 問あたりの呼び出しを 2〜3 倍にするため、**既定では Gemini の本番模擬試験のみ有効**（`localStorage.asn_pipeline_judge = 'on' | 'off'` で上書き）。Batch 経路の査読（Judge/Solver を 2 つ目のジョブとして連鎖）は PR 6b に分けた。

### 8.3 実運用データ（事後）

正答率 95% 超／15% 未満、Bad 投票率、報告理由（「曖昧」「正解が違う」「似た問題」— 現在の Good/Bad に理由を追加）。閾値超えは引退候補としてセットから外し、再生成する。

### 8.4 生成器の回帰評価

`scripts/eval-exam-pipeline.mjs`（API キーは実行者のもの）: 対象試験で 1 セット生成し、**最大クラスタ ≤ 2、出題単位の網羅率 ≥ 90%、Judge 通過率 ≥ 85%** を満たすかを出力する。プロンプト・モデル・カードを変えたら必ず回す。

## 9. 集計イベントとバックエンド連携

- クライアントは問題単位のイベントを IndexedDB の `events` ストアに蓄積し、送信先は差し替え可能な sink にする（最初は未接続）。
- イベント案（問題文は送らない。`unitId` / `cardId` で集計する）:

```
{ type: 'question_generated'|'question_shown'|'question_answered'|'question_voted'|'set_completed',
  at, appVersion, examId, profile, mode, setId, questionId, domainId, taskId, unitId?, cardId?,
  isCorrect?, userAnswer?, elapsedMs?, judgeScore?, value?: 'good'|'bad', reason? }
```

- 送信先は #162/#167 のフィードバック・投票バックエンド（Lambda Function URL + DynamoDB、`feat/feedback-backend-162-167`）に **`POST /events` ルートを追加**するのが自然。既存の `/votes` は `targetType` と `value` を固定の許可リストで検証しているため流用できない。バッチ送信・flush のロジック（`js/feedbackApi.js`）は再利用できる。別セッションと調整する。
- ダッシュボードは **Amazon Quick** で見る（QuickSight とは別サービス）。当面は `scripts/export-feedback.mjs` と同様に DynamoDB → CSV の経路を用意する。AWS 操作は `docs/action-required/` に残す。

## 10. 段階導入計画

| PR | 内容 | 完了条件 |
|---|---|---|
| 1 | 本設計書 | 索引更新 |
| 2 | ExamSet / Attempt を IndexedDB に導入。全モードで 1 問ごとに保存。セット一覧 UI。中断からの再開 | 生成途中でリロードしても問題が残る E2E |
| 3 | Gemini Batch のジョブ永続化・再開と、段を連鎖させる実行基盤 | 再読込後にポーリングが再開する E2E（スタブ） |
| 4 | パイプライン本体（Blueprint / Planner / Writer / 決定的チェック）。カード無しでも動く | Planner 1 回 + Writer N 回の E2E、重複再生成の単体テスト |
| 5 | カードのスキーマ・在庫検査・採掘モード・AIB と SAA の初回カード | `check-card-coverage` 合格、人間レビュー済み |
| 6 | Judge / Solver / Editor、メトリクス表示、回帰評価スクリプト | AIB で最大クラスタ ≤ 2 を実測 |
| 7 | 集計イベントと sink、`/events` 連携、Amazon Quick 向け export | 別セッションのバックエンドとの疎通 |

## 11. 未決事項・リスク

- Judge の校正用に人間が採点する 30 問の確保（いつ・どこで）。
- Batch の対象モデルが Gemini 3 系に限られること。利用者のモデル設定次第で前面逐次モードに落ちる。
- カード採掘の品質（ブログの構成を誤読する）。人間レビューを必須にして吸収する。
- `js/ui.js` が巨大で、別セッション（フィードバック機能）と同時に触っている。本設計の実装は新モジュール中心にし、`ui.js` の変更を薄く保つ。
