# ドキュメント索引

このリポジトリ（AWS 学習支援の静的 PWA）の `docs/` 配下のドキュメント索引です。ドキュメントを追加・移動・削除したときは、**同じ PR でこの索引を更新**してください（デッドリンク・孤立ファイルを作らないこと）。

## issue 解説（docs/issues/）

実装済み / 対応方針が確定した issue の解説を置きます。ユーザー向けの挙動を変える実装は、既存スタイルに合わせた解説をここに追加します。

- [UI構造の全面リファクタリング](issues/ui-restructure.md)
- [試験作成/更新用エージェントの作成と最適化 (#69)](issues/exam-content-maintainer-agent.md)
- [フィードバックのハードルを下げる (#100 / #101)](issues/feedback-nudge-and-account-free.md)

## LLM Wiki（docs/wiki/）

`exam-content-maintainer` エージェントが獲得した知見を**構造化して永続化**する Wiki です。各ページは**最終更新日と更新履歴**を持ち、棚卸しによる**最新化**と**過去ドキュメントとの整合性確保**が可能であることを前提に運用します。運用ルールは README を参照してください。

- [LLM Wiki 運用ルール（README）](wiki/README.md)
- [AWS 公式リソース探索ノウハウ](wiki/aws-resource-discovery.md)
- [試験リソース棚卸し台帳](wiki/exam-resource-inventory.md)
- [効率化・自己拡張ログ](wiki/efficiency-log.md)

## 要人間対応事項（docs/action-required/）

AWS 操作など、人間しか実施できない**未対応（要対応）**の事項を構造化して残す場所です。規約とテンプレートは README を参照してください。

- [要人間対応事項の運用ルール（README）](action-required/README.md)

現在、要対応の項目はありません。
