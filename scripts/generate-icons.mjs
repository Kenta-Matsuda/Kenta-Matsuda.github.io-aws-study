#!/usr/bin/env node
/*
 * scripts/generate-icons.mjs
 *
 * AWS Study Navigator の PWA 用ラスター PNG アイコンを生成する。
 *
 * 背景 (refs #97):
 *  - manifest.json / index.html が SVG アイコンのみを参照していたため、
 *    SVG マニフェストを無視する iOS や一部 Android ランチャーが
 *    キャッシュ済みの古いラスター (以前のキャラクター画像) にフォールバックし、
 *    インストール後のアイコンが古いまま表示されていた。
 *  - 本スクリプトは assets/icon.svg / assets/icon-maskable.svg と同じ
 *    ジオメトリ (紺色の角丸正方形 #232f3e、白い本、オレンジ #ff9900 の雲、
 *    紺色のチェックマーク) を純 Node (zlib のみ) でラスタライズし、
 *    有効な PNG として書き出す。外部の画像ツール (ImageMagick / rsvg /
 *    cairosvg 等) はオフライン環境で利用できないため使用しない。
 *
 * 実行:
 *   env -u NODE_OPTIONS node scripts/generate-icons.mjs
 *
 * 生成物 (すべて assets/ 配下):
 *   - icon-192.png            192x192  透過角丸 (purpose any)
 *   - icon-512.png            512x512  透過角丸 (purpose any)
 *   - icon-maskable-512.png   512x512  全面塗り + セーフゾーン内にモチーフ (purpose maskable)
 *   - apple-touch-icon.png    180x180  不透明 (iOS が黒背景を付けないよう全面塗り)
 *
 * 決定論的 (乱数なし) で、何度実行しても同じバイト列を生成する。
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', 'assets');

// ---- 色 (icon.svg と一致) ----------------------------------------------
const NAVY = [0x23, 0x2f, 0x3e]; // #232f3e 背景 / チェックマーク
const WHITE = [0xff, 0xff, 0xff]; // 本
const ORANGE = [0xff, 0x99, 0x00]; // 雲

// ---- 描画対象は 512x512 の論理座標系 (SVG の viewBox と同じ) --------------
// アンチエイリアスのため SS 倍でスーパーサンプリングしてから縮小する。
const BASE = 512;

/**
 * 512x512 論理キャンバス上のピクセル (fx, fy) の色を返す純粋関数。
 * 戻り値は { rgb: [r,g,b], a: 0..1 } の重ね合わせ結果。
 *
 * @param {number} fx 0..512 の X
 * @param {number} fy 0..512 の Y
 * @param {object} opts
 * @param {boolean} opts.maskable  true なら全面背景 + モチーフを 0.64 倍で中央寄せ
 * @param {boolean} opts.opaqueBg  true なら背景を角丸なしの全面塗り (apple-touch 用)
 * @param {number}  opts.radius    角丸半径 (論理座標)。opaqueBg / maskable では無視。
 */
function sampleColor(fx, fy, opts) {
  const { maskable = false, opaqueBg = false, radius = 112 } = opts;

  // --- 背景 (紺) ---
  let inBg;
  if (maskable || opaqueBg) {
    // 全面塗り (角丸なし)。maskable は Android のクロップに備え端まで塗る。
    inBg = true;
  } else {
    inBg = insideRoundedRect(fx, fy, 0, 0, BASE, BASE, radius);
  }

  // 背景外 (透過角丸の角) は完全透明。
  let rgb = NAVY;
  let a = inBg ? 1 : 0;

  // --- モチーフ (本 + 雲 + チェック) ---
  // maskable はモチーフを 0.64 倍で中央 (256,256) 起点にスケールするので、
  // モチーフ判定は逆変換した座標で行う。
  let mx = fx;
  let my = fy;
  if (maskable) {
    // SVG: translate(256 256) scale(0.64) translate(-256 -256)
    mx = (fx - 256) / 0.64 + 256;
    my = (fy - 256) / 0.64 + 256;
  }

  // 背景の外側 (透過角) にモチーフは描かない。
  const motifVisible = inBg;

  if (motifVisible) {
    // 本 (白): 2 つの湾曲したページ + 中央の背表紙。
    if (insideBook(mx, my)) {
      rgb = WHITE;
      a = 1;
    }
    // 雲 (オレンジ): 本より上に描く。
    if (insideCloud(mx, my)) {
      rgb = ORANGE;
      a = 1;
    }
    // チェックマーク (紺): 雲の内側、線幅 20 の折れ線。
    if (onCheckmark(mx, my)) {
      rgb = NAVY;
      a = 1;
    }
  }

  return { rgb, a };
}

