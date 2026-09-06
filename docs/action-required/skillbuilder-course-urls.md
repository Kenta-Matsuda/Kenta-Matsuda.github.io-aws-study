# AWS Skill Builder のコース URL が全試験で失効している（新 URL の特定にブラウザ操作が必要）

🔴 未対応（要対応）

- 種別: 手動確認（ブラウザ操作 / Skill Builder サインイン）
- 関連: #69 / PR #142（リンクチェッカ）/ PR #157（sitemap 由来の直リンク化）および各試験の `content/*-resource-refresh` PR
- 進捗: 8 試験の**試験対策ページ**は sitemap 由来の直リンクへ差し替え済み（第 2 次対応）。残るのは公式練習問題集の個別 URL と、sitemap に載っていない AIF-C01 / AIP-C01 / MLA-C01 のコース URL。

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

## 第 1 次対応（実施済み・暫定）

各試験の `content/*-resource-refresh` PR で、旧 URL を**`showRedirectNotFoundBanner=true` を外した検索 URL**に置き換えました。

```
https://skillbuilder.aws/search?searchText=<スラッグ>
```

- AWS 自身がリダイレクト先として選んでいる URL と同一で、エラーバナーだけを取り除いた形です。
- 学習者は「見つかりませんでした」の表示なしに検索結果へ着地します。
- **個別コースへの直リンクではないため、暫定対応です。**

## 第 2 次対応（実施済み・sitemap 由来の直リンクへ差し替え）

> メンテナからの指摘: 「Skill Builder にはお気に入り機能が無く毎回検索しないといけない。AWS サポートからも**コースのリンクを直接ブラウザにお気に入りする方法**を勧められた。だから直接 URL を載せてほしい」（PR #157）

検索 URL のままでは「毎回検索する」手間が残るため、**AWS 自身が公開している sitemap から試験対策ページの直リンクを特定**して差し替えました。

```
https://skillbuilder.aws/robots.txt      → Sitemap: https://skillbuilder.aws/sitemap.xml
https://skillbuilder.aws/sitemap.xml     → 27 URL。うち exam-prep 配下が 11 件
```

sitemap に載っている試験対策ページ（= AWS 公認の恒久 URL）:

| sitemap の URL | 対応する試験 | データ反映 |
| --- | --- | --- |
| `https://skillbuilder.aws/exam-prep/advanced-networking-specialty` | ANS-C01 | ✅ 反映済み |
| `https://skillbuilder.aws/exam-prep/data-engineer-associate` | DEA-C01 | ✅ 反映済み |
| `https://skillbuilder.aws/exam-prep/developer-associate` | DVA-C02 | ✅ 反映済み |
| `https://skillbuilder.aws/exam-prep/devops-engineer-professional` | DOP-C02 | ✅ 反映済み |
| `https://skillbuilder.aws/exam-prep/security-specialty` | SCS-C03（C02 版が表示される可能性あり） | ✅ 反映済み |
| `https://skillbuilder.aws/exam-prep/solutions-architect-associate` | SAA-C03 | ✅ 反映済み |
| `https://skillbuilder.aws/exam-prep/solutions-architect-professional` | SAP-C02 | ✅ 反映済み |
| `https://skillbuilder.aws/exam-prep/sysops-administrator-associate` | SOA-C03（C02 版が表示される可能性あり） | ✅ 反映済み |
| `https://skillbuilder.aws/exam-prep/cloud-practioner`（AWS 側の綴り誤りのまま） | CLF-C02 | 未使用（CLF-C02 は既に `/learn/...` 形式の個別コース直リンクを保持しているため変更不要） |
| `https://skillbuilder.aws/exam-prep/machine-learning-specialty` | MLS-C01（本サイトの対象外） | 対象外 |

**sitemap に試験対策ページが無い試験**: AIF-C01 / AIP-C01 / MLA-C01（および AIB-C01 は `skillbuilder.aws/category/exam-prep/...` 形式を既に使用）。これらは検索 URL のまま残しています。

