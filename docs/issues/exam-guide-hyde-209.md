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
issue #209 の意図（試験ガイド由来のサービスを HyDE に反映）を満たせるうえ、プロンプト投入は
`parseExpandedKeywords` の契約やレイテンシ・コストに追加の複雑さ / リスクを持ち込むため、
低リスクな決定的補強に絞った。

## v1 レビュー指摘への対応（follow-up）

初回レビューは NEEDS_CHANGES で、字面ベースの補強が「効いている範囲」と「効いていない範囲」を
明確に切り分けた。指摘は 5 点。以下のとおり対応した。

### 指摘 1: リトマス `Quick` 単独では needle が動かない → 実効化した

`searchResources` は大文字小文字を無視した**部分一致**なので、生クエリ `Quick` は既に
`QuickSight` に部分一致し（6 件ヒット）、`Amazon QuickSight` を辞書から足しても**追加リソースは
0 件**（補強は no-op）だった。一方、`Amazon Q Developer とは` のような**冗長な多語クエリ**は
生では 1 つの AND フレーズ扱いで 0 件になり、辞書が清潔なサービス語を供給して初めて結果が出る
（0 → 9 件）。この「多語クエリでの実効」を保ちつつ、下記の指摘 3・4・5 で

- 検索リコールに実際に効くケース（多語クエリ・字面が重ならない概念クエリ）を増やし、
- 辞書由来のヒットが AI グラウンディングに確実に届くようにした（指摘 4）。

`Quick` **単独**については、字面部分一致で既にヒットするため辞書補強は追加リソースを生まない。
これは「悪化ではなく現状維持（既に検索できている）」であり、本 issue の実質的なギャップは
**冗長クエリ**と**字面の重ならない概念クエリ**にあることを、正直に本ドキュメントに明記する。

### 指摘 2: 退行検知できない end-to-end テスト → 差分テストに書き換え

旧テスト（`['Quick','Amazon Athena']` で QuickSight が出る）は、補強を**外しても通る**ため
新挙動を何も守っていなかった。`tests/exam-guide-hyde.spec.mjs` を次の**退行検知可能**な差分
テストに置き換えた。

- **冗長クエリ差分**: `Amazon Q Developer とは` について、補強前（`[query, ...expandedTerms]`、
  すなわち機能導入前に `ui.js` が行っていた挙動）の結果集合と補強後を同一索引で比較し、
  「補強後にしか出ない結果（delta）が非空」を assert。補強を revert すると baseline=0 のままで
  delta も 0 になり、テストは**落ちる**。
- **字面非重複の概念クエリ**: `BIツール`（QuickSight と部分文字列を一切共有しない）が、補強
  （概念エイリアス経由）でのみ QuickSight を出すことを assert。revert すると出ないため落ちる。

退行検知が効くことは、`augmentTermsWithCatalog` を恒等関数（＝補強無し）に差し替えた throwaway
実行で「両 assert が落ちる」ことを確認済み（PR 本文 / FEAT-002 findings にコマンドと出力を記録）。

### 指摘 3: 素の `Amazon Q` が過剰一致 → 短い/曖昧トークンをガード

素の `Amazon Q` は `amazon` AND `q` として検索され、1 文字の `q` が queue / quotas / parquet /
data quality 等に偶然部分一致して**無関係な約 38 件**をグラウンディングに引き込んでいた。
ピュア関数 `isSafeCatalogSearchTerm(entry)` を追加し、「句読点除去後のトークン列に 1 文字以下の
トークンがあり、かつトークン総数が 2 個以下（アンカー語が無い）」エントリだけを検索語から除外
する。これにより実データでは `Amazon Q` 系（`Amazon Q` とその概念リスト表記）だけが弾かれ、
アンカー語を持つ `Amazon Q Developer` / `Amazon Q Business` は**温存**される。単体テスト済み。

### 指摘 4: グラウンディングが生クエリで採点される → 拡張後 term で採点

