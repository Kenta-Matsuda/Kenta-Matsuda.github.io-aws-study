# 恒久ブロック中の issue 索引（人間 / AWS 対応待ち）

- 最終更新日: 2026-09-12
- 対象範囲: 構造的に人間 / AWS 対応が必要で、クライアントサイドでは前進できないため毎回の棚卸しで再トリアージ不要な open issue の一覧
- 出典/参照: `.kiro/agents/github-issue-resolver.md`（対応保留マーカーの運用 / 手順 3）/ `docs/wiki/issue-resolution-playbook.md`（A-15）/ `docs/wiki/efficiency-log.md` / `docs/action-required/` / issue #32 #162 #167

> このページは、**人間しか実施できない対応（多くは AWS バックエンドのプロビジョニング）が本質的に必要で、以降クライアントサイドでは前進できない open issue** を 1 か所にまとめた**恒久的な索引**です。毎回の棚卸しで同じ issue を「ゼロから読み直して『AWS バックエンドが必要 → スキップ』と再導出する」無駄を無くすために置いています。スキーマ（メタデータ + 更新履歴）は [README](README.md) を参照してください。

## この索引の位置づけ（GitHub の `agent:skipped` マーカーとの関係）

- この索引は、GitHub 側の `agent:skipped` ラベル + `🤖 agent:skipped` 判断コメントという**既存のマーカー機構を置き換えるものではなく、補完するもの**です。マーカーは GitHub 上の各 issue に付く「機械可読な信号」、本索引はリポジトリ内に持つ「人間がレビューできる恒久的な一覧」で、役割が違います。
- 棚卸しの手順としては、**この索引を最初に参照**して「既知の恒久ブロック issue か」を判定し、該当すれば（＝記録日以降に新しい人間入力が無ければ）**再トリアージ・再読込をしない**。判断の一次情報は引き続き GitHub 側のマーカーと `scripts/issue-triage.mjs` の `SKIP` / `RECHECK` 判定であり、本索引はその要約・恒久記録として使います。
- **記録日以降に新しい人間入力（本文編集・エージェント以外の新規コメント）があれば、この索引の記載に関わらず通常どおり再調査する**（`scripts/issue-triage.mjs` が `RECHECK` を出す）。ブロック解消の判断は本索引ではなく、常に最新の GitHub 状態で行います。
- **新規のスキップコメントは付けない**（A-15）。索引に載っている issue は既にマーカー 1 件で十分で、再コメントは `RECHECK` のときだけです。

## 恒久ブロック中の issue 一覧

以下はいずれも **AWS バックエンド（サーバ側の永続ストア + API）が本質的に必要**で、静的サイト（クライアントサイド）だけでは要件を満たせない issue です。各 issue のクライアント側で前進できた分は既に別 PR で出荷済み、または `docs/action-required/` に設計と人間側の作業として引き継いであります。エージェントは `aws` / `sam` / `cdk` / `terraform` などの操作を**一切実行しません**（記載するリソース名は人間が精査・実行するための提案です）。

### #32 — グローバルリーダーボード（毎日 / 毎週 / 毎月 / 累積の XP ランキング）

- **ブロック種別**: 要人間対応（AWS バックエンド）
- **なぜブロックか**: 複数ユーザーの XP を横断集計・共有してランキングを返す仕組みが無く、書き込み先（サーバ側の永続ストア）と読み出し API が存在しないため、クライアントだけでは実装できない。
- **解消に必要な人間 / AWS 対応**: XP を集計・保存・配信するバックエンドのプロビジョニング（DynamoDB + Lambda + API Gateway）。集計期間別（日 / 週 / 月 / 累積）のクエリ設計とレート制限・不正投稿対策の検討。
- **成果物 / 引き継ぎ**: [グローバルリーダーボード](../action-required/global-leaderboard.md) / [バックエンド実装計画（アンブレラ）](../action-required/issue-117-backend-implementation-plan.md)
- **記録日**: 2026-09-12（`agent:skipped` 済み。同種スキップコメントの累積は A-15 で対処済み）

### #162 — GitHub アカウント無しで issue を登録できるようにする（Lambda 経由の投稿プロキシ）

- **ブロック種別**: 要人間対応（AWS バックエンド + GitHub App の資格情報管理）
- **なぜブロックか**: GitHub issue はアカウント無しでは書き込めない。アカウント不要投稿には、資格情報を安全に保持してブラウザ → GitHub の投稿を仲介するサーバ側プロキシが必要で、静的サイトからは実現できない（クライアント側で下げられる摩擦は #100 / #101 で対応済み）。
- **解消に必要な人間 / AWS 対応**: 投稿プロキシ（Lambda + API Gateway）のプロビジョニングと、GitHub App / トークンの資格情報管理・スパム対策。
- **成果物 / 引き継ぎ**: [アカウント不要の issue 投稿](../action-required/issue-162-account-free-issue-submission.md) / [バックエンド実装計画（アンブレラ）](../action-required/issue-117-backend-implementation-plan.md)
- **記録日**: 2026-09-12（`agent:skipped` 済み）

### #167 — Good / Bad フィードバックを DynamoDB に集約し BI で可視化する

- **ブロック種別**: 要人間対応（AWS バックエンド + データ保持方針）
- **なぜブロックか**: これまで Google Analytics に送っていた good / bad フィードバックをサーバ側に集約・保持し、BI（Amazon QuickSight）で可視化する要件で、集約先ストアと収集パイプライン、BI 連携がいずれもサーバ側にしか置けない。
- **解消に必要な人間 / AWS 対応**: 収集パイプライン（Lambda → DynamoDB）のプロビジョニングと、Amazon QuickSight 連携・データ保持方針の決定。#162 と同じ API 基盤に載る。
- **成果物 / 引き継ぎ**: [フィードバック分析（DynamoDB）](../action-required/issue-167-feedback-analytics-dynamodb.md) / [バックエンド実装計画（アンブレラ）](../action-required/issue-117-backend-implementation-plan.md)
- **記録日**: 2026-09-12（`agent:skipped` 済み）

## メンテナンス方法

- 新たに「クライアントサイドで前進できず、人間 / AWS 対応が本質的に必要」と確定した issue が出たら、`agent:skipped` マーカーを付けたうえで**本索引にも 1 エントリ追記**する（issue 番号 + タイトル / ブロック種別 / なぜブロックか / 解消に必要な人間・AWS 対応 / `docs/action-required/` 成果物へのポインタ / 記録日）。
- ブロックが解消された（バックエンドが用意された等）issue は、対応後に本索引から**削除ではなく「解消済み」への更新**を基本とし、その事実と理由を `## 更新履歴` に残す。
- リンクは相対パスで、実在するファイル / 見出しを指すこと（デッドリンク禁止）。

## 更新履歴

- 2026-09-12: 初版作成。人間 / AWS 対応待ちで恒久ブロック中の open issue（#32 グローバルリーダーボード / #162 アカウント不要 issue 投稿 / #167 フィードバック分析）を、毎回の再トリアージ重複を避けるための恒久索引としてシードした。既存の `agent:skipped` マーカー機構（GitHub ラベル + 判断コメント）と `scripts/issue-triage.mjs` の `SKIP` / `RECHECK` 判定を置き換えず補完する位置づけを明記（出典: `.kiro/agents/github-issue-resolver.md` / `docs/wiki/issue-resolution-playbook.md` A-15 / `docs/action-required/`）。
