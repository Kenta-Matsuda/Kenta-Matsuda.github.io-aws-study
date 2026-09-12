# AI検索のHyDEクエリ拡張を試験ガイド由来のサービス辞書で補強 (#209)

## 背景（何が問題だったか）

AI検索は #201（PR #204）で HyDE（Hypothetical Document Embeddings）化された。曖昧な
クエリをまず AI に渡して具体的な AWS サービス名 / キーワードへ展開し、その展開語で
ローカル索引を和集合検索（`searchResourcesMulti`）してから、AI に候補の中だけで
ランク付けさせる流れである。

issue #209 では、ユーザーが **「Quick が検索できるか」を AI検索のリトマス試験**として
使っている。ここでの「Quick」は、比較的新しい AWS サービス（Amazon QuickSight の新機能や
Amazon Q など）を指す。**LLM が学習していないサービスは、展開語をモデルに丸ごと推測させる
現状の HyDE では出力に現れず、検索から抜け落ちる**。実際に「Quick」が AI検索の結果に
出てこなかった、という報告である。

ユーザーの提案は次の 2 点:

1. 各試験ガイドについて「どのサービス / 概念が重要か」を事前に整理しておく。
2. それを HyDE のクエリ拡張に反映して、高精度な検索にする。

ポイントは、試験データには各タスク / ステップの `knowledge` / `knowledgeEn` 配列という形で
「その試験で重要な AWS サービス名」が**モデルの知識に依存しない恒久的な出典**として既に
存在していることである。今まではこの出典を HyDE に還元していなかった。

## 実装方針

### 1. 試験ガイド由来のキーワード辞書（catalog）を構築

`js/resourceSearch.js` にピュア関数 `buildExamKeywordCatalog(exams = ALL_EXAMS)` を追加した。
`buildResourceIndex` と**同じ走査**（step レベルの `exam.steps[]` と task レベルの
`exam.domains[].tasks[]` の両方）を歩き、各 step / task の `knowledge` と `knowledgeEn`
配列から素の AWS サービス名 / 概念キーワードを収集する。文字列単体でも配列でも受け付け、
trim し、空要素は捨て、大文字小文字を無視して重複排除しつつ**最初に現れた表記を保持**する。
DOM / ネットワーク非依存なのでブラウザ無しで単体テストできる。

### 2. 展開語を辞書で補強

同じく `js/resourceSearch.js` にピュア関数 `augmentTermsWithCatalog(terms, catalog, opts)`
を追加した。HyDE の展開語（`[query, ...expandedTerms]`）に対し、クエリと関連する catalog
エントリを足し込む。「関連する」は緩めの部分一致（大文字小文字無視）で判定する:

- いずれかのクエリ語が catalog エントリの部分文字列（例 `Quick` ⊂ `Amazon QuickSight`）、または
- catalog エントリがいずれかのクエリ語の部分文字列（例 catalog の `Amazon Q` が
  クエリ語 `Amazon Q Developer とは` に含まれる）。

結果は「元の terms が先、その後に catalog 順で追加分」の順序を保ち、大文字小文字を無視して
重複排除し、`opts.limit`（既定 24）で全体を打ち切る。入力は変更しない。

これにより、**モデルが `Amazon QuickSight` を展開語に出さなくても**、クエリに `Quick` /
`QuickSight` が含まれていれば辞書の `Amazon QuickSight` が引き込まれ、`searchResourcesMulti`
が公開済みの QuickSight リソースを見つけられる。

### 3. UI への配線

`js/ui.js` に、既存の `resourceSearchIndex` メモ化と対になる `getExamKeywordCatalog()`
（`buildExamKeywordCatalog()` を 1 回だけ呼んでキャッシュ）を追加した。AI検索ハンドラ
（`wireResourceSearchHandlers`）で、従来 `const terms = [query, ...expandedTerms];` だった
箇所を次のように変更した。

```js
const baseTerms = [query, ...expandedTerms];
const terms = augmentTermsWithCatalog(baseTerms, getExamKeywordCatalog());
candidates = searchResourcesMulti(index, terms, { examId });
```

`searchResourcesMulti` と `selectAiCandidates` は変更していない。

### 4. モデルプロンプトへの辞書投入は見送り（決定事項）