`selectAiCandidates(candidates, query, 40)` を**生クエリ**で採点すると、catalog 経由でのみ
候補入りしたリソース（生クエリに `quick` が無い等）が 0 点になり 40 件キャップの外へ落ちて
モデルに届かない恐れがあった。ピュア関数 `buildAugmentedScoringQuery(terms)` を追加し、`ui.js`
では拡張後の term 集合から作った採点用クエリで `selectAiCandidates` を呼ぶよう変更した。
`selectAiCandidates` / `scoreResourceRelevance` / `searchResourcesMulti` は**未変更**。

### 指摘 5: 字面の重ならない曖昧クエリが未対応 → 小さな概念エイリアスで部分対応（限界を明記）

`BIツール` のように**意図（概念）だけを述べサービス名を含まない**クエリは、字面部分一致では
catalog を引けない。概念→サービスの一般的な意味対応を決定的ピュア関数で完全に解くのは範囲外
のため、重い意味マッピングや外部依存は導入しない。代わりに、試験データに実在するサービスへの
**小さな手動エイリアス表** `CONCEPT_SERVICE_ALIASES`（例: `BIツール` / `ダッシュボード` /
`business intelligence` → `Amazon QuickSight`）を追加し、`augmentTermsWithCatalog` がクエリを
概念語に部分一致させたとき対応サービスを「クエリ語」として catalog 照合に載せる（catalog に
無いサービスは加えない）。純粋・テスト可能・低リスク。

**限界（正直な明記）**: これは**網羅的な概念→サービス辞書ではない**。エイリアス表に載っていない
概念クエリ（多くのドメイン語）は依然として字面部分一致に依存し、サービス名を含まなければ
補強されない。汎用的な概念対応（例: 埋め込みベースの意味検索）は本 issue のスコープ外とし、
必要になった時点で別 issue として検討する。

## 変更ファイル

- `js/resourceSearch.js`: ピュア関数 `buildExamKeywordCatalog` / `augmentTermsWithCatalog` を追加。
  v1 レビュー対応で `isSafeCatalogSearchTerm`（過剰一致ガード）、`CONCEPT_SERVICE_ALIASES`
  （概念→サービスの小さな手動エイリアス）、`buildAugmentedScoringQuery`（拡張後 term での
  グラウンディング採点）を追加。
- `js/ui.js`: `getExamKeywordCatalog()` のメモ化キャッシュ追加、import 拡張、AI検索
  ハンドラで展開語を辞書補強し、グラウンディング候補選抜を拡張後 term で採点するよう変更。
- `tests/exam-guide-hyde.spec.mjs`: 辞書構築・補強・ガード・採点クエリの回帰テスト、および
  退行検知可能な差分 end-to-end テスト。
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
- 上記に加え、`tests/exam-guide-hyde.spec.mjs` の全ピュア assertion（26 件）を `node` で直接
  実行し合格を確認（catalog の両レベル収集・trim・重複排除・文字列受付、augment の部分一致・
  重複防止・順序・limit・非変更、`isSafeCatalogSearchTerm` のガード、`buildAugmentedScoringQuery`、
  概念エイリアス、および退行検知可能な差分 e2e）。
- **退行検知の証明**: `augmentTermsWithCatalog` を恒等関数（補強無し）に差し替えた throwaway
  実行で、冗長クエリ差分テスト（`Amazon Q Developer とは`）と概念クエリテスト（`BIツール`）の
  両 assert が**落ちる**ことを確認（補強を戻すと通る）。

AI 呼び出し自体（曖昧なクエリ → 展開語）はブラウザ限定のため、下記の手動手順で確認する。

### 手動再現手順

1. `env -u NODE_OPTIONS node dev-server.mjs` でローカルサーバを起動する。
2. ブラウザで開き、設定から Gemini か OpenAI の API キーを登録する。
3. 右上の虫眼鏡（またはダッシュボードの検索導線）で横断検索モーダルを開く。
4. 「Quick」や「Quick で分析したい」のようなクエリを入力し、「AI検索」を押す。
5. モデルが QuickSight を展開語に出さなくても、候補一覧に Amazon QuickSight 関連の
   リソースが現れることを確認する。