### 個別コース URL の形式（判明済み）

CLF-C02 だけは個別コースの直リンクを保持しており、新ドメインでの形式が判明しています。

```
https://skillbuilder.aws/learn/<コースID>/<スラッグ>/<コンテンツID>
例: https://skillbuilder.aws/learn/94T2BEN85A/aws-cloud-practitioner-essentials-/J3USM8JWUK
```

この 2 つの ID は**ページを開かないと分からない**ため、エージェント側では特定できません（下記「自動特定が不可能な理由」）。

### 自動特定が不可能な理由（実測で確定）

- `skillbuilder.aws` は SPA で、**存在しないパスでも HTTP 200 と同一の HTML を返す**。実測: `/exam-prep/solutions-architect-associate`・`/this-path-should-not-exist-xyz123`・`/category/exam-prep/...` のいずれも 200 で `<title>AWS Skill Builder</title>` のみ。`<meta name="description">` も `canonical` も無い。
- 検索結果・コース一覧はクライアント側レンダリングで、サーバ応答には含まれない。
- SPA バンドル（`/static/js/main.*.js`）にはマイクロフロントエンドの配信元（`https://search.xps.skillbuilder.aws` など）が列挙されているだけで、公開されたカタログ API のパスは見つからなかった。`search.xps.skillbuilder.aws` 直叩きは XPS のシェル HTML を返すのみ。
- したがって**個別コース URL は「sitemap に載っているもの」以外、機械的には特定できません**。sitemap だけが唯一の機械可読な一次情報です。

## 要人間対応事項

⚠️ 要人間対応: ブラウザでの手動確認が必要（AWS マネジメントコンソールの操作は不要）

第 2 次対応で 8 試験の**試験対策ページ**は直リンク化できたため、残る人間対応は次に絞られました。

- 必要な操作内容:
  1. **公式練習問題集（Official Practice Question Set）の個別 URL**（全試験）。試験対策ページ内のリンクを開き、アドレスバーの `https://skillbuilder.aws/learn/<コースID>/<スラッグ>/<コンテンツID>` をコピーする。※ 試験対策ページと同一 URL を練習問題集にも入れると 2 つの学習ステップが同じリンクになってしまうため、エージェント側では意図的に検索 URL のまま残しています。
  2. **AIF-C01 / AIP-C01 / MLA-C01 の試験対策コース URL**（sitemap に試験対策ページが無いため）。あわせて AIF-C01 の `AWS AI Practitioner Essentials`、SAA-C03 の `AWS Technical Essentials`、ANS-C01 の `Networking Learning Plan` も個別コース URL が取得できれば差し替えます。
  3. **SCS-C03 / SOA-C03 の C03 版コースが提供されているか**の確認（`exam-prep/security-specialty` / `exam-prep/sysops-administrator-associate` は C02 版を表示している可能性があります）。提供されていなければその旨を本ファイルに記録する。
  4. AIB-C01 のステップ 3（Exam Prep コース）とステップ 5（公式練習問題集）が**同一 URL** を指しているため、練習問題集の直リンクが別に存在するかを確認する。
- 対象リソース: `js/data/<試験コード>.js` の `steps[].resources[]` のうち `key: 'training'` および `key: 'practice'` のグループ
- 想定コマンド: なし（AWS リソース操作は不要。取得した URL をデータファイルに反映するだけ）

取得した URL をこのファイルに追記していただければ、エージェント側でデータファイルへの反映 PR を作成します。

## 補足: AIB-C01 の扱い

AIB-C01 は旧ドメインではなく `https://skillbuilder.aws/category/exam-prep/ai-business-strategist-business-AIB-C01` という新ドメインの形式を使っています。上記のとおり SPA のため 200 が返るだけで実在確認はできていませんが、`showRedirectNotFoundBanner` は付かないため**失効している証拠はありません**。そのため AIB-C01 の PR では URL を変更していません。ただしステップ 3 とステップ 5 が同一 URL を指している点は改善余地があります。