「query 関連の catalog 抜粋をモデルの system / user プロンプトに『既知の重要サービス』として
渡す」案（steps の任意項目）は**採用しなかった**。展開後の決定的な補強（上記 2・3）だけで
issue #209 のリトマス試験（`Quick` → QuickSight）は満たせるうえ、プロンプト投入は
`parseExpandedKeywords` の契約やレイテンシ・コストに追加の複雑さ / リスクを持ち込むため、
低リスクな決定的補強に絞った。

## 変更ファイル

- `js/resourceSearch.js`: ピュア関数 `buildExamKeywordCatalog` / `augmentTermsWithCatalog` を追加。
- `js/ui.js`: `getExamKeywordCatalog()` のメモ化キャッシュ追加、import 拡張、AI検索
  ハンドラで展開語を辞書補強するよう変更。
- `tests/exam-guide-hyde.spec.mjs`: 辞書構築・補強の回帰テスト（新規）。
- `docs/issues/exam-guide-hyde-209.md`（本ファイル） / `docs/index.md`。

## 考慮したトレードオフ

- **決定的補強 vs. モデルへの辞書投入**: 後者はモデルの理解を新サービスにグラウンディング
  できる可能性があるが、契約・レイテンシ・コスト面の複雑さが増す。issue の要件は前者で
  満たせるため、まず低リスクな決定的補強を採用した。
- **緩い部分一致の再現率と精度**: `Quick` のような短い語が意図しない catalog エントリを
  拾う可能性はあるが、`augmentTermsWithCatalog` の結果はあくまで `searchResourcesMulti` の
  検索語であり、最終的な出力は `selectAiCandidates` の関連度スコアと AI ランク付けで
  絞られる。過剰追加は `opts.limit`（既定 24）で上限を設けて抑えている。
- **辞書は試験データが出典**: `knowledge` / `knowledgeEn` を出典にするため、モデルの学習
  時期に依存せず、試験データが更新されれば辞書も自動で追随する。反面、データに未収載の
  サービスは辞書に載らない（データ側の充実が別途必要）。
- **索引走査との整合**: `buildExamKeywordCatalog` は `buildResourceIndex` と同じ step +
  domain/task 構造を歩くよう実装し、走査のずれによる取りこぼしを避けた。

## 検証

このサンドボックスは Playwright を実行できない（INTEGRATIONS_ONLY / npm レジストリ非到達 /
ブラウザ未キャッシュ）。そのため静的検証と、ピュア関数の直接実行で確認した。

- `env -u NODE_OPTIONS node --check` を `js/resourceSearch.js` / `js/ui.js` /
  `tests/exam-guide-hyde.spec.mjs` に対して実行 → いずれも OK。
- `js/resourceSearch.js` を `node` で直接 import し、次を確認:
  - 実データ（既定 `ALL_EXAMS`）の catalog に小文字化すると `quicksight` を含むエントリが
    存在する。
  - `augmentTermsWithCatalog(['Quick'], catalog)` が `quicksight` を含む語を返す。
  - モデルが QuickSight を出さない想定（展開語 `['Amazon Athena']`）でも、
    `searchResourcesMulti(index, augmentTermsWithCatalog(['Quick','Amazon Athena'], catalog))`
    が QuickSight リソースを返す（→ `ALL_209_ASSERTIONS_PASS`）。
- 上記に加え、`tests/exam-guide-hyde.spec.mjs` の全ピュア assertion を `node` で直接実行し
  合格を確認（catalog の両レベル収集・trim・重複排除・文字列受付、augment の部分一致・
  重複防止・順序・limit・非変更）。

AI 呼び出し自体（曖昧なクエリ → 展開語）はブラウザ限定のため、下記の手動手順で確認する。

### 手動再現手順

1. `env -u NODE_OPTIONS node dev-server.mjs` でローカルサーバを起動する。
2. ブラウザで開き、設定から Gemini か OpenAI の API キーを登録する。
3. 右上の虫眼鏡（またはダッシュボードの検索導線）で横断検索モーダルを開く。
4. 「Quick」や「Quick で分析したい」のようなクエリを入力し、「AI検索」を押す。
5. モデルが QuickSight を展開語に出さなくても、候補一覧に Amazon QuickSight 関連の
   リソースが現れることを確認する。
