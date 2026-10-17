#!/usr/bin/env node
/*
 * scripts/generate-icons.mjs
 *
 * AWS Study Navigator の PWA 用ラスター PNG アイコンを SVG マスターから生成する。
 *
 * マスターは assets/icon.svg（角丸・透過）と assets/icon-maskable.svg（全面塗り・
 * セーフゾーン内モチーフ）の 2 枚だけ（#247）。デザインを変えるときは SVG を
 * 編集してこのスクリプトを再実行する。ラスタライズには devDependency の
 * Playwright（Chromium）を使うので、追加の画像ライブラリは不要。
 *
 * 実行:
 *   node scripts/generate-icons.mjs
 *
 * 生成物 (すべて assets/ 配下):
 *   - icon-192.png            192x192  透過角丸 (purpose any)        ← icon.svg
 *   - icon-512.png            512x512  透過角丸 (purpose any)        ← icon.svg
 *   - icon-maskable-512.png   512x512  全面塗り (purpose maskable)   ← icon-maskable.svg
 *   - apple-touch-icon.png    180x180  不透明 (iOS は透過部を黒く塗るため全面塗り) ← icon-maskable.svg
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, '..', 'assets');

const TARGETS = [
  { out: 'icon-192.png', src: 'icon.svg', size: 192 },
  { out: 'icon-512.png', src: 'icon.svg', size: 512 },
  { out: 'icon-maskable-512.png', src: 'icon-maskable.svg', size: 512 },
  { out: 'apple-touch-icon.png', src: 'icon-maskable.svg', size: 180 },
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const { out, src, size } of TARGETS) {
    const svg = readFileSync(join(ASSETS_DIR, src), 'utf8');
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<!doctype html><html><head><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style></head><body>${svg}</body></html>`,
    );
    await page.locator('svg').screenshot({ path: join(ASSETS_DIR, out), omitBackground: true });
    console.log(`wrote assets/${out} (${size}x${size})`);
  }
} finally {
  await browser.close();
}
