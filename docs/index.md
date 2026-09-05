# ドキュメント索引

このリポジトリ（AWS 学習支援の静的 PWA）の `docs/` 配下のドキュメント索引です。ドキュメントを追加・移動・削除したときは、**同じ PR でこの索引を更新**してください（デッドリンク・孤立ファイルを作らないこと）。

## issue 解説（docs/issues/）

実装済み / 対応方針が確定した issue の解説を置きます。ユーザー向けの挙動を変える実装は、既存スタイルに合わせた解説をここに追加します。

- [UI構造の全面リファクタリング](issues/ui-restructure.md)
- [試験作成/更新用エージェントの作成と最適化 (#69)](issues/exam-content-maintainer-agent.md)
- [フィードバックのハードルを下げる (#100 / #101)](issues/feedback-nudge-and-account-free.md)
- [学習ダッシュボードのXPウォーカー刷新 (#102)](issues/xp-walker-redesign.md)
- [PWAインストール後のアイコンが古い画像のまま表示される問題の修正 (#97)](issues/pwa-png-icons.md)
- [Duolingo 風の学習継続エンゲージメント (#107)](issues/streak-engagement.md)
- [解説の出典URL可視化とプロンプトgroundingの厳格化（クライアント側） (#109)](issues/citation-grounding-clientside.md)
- [ブログの技術レベル表示と re:Post リソースの拡充 (#137)](issues/resource-level-and-repost-137.md)

## LLM Wiki（docs/wiki/）

`exam-content-maintainer` エージェントが獲得した知見を**構造化して永続化**する Wiki です。各ページは**最終更新日と更新履歴**を持ち、棚卸しによる**最新化**と**過去ドキュメントとの整合性確保**が可能であることを前提に運用します。運用ルールは README を参照してください。

- [LLM Wiki 運用ルール（README）](wiki/README.md)
- [AWS 公式リソース探索ノウハウ](wiki/aws-resource-discovery.md)
- [試験リソース棚卸し台帳](wiki/exam-resource-inventory.md)
- [効率化・自己拡張ログ](wiki/efficiency-log.md)

## 要人間対応事項（docs/action-required/）

AWS 操作など、人間しか実施できない**未対応（要対応）**の事項を構造化して残す場所です。規約とテンプレートは README を参照してください。

- [要人間対応事項の運用ルール（README）](action-required/README.md)
- [グローバルリーダーボード（毎日 / 毎週 / 毎月 / 累積の XP ランキング）](action-required/global-leaderboard.md) — 🔴 未対応（要対応） / 関連: #32
- [ストリーク維持のためのプッシュ通知（アプリを閉じている間に届く通知）](action-required/streak-push-notifications.md) — 🔴 未対応（要対応） / 関連: #107
- [サイトを離れても続くバックグラウンド問題生成と、完了時のプッシュ通知](action-required/issue-119-background-generation-notifications.md) — 🔴 未対応（要対応） / 関連: #119
- [バックエンド実装計画（コマンドレベルの具体案 / 人間対応事項を含む）](action-required/issue-117-backend-implementation-plan.md) — 🔴 未対応（要対応） / 関連: #117（関連 #109 #119 #32 #107）
- [AIチャットが実在する試験を否定し別試験にすり替える問題（MCP による一次情報グラウンディング）](action-required/issue-138-ai-chat-exam-grounding.md) — 🔴 未対応（要対応） / 関連: #138（関連 #109 PR #113 PR #135 PR #139）