// ---- ジオメトリのヘルパ --------------------------------------------------

function insideRoundedRect(x, y, rx, ry, w, h, r) {
  const left = rx;
  const top = ry;
  const right = rx + w;
  const bottom = ry + h;
  if (x < left || x > right || y < top || y > bottom) return false;
  // 4 隅の円弧
  const nearL = x < left + r;
  const nearR = x > right - r;
  const nearT = y < top + r;
  const nearB = y > bottom - r;
  if (nearL && nearT) return dist2(x, y, left + r, top + r) <= r * r;
  if (nearR && nearT) return dist2(x, y, right - r, top + r) <= r * r;
  if (nearL && nearB) return dist2(x, y, left + r, bottom - r) <= r * r;
  if (nearR && nearB) return dist2(x, y, right - r, bottom - r) <= r * r;
  return true;
}

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/*
 * 本 (open book):
 *   SVG path: M96 316 c48-26 96-26 152 0 56-26 104-26 152 0 v56
 *             c-48-26-96-26-152 0 -56-26-104-26-152 0 z
 * 上側の曲線 y_top(x) と下側の曲線 y_bottom(x) = y_top(x) + 56 の間を塗る。
 * 各ページは 3 次ベジェの近似として、放物線状のたわみで表現する
 * (端が高く中央が低い U 字。SVG のコントロールポイントに合わせる)。
 * 左ページ: x=96..248、右ページ: x=248..400。
 * さらに背表紙 rect x=240 y=304 w=16 h=80。
 */
function bookTopY(x) {
  // 左ページ 96..248, 右ページ 248..400。各ページとも端→中央→端で
  // "48 26 96 26 152 0" 相当のたわみ (中央で最も下がる ~26)。
  const pageW = 152;
  let x0;
  if (x >= 96 && x <= 248) x0 = 96;
  else if (x > 248 && x <= 400) x0 = 248;
  else return null;
  const t = (x - x0) / pageW; // 0..1
  // 端の y は 316、中央付近で +26 下がる放物線 (4t(1-t) がピーク1)。
  return 316 + 26 * (4 * t * (1 - t));
}

function insideBook(x, y) {
  // 背表紙 (中央の綴じ): rect x=240..256, y=304..384
  if (x >= 240 && x <= 256 && y >= 304 && y <= 384) return true;
  const top = bookTopY(x);
  if (top === null) return false;
  const bottom = top + 56;
  return y >= top && y <= bottom;
}

/*
 * 雲 (cloud): SVG path
 *   M182 232 c-30 0 -54-24 -54-54 0-28 21-51 48-54
 *   9-27 34-46 63-46 33 0 61 24 65 56
 *   27 3 48 26 48 54 0 30 -24 54 -54 54 H182 z
 * 複数の円 (突起) と底辺の矩形の和集合で近似する。
 * 底辺 y=232 に沿って左 x=182 から右 x=350 付近まで広がる雲。
 */
function insideCloud(x, y) {
  if (y > 232) return false; // 底辺 (y=232) より下は雲でない
  // 底部を平らに閉じる矩形 (突起の下側を繋いで底辺 H182 を作る)。
  if (x >= 138 && x <= 344 && y >= 178 && y <= 232) return true;
  // 突起の円 (中心, 半径) — SVG の各 arc をカバーするよう配置。
  // 左右は小さめ、中央 2 山を大きくして雲らしいシルエットにする。
  const bumps = [
    [150, 190, 42], // 左
    [206, 150, 58], // 中央左 (大きい山)
    [272, 152, 56], // 中央右 (大きい山)
    [330, 190, 42], // 右
  ];
  for (const [cx, cy, r] of bumps) {
    if (dist2(x, y, cx, cy) <= r * r) return true;
  }
  return false;
}

