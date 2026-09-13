# 試験ガイドの PDF → Web ページ移行に伴うタスクステートメント全試験再検証

🔴 未対応（要対応）

- 種別: 手動確認（ネットワーク越しの AWS 試験ガイド Web ページ参照が必要）
- 関連: #190 / PR #195
- 補足: 本ファイルの残作業は **AWS リソース操作ではなく**、各試験の公式試験ガイド（Web ページ）を参照してタスクステートメント文言を突き合わせる**検証作業**です。したがって `⚠️ 要人間対応: AWS操作が必要` ブロックは付けません。ただし外部ネットワークアクセスが必要で、現在の実行環境（INTEGRATIONS_ONLY）では試験ガイド Web ページを取得できないため、ネットワークが使える環境での実行が必要です。

## 症状

PR #195（issue #190）に対するメンテナ指摘（2026-09-12）で、次の 2 点が示されました。

1. AWS 試験ガイドが **PDF から Web ページへ移行**していそうである。具体例として DVA-C02 ドメイン 3・タスク 4 の Web ページ URL が示された:
   `http://docs.aws.amazon.com/ja_jp/aws-certification/latest/developer-associate-02/developer-associate-02-domain3.html#developer-associate-02-domain3-task4`
2. その Web ガイドを見ると、DVA-C02 のステートメントは略記の **「AWS CI/CD サービスを使用したコードのデプロイ」ではなく**、正式な **「AWS の継続的インテグレーションおよび継続的デリバリー (CI/CD) サービスを使用したコードのデプロイ」** が正しいと分かる。

そのうえで「全試験に対して、(a) 試験ガイドが Web サイト化されているかを確認し、(b) 化されていれば今後それを正とし、改めてステートメントを確認する」ことが求められています。

## 推定原因

- これまで本リポジトリの `js/data/<code>.js` のタスクステートメント文言は **PDF 版試験ガイド**を典拠にしていたため、Web 版で正式表記へ改められた文言（例: 略記 CI/CD → 「継続的インテグレーションおよび継続的デリバリー (CI/CD)」の完全展開）とズレが生じているものがあり得る。
- #190 の本質（表示名と本文のズレ）と同じく、**典拠そのものが PDF から Web へ移った**ことで、典拠準拠の再確認が必要になった。

## この PR で対応できた範囲（ネットワーク不要のため実施済み）

- **DVA-C02 ドメイン 3・タスク 4** をメンテナ引用の正式表記へ修正（`js/data/dva-c02.js`）:
  - ja `jpTitle` / `description[0]`:
    - Before: `AWS CI/CD サービスを使用したコードのデプロイ`
    - After: `AWS の継続的インテグレーションおよび継続的デリバリー (CI/CD) サービスを使用したコードのデプロイ`
  - en `title` / `descriptionEn[0]`:
    - Before: `Deploy code by using AWS CI/CD services.`
    - After: `Deploying code using AWS continuous integration and continuous delivery (CI/CD) services`
- これはメンテナが典拠（Web ガイド）を引用して**正しい文言を明示**した唯一のケースであり、フェッチ無しで確定できるため修正しました。他のステートメントは Web ガイドの実地確認が必要なため、憶測での変更は行っていません。

## 切り分け手順（この環境で確認したこと）

1. `js/data/dva-c02.js` の該当タスク（id `3.4`）を特定し、ja/en の表示名・本文をメンテナ引用の正式表記へ揃えた。
2. `grep -n "継続的インテグレーション" js/data/*.js` で他試験の CI/CD 系ステートメントを確認。MLA-C01 3.3 は既に完全展開済み（PR #195 の先行対応）、SAP-C02 は箇条書きの対象知識であってタスク名ではない、と確認。
3. `env -u NODE_OPTIONS node --check js/data/dva-c02.js` で構文健全性を確認（PASS）。
4. **試験ガイド Web ページの取得は INTEGRATIONS_ONLY のため不可**。したがって全試験横断のステートメント再検証（下表）は本環境では完遂できないと判断した。

## 全試験の試験ガイド Web 版ステータス（要ネットワーク確認）

下記 URL パターン（メンテナ提示例に準拠）で各試験ガイドの Web 版有無を確認し、Web 版があればそれを正としてタスクステートメント文言を突き合わせる。`要確認` はネットワーク越しの実確認が必要な項目。

URL パターン（例）: `https://docs.aws.amazon.com/ja_jp/aws-certification/latest/<slug>/<slug>-domain<N>.html#<slug>-domain<N>-task<M>`

| 試験コード | データファイル | Web ガイド化 | ステートメント再検証 |
| --- | --- | --- | --- |
| CLF-C02 | `js/data/clf-c02.js` | 要確認 | 要確認 |
| AIF-C01 | `js/data/aif-c01.js` | 要確認 | 要確認 |
| AIP-C01 | `js/data/aip-c01.js` | 要確認 | 要確認 |
| AIB-C01 | `js/data/aib-c01.js` | 要確認 | 要確認（#190 でタスク 1.1 は対応済み） |
| SAA-C03 | `js/data/saa-c03.js` | 要確認 | 要確認 |
| DVA-C02 | `js/data/dva-c02.js` | あり（メンテナが Web URL を提示） | 一部対応（ドメイン 3・タスク 4 を修正）／残りは要確認 |
| SOA-C03 | `js/data/soa-c03.js` | 要確認 | 要確認 |
| DEA-C01 | `js/data/dea-c01.js` | 要確認 | 要確認 |
| MLA-C01 | `js/data/mla-c01.js` | 要確認 | 要確認（3.3 は完全展開済み） |
| SAP-C02 | `js/data/sap-c02.js` | 要確認 | 要確認 |
| DOP-C02 | `js/data/dop-c02.js` | 要確認 | 要確認 |
| ANS-C01 | `js/data/ans-c01.js` | 要確認 | 要確認 |
| SCS-C03 | `js/data/scs-c03.js` | 要確認 | 要確認 |

## 要人間対応事項

ネットワークが使える環境（人間または OPEN_INTERNET のエージェント実行）で、次を行ってください。

1. **Web ガイドの有無判定**: 上表の各試験について、`https://docs.aws.amazon.com/ja_jp/aws-certification/latest/<slug>/` 配下にドメイン別 Web ページ（`-domain<N>.html`）が存在するかを確認し、`Web ガイド化` 列を更新する。
2. **今後の典拠を Web ガイドに切り替え**: Web 版がある試験は、以後 Web ガイドを**唯一の正典**とする（PDF は参照しない）。
3. **タスクステートメント再検証**: Web 版がある試験について、`js/data/<code>.js` の各ドメイン・タスクの `jpTitle` / `title` / `description[0]` / `descriptionEn[0]` を Web ガイドの正式表記と突き合わせ、略記や旧表記（例: 「AWS CI/CD サービス」→「AWS の継続的インテグレーションおよび継続的デリバリー (CI/CD) サービス」）を正式表記へ揃える。DVA-C02 の他タスクも同様に確認する。
4. **反映と索引更新**: 修正は PR #195（または後続 PR）で反映し、対応が済んだ試験を上表から消し込む。全試験の消し込みが完了したら本ファイルを削除し、`docs/action-required/README.md` と `docs/index.md` の索引を同じ PR で更新する。

> 注記: 本環境（INTEGRATIONS_ONLY）は外部ネットワークへアクセスできないため、AWS 試験ガイド Web ページの取得ができません。したがって上記の全試験横断のステートメント再検証は本環境では実施できず、ネットワークが使える実行での完遂が必要です。フェッチ不要で確定できた DVA-C02 ドメイン 3・タスク 4 のみ本 PR で修正済みです。
