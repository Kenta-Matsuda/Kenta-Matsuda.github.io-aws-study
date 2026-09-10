# ローカルミッション（デイリー/ウィークリー/マンスリー）と XP 付与 (#193)

## 背景（issue #193）

フィードバックフォームからの要望:

> ミッション、とかがあるといいのかも。デイリー、ウィークリー、マンスリーのミッションがあって、クリアするとXPが貰えるイメージ
> そうなるとどの資格にも属さないトップページが欲しいね

この要望には 2 つの側面があります。

1. **クライアント完結で実現できる部分**: 端末内（localStorage）で完結するデイリー/ウィークリー/マンスリーのミッション、達成時のローカル XP 付与、資格に依存しない進捗サーフェス。
2. **バックエンドが必要な部分**: 複数ユーザー横断のミッション達成ランキング/共有。これは #32（グローバルリーダーボード）と同じく DynamoDB + Lambda + API Gateway 等が必要で、**⚠️ 要人間対応（AWS 操作）** になります。

本対応では **1 のクライアント完結スライスのみ**を実装しました。2 は本 PR のスコープ外です（`Refs #193`。`Closes` にしていません）。

## 実装したもの

### 純粋ロジックモジュール `js/missions.js`

`js/resourceSearch.js` / `js/data/daily-challenge.js` と同じ方針で、DOM / ネットワーク / localStorage に一切触れないピュア関数モジュールです。ブラウザ無しで単体テストできます。

- `MISSION_TEMPLATES`: ミッションの定義（期間 × メトリクス × 目標数 × 報酬 XP）。
  - デイリー: クイズ 3 問回答 (+5 XP) / クイズ 1 問正解 (+5 XP) / リソース 1 件閲覧 (+3 XP)
  - ウィークリー: クイズ 20 問回答 (+30 XP) / クイズ 10 問正解 (+30 XP)
  - マンスリー: 500 XP 獲得 (+100 XP)
- `getPeriodKey(period, now)`: 期間キー（daily=`YYYY-MM-DD`, weekly=`YYYY-Www`(ISO 週), monthly=`YYYY-MM`）を基準時刻から算出。
- `normalizeMissionsProgress(progress, now)`: 進捗を検証・正規化し、期間キーが変わっていればその期間のカウンタ・受領フラグをリセット（＝**期間ロールオーバー**）。
- `recordMissionMetric(progress, metric, amount, now)`: メトリクスイベントを加算した新しい進捗を返す（該当する期間のみ加算）。
- `computeMissionState(progress, now)`: 全ミッションの現在状態と「クリア済みだが報酬未受領」の一覧（`newlyCompleted`）を返す。
- `claimMissions(progress, ids, now)`: 指定ミッションを「報酬受領済み」にマーク（未達成は無視）。

メトリクス: `quiz`（1 問回答ごと）/ `correct`（正解ごと）/ `link`（リソース閲覧ごと）/ `xp`（期間内獲得 XP）。

### 永続化と XP 付与（`js/storage.js`）

- 既存パターン（`asn_*` キー・safe-parse・`localStorage.clear()` を使わない）に合わせて `asn_missions_v1` キーで進捗を保存。
- `getMissionsSummary()`: 現在のミッション一覧を返す（読み込み時に正規化＝期間リセットを書き戻す）。
- `recordMissionEvent(metric, amount)`: メトリクスを記録し、その結果クリアされたミッションに対して**既存の XP 機構 `addXp({ reason: 'mission' })` 経由で報酬 XP を付与**する。XP 経済圏を二重に持たないための設計で、付与済みは `claimed` フラグで再付与を防ぎます。マイルストーン解放も既存の `getNewlyUnlockedMilestones` 経路をそのまま使います。

### UI（`js/ui.js` + `index.html`）

- **資格非依存のトップサーフェス**: 既存の学習ダッシュボード（`#xpDashboard`）はもともと特定の試験に依存せず、`__beginner__`（初心者ガイド）や全試験で同じものが描画されます。ここに**ミッションカルーセルスライド**を 1 枚追加し、デイリー/ウィークリー/マンスリーのミッション・進捗バー・報酬 XP を表示します。既存のハッシュルーティング（`js/app.js` / `EXAM_HASH_MAP` / `__beginner__`）を壊さないよう、新しいルーターは導入していません。
- クイズ回答時（`quiz` / `correct`）とリソースリンク閲覧時（`link`）に `recordMissionEvent` を呼び、達成したミッションはトースト（`#missionToast`）で通知します。
- 新規の表示文言は `js/locales/ja.json` と `en.json` の両方に相互ミラーで追加しました。

### その他

- `js/missions.js` を `sw.js` のキャッシュ一覧へ追加し、`CACHE_VERSION` を `v3` → `v4` に更新（更新反映のため）。
- 回帰テスト `tests/missions.spec.mjs` を追加（ミッション有効化・完了判定・XP 報酬・期間リセット境界を固定タイムスタンプで検証）。

## トレードオフ / スコープ

- **クライアント完結・単一端末のみ**。進捗は端末の localStorage に閉じるため、端末間の同期やユーザー横断のランキングはできません。これは意図的な制約で、横断ランキング（要望 2）はバックエンドが必要なため本 PR のスコープ外です（`Refs #193`）。
- **「トップページ」の解釈**: 完全に独立した新規ランディングページ／ルーターは作らず、既に資格非依存で機能している学習ダッシュボードにミッションを載せる**最小構成**を採りました。過剰な設計を避けつつ要望の主眼（資格に属さないミッション + 全体 XP/称号の一覧）を満たします。
- ミッションの種類・目標数・報酬 XP は暫定案です。プロダクト側で調整したい場合は `MISSION_TEMPLATES` の 1 箇所で変更できます。

## 要人間対応（AWS 操作は未実行）

複数ユーザー横断のミッション達成ランキング/共有は、サーバー側の集計基盤（DynamoDB + Lambda + API Gateway 等）が必要です。本 PR では **AWS 操作は一切実行していません**。実装する場合は #32（グローバルリーダーボード）のバックエンド設計と共通化するのが妥当です。

## 検証

ビルドステップの無い静的サイトのため、静的チェックで検証しています（Playwright はこの環境では実行不可）。

- `env -u NODE_OPTIONS node --check` を変更した全 JS（`js/missions.js` / `js/storage.js` / `js/ui.js` / `sw.js` / `tests/missions.spec.mjs`）に対して実行 → すべて OK。
- `js/locales/ja.json` / `en.json` を `JSON.parse` し、キー集合が完全な相互ミラーであることを確認。
- `js/missions.js` のピュア関数を `env -u NODE_OPTIONS node` で直接実行し、期間キー算出・メトリクス加算・完了判定・claim・期間ロールオーバー（日/週/月境界）を確認。
- `tests/missions.spec.mjs` を追加（同一ロジックを回帰テスト化）。
