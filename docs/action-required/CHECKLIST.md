# 要人間対応チェックリスト

- 最終更新日: 2026-09-06
- 対象範囲: `docs/action-required/` にある人間側の要対応事項（AWS 操作など、エージェントが実行できない作業）を、リポジトリ上で俯瞰できるチェックリストにしたもの
- 生成元: `scripts/list-action-required.mjs`（各ファイルの冒頭ステータス行・タイトル・種別・関連 issue を機械的に抽出）。`node scripts/list-action-required.mjs --write` で再生成できます。手で編集せず、元ファイルを直してから再生成してください。
- 出典/参照: issue #184 / `docs/action-required/README.md`

未対応: 9 件 / 完了: 0 件 / 合計: 9 件

## 未対応（要対応）

- [ ] [グローバルリーダーボード（毎日 / 毎週 / 毎月 / 累積の XP ランキング）](global-leaderboard.md) — 🔴 未対応（要対応） / 種別: 要人間対応（バックエンド / AWS インフラ） — 関連: #32
- [ ] [バックエンド実装計画（コマンドレベルの具体案 / 人間対応事項を含む）](issue-117-backend-implementation-plan.md) — 🔴 未対応（要対応） / 種別: 要人間対応（バックエンド / AWS インフラ） — 関連: #117 と関連 #109 #119 #32 #107
- [ ] [サイトを離れても続くバックグラウンド問題生成と、完了時のプッシュ通知](issue-119-background-generation-notifications.md) — 🔴 未対応（要対応） / 種別: 要人間対応（バックエンド / Web Push サービス） — 関連: #119（関連: #117 バックエンド化アンブレラ / #107 ストリーク用プッシュ通知）
- [ ] [Web/AI 検索での発見性向上（SEO / AI 検索対策）](issue-125-seo-discoverability.md) — 🔴 未対応（要対応） / 種別: 外部サービス設定 / 手動確認 — 関連: #125
- [ ] [GitHub アカウント無しで issue を登録できるようにする（Lambda 経由の投稿プロキシ）](issue-162-account-free-issue-submission.md) — 🔴 未対応（要対応） / 種別: 要人間対応（バックエンド / AWS インフラ / GitHub App の資格情報管理） — 関連: #162（本件） / #101 #100（クライアント側で下げられる摩擦は対応済み: [フィードバックのハードルを下げる](../issues/feedback-nudge-and-account-free.md)） / #166（画像添付の自動化も同じ経路に載る） / [バックエンド実装計画（アンブレラ）](issue-117-backend-implementation-plan.md)
- [ ] [Good / Bad フィードバックを DynamoDB に集約し BI で可視化する](issue-167-feedback-analytics-dynamodb.md) — 🔴 未対応（要対応） / 種別: 要人間対応（バックエンド / AWS インフラ / データ保持方針） — 関連: #167（本件） / #162（同じ API 基盤に載る） / [バックエンド実装計画（アンブレラ）](issue-117-backend-implementation-plan.md)
- [ ] [AWS ドキュメント MCP サーバによる問題生成の grounding と LLM as a judge による検証](mcp-grounding-llm-judge.md) — 🔴 未対応（要対応） / 種別: 要人間対応（バックエンドプロキシ / LLM パイプライン） — 関連: #109
- [ ] [AWS Skill Builder のコース URL が全試験で失効している（新 URL の特定にブラウザ操作が必要）](skillbuilder-course-urls.md) — 🔴 未対応（要対応） / 種別: 手動確認（ブラウザ操作 / Skill Builder サインイン） — 関連: #69 / PR #142（リンクチェッカ）/ PR #157（sitemap 由来の直リンク化）および各試験の `content/*-resource-refresh` PR
- [ ] [ストリーク維持のためのプッシュ通知（アプリを閉じている間に届く通知）](streak-push-notifications.md) — 🔴 未対応（要対応） / 種別: 要人間対応（バックエンド / Web Push サービス） — 関連: #107

## 完了

- （完了済みの項目はここに移動します。完了した要対応事項は原則ディレクトリから削除し確定ドキュメントへ移す運用ですが、残っている場合はここに [x] で表示されます）

## 更新履歴

- 2026-09-06: `scripts/list-action-required.mjs` により生成 / 更新。
