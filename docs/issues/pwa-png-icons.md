# Issue: PWAインストール後のアイコンが古いキャラクター画像のまま表示される (#97)

## 概要

PWA をインストールすると、ホーム画面やアプリ一覧のアイコンが現在のアプリアイコン
（紺色の角丸正方形 + オレンジの雲 + 白い本 + チェックマーク）ではなく、**以前のキャラクター画像**
のまま表示されてしまう。とくに iOS と一部の Android ランチャーで再現する。

## 根本原因

1. **`index.html` が存在しない favicon を参照していた。**
   `<link rel="icon" href="./assets/og/favicon.ico">` を指していたが、`assets/og/` には
   大きな PNG（`architect.png` など）しか無く `favicon.ico` は存在しない（デッドリンク）。

2. **`manifest.json` が SVG アイコンしか宣言していなかった。**
   `icons` が `image/svg+xml`（`sizes: "any"`）のみで、iOS および一部の Android ランチャーは
   **SVG のみのマニフェストを無視**し、キャッシュ済みの古いラスター画像やスクリーンショットに
   フォールバックする。これがインストール後アイコンが古いままになる中心的な原因。

3. **`apple-touch-icon` が SVG を指していた。**
   iOS は `apple-touch-icon` の SVG を無視するため、ホーム画面追加時に正しいアイコンが使われなかった。

## 変更内容

### 1. ラスター PNG アイコンの生成
`assets/icon.svg` / `assets/icon-maskable.svg` と同じジオメトリ（配色・形状）を再現した
実際の PNG を生成し、`assets/` に追加した。

- `assets/icon-192.png`（192x192、透過角丸、purpose `any`）
- `assets/icon-512.png`（512x512、透過角丸、purpose `any`）
- `assets/icon-maskable-512.png`（512x512、全面塗り + セーフゾーン内モチーフ、purpose `maskable`）
- `assets/apple-touch-icon.png`（180x180、**不透明背景**。iOS が黒背景を付けないため）

生成は再実行可能なスクリプト `scripts/generate-icons.mjs` で行う。オフライン環境では
外部の画像変換ツール（ImageMagick / rsvg / cairosvg 等）が利用できないため、
**Node 標準の `zlib` のみ**でモチーフを描画し PNG（IHDR/IDAT/IEND + CRC32）を符号化している。
再生成は次で行う。

```
env -u NODE_OPTIONS node scripts/generate-icons.mjs
```

### 2. `manifest.json` の `icons` 更新
PNG エントリ（`192x192` / `512x512` の `any`、および `512x512` の `maskable`）を追加。
既存の SVG エントリはプログレッシブエンハンスメントとして残した。これにより
インストール可能要件（192 と 512 のラスター `any` アイコン）を満たす。

### 3. `index.html` の修正
- 存在しない `./assets/og/favicon.ico` への参照を削除。
- `rel=icon` に PNG（192x192）を追加、`apple-touch-icon` を `./assets/apple-touch-icon.png` に変更。

### 4. Service Worker のキャッシュ更新
`sw.js` の `CACHE_VERSION` を `v2` → `v3` に更新し、`activate` 時に旧キャッシュを破棄。
新しい PNG アイコンを `APP_SHELL` のプリキャッシュ対象に追加した。

## 考慮したトレードオフ

- **SVG エントリを残すか削除するか**: iOS 等が無視するのは事実だが、SVG に対応する
  ブラウザでは高精細に表示できるため、PNG を優先しつつ SVG も併記する構成にした。
- **PNG を手動コミットせずスクリプト生成にした理由**: オフライン環境で外部画像ツールが
  無いため純 Node で描画。ピクセル単位で SVG と完全一致はしないが、**識別可能な同一モチーフ**
  （紺の角丸 + オレンジの雲 + 白い本 + チェック）を再現でき、再生成も容易。
- **`apple-touch-icon` を不透明にした理由**: iOS は透過部分を黒で塗るため、
  角丸の外側を透過にすると黒枠が出る。全面塗りにして黒背景化を防いだ。

## 受入条件

- [ ] `assets/` に 192x192 / 512x512 / maskable 512x512 / 180x180 apple-touch の
      有効な PNG（マジックバイト `89 50 4E 47`）が存在する。
- [ ] `manifest.json` が有効な JSON で、`icons` に 192x192 と 512x512 のラスター PNG と
      maskable PNG を含む。
- [ ] `index.html` が存在しない `./assets/og/favicon.ico` を参照せず、
      `apple-touch-icon` が実在の PNG を指す。
- [ ] `sw.js` の `CACHE_VERSION` が `v3` に更新され、新しい PNG が `APP_SHELL` に含まれる。
