# Issue: Duolingo 風の学習継続エンゲージメント (#107)

## 概要

「ユーザーの学習ストリークを伸ばすために、Duolingo のような有名アプリの良いところを取り入れてほしい」という要望（#107）への対応。要望は大きく次の 2 つに分かれる。

1. 学習継続を促す**通知**（「学習を続けて！」と訴えかける方向性）。
2. ユーザーが自発的に「続けたい！」と思える**内発的動機づけ**の仕組み。

本対応は **バックエンドを持たない静的 PWA** という制約の中で、クライアントサイドのみで実現できる範囲を実装する。サーバが必須となる「アプリを閉じている間にも届く本物のプッシュ通知」は実装せず、要人間対応として `docs/action-required/streak-push-notifications.md` に設計・引き継ぎを残した。

## 変更内容

### 1. オプトイン式のローカル学習リマインダー

- 設定モーダルに「学習リマインダー」トグルを追加（`settings.reminderLabel` / `settings.reminderToggle`）。
- 有効化すると、Web Notifications API に対応していれば通知許可をリクエストする（`Notification.requestPermission()`）。
- ストリークが**途切れそうなとき**（`getStreakInfo().hadActivityToday === false` かつ継続日数が 1 以上）に、
  - OS 通知が許可されていればローカル通知を発火し、
  - あわせてダッシュボードのストリークカードに**アプリ内ナッジ**（バナー）を表示する。
- Notification API 非対応 / 通知拒否の場合でもエラーにならず、アプリ内ナッジのみで機能を落とさない（グレースフルデグラデーション）。設定画面には現在の状態（オン / オフ / 未許可 / ブロック / 非対応）を表示する。
- リマインダーの有効・無効は `localStorage`（キー `asn_study_reminder`）に保存する。

### 2. 内発的動機づけ：ストリークのマイルストーン祝福

- 継続日数が **7 / 14 / 30 / 60 / 100 日** の節目に到達したとき、専用のストリーク祝福トースト（`#streakMilestoneToast`）+ 紙吹雪演出（`launchConfetti`）で**一度だけ**祝福する（`dashboard.streak.milestoneToast`）。XP 称号のマイルストーントーストとは別要素・別タイマーにしているため、1 回の解答で XP 称号とストリークの節目を同時に達成しても両方の祝福が表示され、片方がもう片方を上書きしない。
- 祝福済みのマイルストーンは `localStorage`（キー `asn_streak_celebrated_v1`）に記録し、同じ節目で繰り返し発火しないようにする。

## 技術的な実装方針

- **通知はすべてクライアントサイド・フィーチャーディテクション付き**。`typeof Notification === 'undefined'` を必ずガードし、サーバ通信は行わない。
- 既存インフラを再利用し、重複実装を避ける:
  - ストリーク情報は既存の `js/storage.js` の `getStreakInfo()`（7 日リングバッファ由来の `{ current, hadActivityToday }`）を使用。
  - 祝福演出は既存の `launchConfetti` と同じ紙吹雪パターンを流用しつつ、トーストは XP 称号用（`#milestoneToast`）とは独立した専用要素・専用タイマー（`showStreakMilestoneToast` / `hideStreakMilestoneToast` / `els.__streakMilestoneToastTimer`）で管理し、同一レンダー内で両方の祝福が競合しないようにする。
- 設定の永続化は既存の `THEME_STORAGE_KEY` などと同じ「定数キー + getter / setter」パターンに合わせて `js/storage.js` に追加（`getStudyReminderEnabled` / `setStudyReminderEnabled` / `getCelebratedStreakMilestone` / `setCelebratedStreakMilestone`）。`resetAppStorage()` でも消去する。
- 新規のユーザー向け文言は `js/locales/ja.json` と `en.json` の両方へ、キー集合をミラーさせて追加。

## スコープ外（要人間対応）

- **アプリ（タブ）を閉じている間にも届くプッシュ通知**は、Push API + Service Worker + Web Push サービス（VAPID 鍵・購読情報の保存・送信スケジューラ）が必須であり、静的サイト単体では実現できない。設計案・想定コマンドは `docs/action-required/streak-push-notifications.md` に構造化して残した。

## 受入条件

- [ ] 設定からローカル学習リマインダーをオプトインでき、有効化時に通知許可をリクエストする。
- [ ] Notification API 非対応 / 通知拒否でも例外を投げず、アプリ内ナッジで機能が落ちない。
- [ ] ストリークが途切れそうなとき（`hadActivityToday` が false）にローカル通知 / アプリ内ナッジがクライアントのみで発火する。
- [ ] ストリークのマイルストーン祝福が `getStreakInfo()` に連動して表示される。
- [ ] `js/locales/ja.json` と `en.json` のキー集合が一致している。
- [ ] サーバ依存のプッシュ通知が `docs/action-required/` に要人間対応として残されている。