/*
 * チェックマーク: SVG path M212 178 l26 28 54-58、stroke-width 20、丸端。
 * 2 本の線分 (212,178)->(238,206) と (238,206)->(292,148) からの距離が
 * 10 (=半線幅) 以下の点を塗る。丸端・丸継ぎのため線分距離で判定。
 */
function onCheckmark(x, y) {
  const half = 10;
  const d1 = distToSeg(x, y, 212, 178, 238, 206);
  const d2 = distToSeg(x, y, 238, 206, 292, 148);
  return Math.min(d1, d2) <= half;
}

function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.sqrt(dist2(px, py, cx, cy));
}

// ---- ラスタライズ (スーパーサンプリング) --------------------------------

/**
 * size x size の RGBA バッファ (Uint8Array, size*size*4) を生成する。
 * 各出力ピクセルを SS x SS でサンプリングし平均してアンチエイリアスする。
 */
function rasterize(size, opts) {
  const SS = 4; // 1 ピクセルあたり 4x4 サブサンプル
  const scale = BASE / size; // 論理座標 (512) と出力サイズの比
  const out = new Uint8Array(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const fx = (px + (sx + 0.5) / SS) * scale;
          const fy = (py + (sy + 0.5) / SS) * scale;
          const { rgb, a: sa } = sampleColor(fx, fy, opts);
          // 透明サンプルは色を寄与させない (プリマルチプライド平均)。
          r += rgb[0] * sa;
          g += rgb[1] * sa;
          b += rgb[2] * sa;
          a += sa;
        }
      }
      const n = SS * SS;
      const alpha = a / n; // 0..1
      const idx = (py * size + px) * 4;
      if (alpha > 0) {
        // アンプリマルチプライして単色化
        out[idx] = Math.round(r / a);
        out[idx + 1] = Math.round(g / a);
        out[idx + 2] = Math.round(b / a);
        out[idx + 3] = Math.round(alpha * 255);
      } else {
        out[idx] = 0;
        out[idx + 1] = 0;
        out[idx + 2] = 0;
        out[idx + 3] = 0;
      }
    }
  }
  return out;
}

// ---- PNG エンコード (zlib のみ) -----------------------------------------

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// CRC32 テーブル
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * RGBA バッファを 8bit カラータイプ 6 (RGBA) の PNG に符号化して Buffer を返す。
 */
function encodePng(size, rgba) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // 各スキャンラインの先頭にフィルタバイト 0 (None) を付与
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  const rgbaBuf = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter type None
    rgbaBuf.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const idatData = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdr),
    chunk('IDAT', idatData),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- 生成 ----------------------------------------------------------------

function writeIcon(name, size, opts) {
  const rgba = rasterize(size, opts);
  const png = encodePng(size, rgba);
  const outPath = join(ASSETS_DIR, name);
  writeFileSync(outPath, png);
  console.log(`  wrote ${name} (${size}x${size}, ${png.length} bytes)`);
}

function main() {
  mkdirSync(ASSETS_DIR, { recursive: true });
  console.log('Generating PWA raster icons into assets/ ...');
  // 透過角丸 (purpose any)。角丸半径 112 は icon.svg と同じ (論理 512 基準)。
  writeIcon('icon-192.png', 192, { radius: 112 });
  writeIcon('icon-512.png', 512, { radius: 112 });
  // maskable: 全面背景 + モチーフを 0.64 倍で中央寄せ (icon-maskable.svg と同じ)。
  writeIcon('icon-maskable-512.png', 512, { maskable: true });
  // apple-touch: 不透明背景 (iOS が黒背景を付けない)。角丸は iOS 側でマスクされる。
  writeIcon('apple-touch-icon.png', 180, { opaqueBg: true });
  console.log('Done.');
}

main();
