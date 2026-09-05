# AWS Skill Builder のコース URL が全試験で失効している（新 URL の特定にブラウザ操作が必要）

🔴 未対応（要対応）

- 種別: 手動確認（ブラウザ操作 / Skill Builder サインイン）
- 関連: #69 / PR #142（リンクチェッカ）および各試験の `content/*-resource-refresh` PR

## 症状

`js/data/` の各試験ファイルが掲載していた AWS Skill Builder のコース URL（旧ドメイン `explore.skillbuilder.aws`）が、**全 11 試験ぶん失効**しています。

旧 URL は次の形式でした。

```
https://explore.skillbuilder.aws/learn/course/internal/view/elearning/<数値ID>/<スラッグ>
https://explore.skillbuilder.aws/learn/learning_plan/view/<数値ID>/<スラッグ>   ← ANS-C01 の Networking Learning Plan
```

これらにアクセスすると、次の URL へリダイレクトされます。

```
https://skillbuilder.aws/search?searchText=<スラッグ>&showRedirectNotFoundBanner=true
```

**`showRedirectNotFoundBanner=true` は AWS 自身が「移行先のコンテンツを見つけられなかった」ことを示すフラグ**であり、旧コース ID が失効したことの確定的な証拠です。学習者がリンクを開くと「見つかりませんでした」のバナー付き検索ページに着地します。

該当は次の試験です（AIB-C01 は `skillbuilder.aws/category/exam-prep/...` 形式のため別扱い。下記「補足」参照）。

| 試験 | 該当リンク |
| --- | --- |
| AIF-C01 | Exam Prep コース / AWS AI Practitioner Essentials / 公式練習問題集 |
| AIP-C01 | Exam Prep コース / 公式練習問題集 |
| ANS-C01 | Exam Prep コース / Networking Learning Plan / 公式練習問題集 |
| DEA-C01 | Exam Prep コース / 公式練習問題集 |
| DOP-C02 | Exam Prep コース / 公式練習問題集 |
| DVA-C02 | Exam Prep コース / 公式練習問題集 |
| MLA-C01 | Exam Prep コース / 公式練習問題集 |
| SAA-C03 | Exam Prep コース / AWS Technical Essentials / 公式練習問題集 |
| SAP-C02 | Exam Prep コース / 公式練習問題集 |
| SCS-C03 | Exam Prep コース / 公式練習問題集（**いずれも SCS-C02 版を指している**） |
| SOA-C03 | Exam Prep コース / 公式練習問題集（**いずれも SOA-C02 版を指している**） |

## 推定原因

AWS Skill Builder が `explore.skillbuilder.aws` から `skillbuilder.aws` へ移行した際、**コースの数値 ID 体系が引き継がれなかった**ものと推定されます。AWS 側のリダイレクト処理は旧 URL のスラッグを検索キーワードに変換するフォールバックのみを行い、個別コースへの解決はできていません。

## 切り分け手順

1. 旧 URL にアクセスし、リダイレクト先に `showRedirectNotFoundBanner=true` が付くことを確認する（**完了済み**）。
2. 新ドメイン側で個別コース URL を機械的に検証しようとしたが、**原理的に不可能**であることを確認した（**完了済み**）。
   - `skillbuilder.aws` は SPA（シングルページアプリケーション）で、**存在しないパスでも HTTP 200 を返します**。
   - 実測: `https://skillbuilder.aws/this-path-should-not-exist-xyz123` → **200**。
   - したがって HTTP ステータスによる死活判定ができず、推測した URL が正しいかを自動検証できません。
3. 検索ページの HTML はクライアント側レンダリングのため、サーバ応答から実際のコース URL を抽出することもできませんでした（**完了済み**）。

## 現時点での暫定対応（実施済み）

各試験の `content/*-resource-refresh` PR で、旧 URL を**`showRedirectNotFoundBanner=true` を外した検索 URL**に置き換えました。

```
https://skillbuilder.aws/search?searchText=<スラッグ>
```

- AWS 自身がリダイレクト先として選んでいる URL と同一で、エラーバナーだけを取り除いた形です。
- 学習者は「見つかりませんでした」の表示なしに検索結果へ着地します。
- **個別コースへの直リンクではないため、暫定対応です。**

## 要人間対応事項

⚠️ 要人間対応: ブラウザでの手動確認が必要（AWS マネジメントコンソールの操作は不要）

- 必要な操作内容:
  1. ブラウザで `https://skillbuilder.aws/` を開き（必要に応じて AWS Builder ID でサインイン）、各試験の **Exam Prep コース**と**公式練習問題集（Official Practice Question Set）**を検索する。
  2. 見つかったコースの**個別 URL（アドレスバーの URL）をコピー**する。
  3. **SCS-C03 / SOA-C03 については、C03 版のコースが提供されているか**を確認する（現状のリンクは C02 版を指しています）。提供されていなければ、その旨を本ファイルに記録する。
  4. AIB-C01 のステップ 3（Exam Prep コース）とステップ 5（公式練習問題集）が**同一 URL** を指しているため、練習問題集の直リンクが別に存在するかを確認する。
- 対象リソース: `js/data/<試験コード>.js` の `steps[].resources[]` のうち `key: 'training'` および `key: 'practice'` のグループ
- 想定コマンド: なし（AWS リソース操作は不要。取得した URL をデータファイルに反映するだけ）

取得した URL をこのファイルに追記していただければ、エージェント側でデータファイルへの反映 PR を作成します。

## 補足: AIB-C01 の扱い

AIB-C01 は旧ドメインではなく `https://skillbuilder.aws/category/exam-prep/ai-business-strategist-business-AIB-C01` という新ドメインの形式を使っています。上記のとおり SPA のため 200 が返るだけで実在確認はできていませんが、`showRedirectNotFoundBanner` は付かないため**失効している証拠はありません**。そのため AIB-C01 の PR では URL を変更していません。ただしステップ 3 とステップ 5 が同一 URL を指している点は改善余地があります。
