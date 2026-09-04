/*
 * Service Worker for AWS Study Navigator (PWA)
 *
 * 戦略:
 *  - App Shell (HTML / JS モジュール / manifest / ローカル vendor / アイコン) を
 *    インストール時にプリキャッシュする。
 *  - fetch は same-origin の GET のみ stale-while-revalidate で処理する。
 *    キャッシュがあれば即返しつつ裏でネットワーク更新するため、オフラインでも動作し、
 *    オンライン時は次回アクセスで最新化される。
 *  - CDN 由来 (Tailwind / Chart.js / Font Awesome 等) のクロスオリジン要求は
 *    Service Worker で握らず、ブラウザ標準のネットワーク処理に委ねる。
 *    これによりキャッシュ失敗が致命的にならない。
 *  - CACHE_VERSION を上げると activate で旧キャッシュが削除され、更新が反映される。
 */

const CACHE_VERSION = 'v3';
const CACHE_NAME = `aws-study-nav-${CACHE_VERSION}`;

// スコープ (登録元ディレクトリ) を基準にした相対パス。
// GitHub Pages のサブディレクトリ配信でも動作するよう "./" 起点にする。
//
// 大きなラスター画像 (assets/og/*.png は各 ~8-9MB) は install 時の
// プリキャッシュから意図的に除外している。install 完了前に約8MBの
// ダウンロードを強制すると PWA インストールが遅くなるため (refs #80)。
// 実行時に要求された画像は fetch の stale-while-revalidate で都度キャッシュされる。
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './js/app.js',
  './js/ai.js',
  './js/chat.js',
  './js/config.js',
  './js/exams.js',
  './js/gemini.js',
  './js/geminiBatch.js',
  './js/i18n.js',
  './js/milestones.js',
  './js/openai.js',
  './js/quiz.js',
  './js/storage.js',
  './js/ui.js',
  './js/utils.js',
  './js/votes.js',
  './js/locales/en.json',
  './js/locales/ja.json',
  './js/locales/urls.json',
  './assets/vendor/marked.min.js',
  './assets/vendor/purify.min.js',
  './assets/icon.svg',
  './assets/icon-maskable.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 個々の失敗が install 全体を失敗させないよう、1件ずつ追加する。
      await Promise.all(
        APP_SHELL.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {
            /* 取得失敗は無視 (オフライン初回等) */
          })
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('aws-study-nav-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // GET 以外や same-origin 以外 (CDN 等) は SW で処理しない。
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(staleWhileRevalidate(request));
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      // 正常なレスポンスのみキャッシュを更新する。
      if (response && response.ok && response.type === 'basic') {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    // 裏で更新しつつキャッシュを即返す。
    return cached;
  }

  const network = await networkFetch;
  if (network) return network;

  // ナビゲーション要求のオフラインフォールバックとして index.html を返す。
  if (request.mode === 'navigate') {
    const shell = await cache.match('./index.html');
    if (shell) return shell;
  }

  return Response.error();
}
