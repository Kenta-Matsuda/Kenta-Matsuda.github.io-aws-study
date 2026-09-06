# Issue: ダッシュボードのカルーセルの順番と初回表示時間 (#168)

## 概要

issue #168 のフィードバックは 2 点。

> 最初のカルーセルが本の宣伝になっている。本の宣伝は最後にして、最初に問題生成が出るようにして。
> それから、画面を開いた直後は最初の表示がより長く表示されるようにして

## 対応

### 1. スライド順の入れ替え

`index.html` のカルーセル（`#carouselTrack`）のスライド順を次に変更した。

| 変更前 | 変更後 |
| --- | --- |
| 1. 本の宣伝 | 1. **Quiz Challenge（問題生成の導線）** |
| 2. Quiz Challenge | 2. Total XP |
| 3. Total XP | 3. Study Streak |
| 4. Study Streak | 4. Title（XP ウォーカー） |
| 5. Title | 5. Skills by Domain（レーダーチャート） |
| 6. Skills by Domain | 6. **本の宣伝** |

DOM の並び替えのみで、各スライドの中身・ID・イベント配線は変更していない。テストと今後の参照用に
`data-carousel-slide="quiz"` / `data-carousel-slide="book-promo"` の目印を付けた。

### 2. 初回表示を長くする

自動送りは 5 秒間隔だったため、開いた直後の 1 枚目がすぐ流れてしまっていた。1 枚目だけ
**12 秒**保持し、その後は従来どおり 5 秒間隔で回す。

- `js/ui.js` の `initDashboardCarousel()`: 初回は `setTimeout(..., FIRST_SLIDE_MS = 12000)` で待ち、
  最初の送りの後に `setInterval(advance, AUTO_SLIDE_MS = 5000)` へ切り替える。
- ユーザー操作（前後ボタン・ドット）で `resetAutoSlide()` が呼ばれた後は通常の 5 秒間隔にする
  （操作した人は自分で送るため）。`clearTimeout` と `clearInterval` の両方を呼び、初回保持タイマーも
  確実に解除する（タイマー ID は同一名前空間）。

## 検証

- `tests/dashboard-carousel.spec.mjs`（2 テスト）
  - 1 枚目が `data-carousel-slide="quiz"` で `#dashboardQuizBtn` を含み、最後が
    `data-carousel-slide="book-promo"` で `.book-promo-card` を含むこと
  - 開いてから 7 秒後もまだ 1 枚目のまま（従来は 5 秒で送られていた）で、その後 12 秒の保持が
    明けたら自動送りされること
- 修正前は 2 テストとも失敗、修正後は成功することを確認
- `npx playwright test`（全 25 テスト）成功
