# 受験予定日のカウントダウンと合格お祝い (#200)

- 対象 issue: [#200](https://github.com/Kenta-Matsuda/Kenta-Matsuda.github.io-aws-study/issues/200)（[Feedback] 全般）
- 要望: 「受験予定日を登録し、受験が近づいてくるにつれて通知が変わったり、合格したらおめでとう的な反応があったりする機能を追加して」

## ユーザー向けの挙動

ダッシュボード上部のカルーセルに **「受験予定日」** スライドを追加しました。

1. **予定日の登録・編集・削除**
   - 試験ごと（選択中の試験ごと）に受験予定日を登録できます。
   - 日付は `<input type="date">` で選び、「登録」で保存します。保存後は「削除」で消せます。
   - 保存内容はブラウザの localStorage（キー `asn_exam_date_v1`）に残るため、リロードしても保持されます。試験を切り替えると、その試験に紐づく予定日が表示されます。

2. **日が近づくと表示メッセージが変わる（ステージ制）**
   - 残り日数に応じて、カウントダウン表示と応援メッセージが 5 段階で切り替わります。
     - `far`（31 日以上）: 基礎固めを促すメッセージ
     - `soon`（8〜30 日）: 仕上げの復習を促すメッセージ
     - `imminent`（1〜7 日）: 苦手分野の最終チェックを促すメッセージ
     - `today`（当日）: 本番当日の応援メッセージ
     - `past`（予定日を過ぎた・未合格）: 結果の登録か再設定を促すメッセージ

3. **合格のお祝い**
   - 予定日を登録すると「合格した！ 🎉」ボタンが表示されます。押すと合格としてマークされ、**お祝いトースト + 紙吹雪（confetti）** が一度だけ表示されます（既存の XP マイルストーン / ストリークのお祝い UI と同じ仕組みを再利用）。
   - お祝いは表示済みフラグ（`celebrated`）で管理し、リロードのたびに繰り返し出ないようにしています。

## 実装方針

- **ピュアなロジックはモジュールに切り出し**: 日付計算とステージ判定を `js/examSchedule.js` に切り出しました（DOM / ネットワーク / localStorage に触れないピュア関数）。`js/resourceSearch.js` / `js/markdown.js` と同じ方針で、`now` を引数注入できるためブラウザ無しで単体テストできます（`tests/exam-schedule.spec.mjs`）。
  - `daysUntilExam(target, now)` … ローカル暦日の差で残り日数を返す（時刻成分によるズレを避ける）。
  - `stageForDaysUntil(days)` … 残り日数からステージキーを選ぶ。
  - `messageKeyForStage(stage)` … i18n キー `examDate.stage.<stage>` を返す。
  - `shouldCelebratePass({ passed, alreadyCelebrated })` … お祝いを表示すべきか判定。
- **保存は既存パターンに追従**: `js/storage.js` に `asn_*` プレフィックスの安全パース付き get/set/remove を追加（`getExamDateEntry` / `setExamDate` / `clearExamDate` / `markExamPassed` / `markExamCelebrated`）。`localStorage.clear()` は使いません。
- **UI**: `js/ui.js` にダッシュボードのウィジェット描画（`renderExamDateWidget`）とイベント配線（`wireExamDateControls`）、お祝いトースト（`showExamPassToast`）を追加。トーストは専用のタイマーを持ち、他のトーストと衝突しません。
- **i18n**: 追加した表示文字列は `js/locales/ja.json` と `en.json` の両方に、キー集合が相互ミラーになるよう追加しました。
- **PWA**: 新規モジュール `js/examSchedule.js` を `sw.js` のプリキャッシュ一覧に追加しました。

## 考慮したトレードオフ

- **端末内・単一ユーザーの localStorage 実装**: 予定日・合格状態はこの端末のブラウザにのみ保存されます。端末やブラウザをまたいだ同期はありません（このアプリはアカウント不要・バックエンド無しの静的 PWA のため）。
- **「通知」= アプリ内メッセージ**: ここで提供するのは、アプリを開いたときにダッシュボードで見えるステージ別メッセージです。**OS レベルの真のプッシュ通知（アプリを閉じている間に届く通知）は対象外**です。それにはバックエンド + Service Worker の push（+ VAPID 等の購読管理）が必要で、本アプリのアーキテクチャでは提供していません。既存の学習リマインダー（`settings.reminderNote`）も同じ理由でアプリ内表示に留めています。
- **AWS / バックエンドは一切使用していません**（この機能に AWS 操作は不要）。

## 検証

この環境（INTEGRATIONS_ONLY）では npm レジストリが 403 になりブラウザも未キャッシュのため **Playwright は実行できません**。そのため静的検証と、ピュアモジュールの直接実行で代替しました。

- `env -u NODE_OPTIONS node --check` … `js/examSchedule.js` / `js/storage.js` / `js/ui.js` / `sw.js` / `tests/exam-schedule.spec.mjs` すべて通過。
- `JSON.parse` … `js/locales/ja.json` / `en.json` 通過。両者のキー集合が完全な相互ミラーであることを差分で確認（差分ゼロ）。
- `js/examSchedule.js` を `node` から直接 import して境界値（0 / 7 / 8 / 30 / 31 / 負数 / 不正入力）とステージ選択・お祝い判定を実行し、期待どおりの結果を確認。
- `sw.js` に `./js/examSchedule.js` が含まれることを確認。

### 手動での再現手順（人間向け）

1. ローカルサーバーを起動: `node dev-server.mjs`（既定ポートで配信）。
2. ダッシュボード上部のカルーセルを「受験予定日」スライドまで送る。
3. 未来の日付（例: 数日後 / 数週間後 / 翌日 / 当日）を入力して「登録」。カウントダウンとメッセージがステージごとに変わることを確認。
4. リロードしても予定日が保持されることを確認。
5. 「合格した！ 🎉」を押し、お祝いトースト + 紙吹雪が一度だけ出ることを確認（再リロードで再表示されない）。
6. 「削除」で予定日が消えることを確認。
