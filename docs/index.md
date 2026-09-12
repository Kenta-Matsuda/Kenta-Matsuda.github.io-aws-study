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
- [APIキー不要の本番形式模擬試験（オフライン問題バンク） (#124)](issues/offline-production-exam.md)
- [API 設定画面の Google AI Studio リンクが消えていた問題 (#161)](issues/settings-help-links-161.md)
- [「★すべて」タブの項目名と導線の整理 (#163)](issues/general-tab-navigation-163.md)
- [スマホで AI 解説のコピーボタンが見切れる / 学習ライフ全体での使いやすさ (#165)](issues/ai-answer-mobile-and-portability-165.md)
- [AI 解説の `**「…」**` が太字にならない問題 (#164)](issues/markdown-emphasis-brackets-164.md)
- [「模擬問題を作成」で JSON がそのまま表示される問題 (#166)](issues/quiz-json-leak-166.md)
- [ダッシュボードのカルーセルの順番と初回表示時間 (#168)](issues/carousel-order-168.md)
- [問題生成が失敗したときのエラー原因の切り分け (#169)](issues/ai-network-error-messages-169.md)
- [要人間対応事項をチェックリスト一覧として可視化 (#184)](issues/action-required-checklist-184.md)
- [受験予定日のカウントダウンと合格お祝い (#200)](issues/exam-date-countdown-200.md)
- [AI検索をHyDEでクエリ拡張し、検索導線を強化 (#201)](issues/ai-search-hyde-201.md)

## LLM Wiki（docs/wiki/）

自己改善型エージェント（`exam-content-maintainer` / `github-issue-resolver`）が獲得した知見を**構造化して永続化**する Wiki です。各ページは**最終更新日と更新履歴**を持ち、棚卸しによる**最新化**と**過去ドキュメントとの整合性確保**が可能であることを前提に運用します。運用ルールは README を参照してください。

- [LLM Wiki 運用ルール（README）](wiki/README.md)
- [AWS 公式リソース探索ノウハウ](wiki/aws-resource-discovery.md)
- [試験リソース棚卸し台帳](wiki/exam-resource-inventory.md)
- [issue 解決プレイブック](wiki/issue-resolution-playbook.md)
- [恒久ブロック中の issue 索引（人間 / AWS 対応待ち）](wiki/blocked-issues-index.md)
- [効率化・自己拡張ログ](wiki/efficiency-log.md)

## 要人間対応事項（docs/action-required/）

AWS 操作など、人間しか実施できない**未対応（要対応）**の事項を構造化して残す場所です。規約とテンプレートは README を参照してください。俯瞰用のチェックリストは CHECKLIST を参照してください（#184）。

- [要人間対応チェックリスト（俯瞰用）](action-required/CHECKLIST.md) — `scripts/list-action-required.mjs` が生成 / 関連: #184
- [要人間対応事項の運用ルール（README）](action-required/README.md)
- [グローバルリーダーボード（毎日 / 毎週 / 毎月 / 累積の XP ランキング）](action-required/global-leaderboard.md) — 🔴 未対応（要対応） / 関連: #32
- [AWS ドキュメント MCP サーバによる問題生成の grounding と LLM as a judge による検証](action-required/mcp-grounding-llm-judge.md) — 🔴 未対応（要対応） / 関連: #109
- [ストリーク維持のためのプッシュ通知（アプリを閉じている間に届く通知）](action-required/streak-push-notifications.md) — 🔴 未対応（要対応） / 関連: #107
- [サイトを離れても続くバックグラウンド問題生成と、完了時のプッシュ通知](action-required/issue-119-background-generation-notifications.md) — 🔴 未対応（要対応） / 関連: #119
- [バックエンド実装計画（コマンドレベルの具体案 / 人間対応事項を含む）](action-required/issue-117-backend-implementation-plan.md) — 🔴 未対応（要対応） / 関連: #117（関連 #109 #119 #32 #107）
- [Web/AI 検索での発見性向上（SEO / AI 検索対策）](action-required/issue-125-seo-discoverability.md) — 🔴 未対応（要対応） / 関連: #125
- [GitHub アカウント無しで issue を登録できるようにする（Lambda 経由の投稿プロキシ）](action-required/issue-162-account-free-issue-submission.md) — 🔴 未対応（要対応） / 関連: #162
- [Good / Bad フィードバックを DynamoDB に集約し BI で可視化する](action-required/issue-167-feedback-analytics-dynamodb.md) — 🔴 未対応（要対応） / 関連: #167
- [AIチャットが実在する試験を否定し別試験にすり替える問題（一次情報グラウンディング）](action-required/issue-138-ai-chat-exam-grounding.md) — 🔴 未対応（要対応） / 関連: #138（関連 #109 PR #113 PR #135 PR #139）※ AWS 公式ドキュメント確認済み。クライアント側は `url_context` グラウンディングで対応完了
- [AWS Skill Builder のコース URL が全試験で失効している](action-required/skillbuilder-course-urls.md) — 🔴 未対応（要対応） / 関連: #69
- [NotebookLM 向け学習パックと学習分析 API（保存 / 他 SaaS 連携）](action-required/issue-165-notebooklm-pack-and-apis.md) — 🟡 一部対応 / 関連: #165 / PR #180 ※ クライアント側の学習パック生成（リソースリンク集 Markdown・CSV / 学習ルート Markdown / リソース用語集 CSV。`js/studyPack.js`）は実装済み。検索 API・分析 API・継続収集パイプラインは 🔴 未対応（要対応）
- [AWS 公式ドキュメントが対応する全言語へのサイト対応（多言語化）](action-required/issue-197-multilanguage-support.md) — 🔴 未対応（要対応） / 関連: #197 ※ AWS 操作は不要。対象言語の確定・翻訳ソース / 品質基準・コンテンツ翻訳の保守体制はプロダクト判断（要人間）
