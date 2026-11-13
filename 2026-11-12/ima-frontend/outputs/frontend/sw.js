/* ima 复刻版 · Service Worker
   策略：
   - 静态壳（index.html / assets / icon / manifest）预缓存，离线可用
   - 导航请求 network-first，失败回退到缓存的 index.html
   - /api/ 下的请求永不缓存，一律直连网络（数据必须新鲜）
   - 版本号变更时清掉上一版缓存 */

var VERSION = 'ima-fe-v1';
var SHELL = [
  './',
  './index.html',
  './assets/app.css',
  './assets/md.js',
  './assets/app.js',
  './icon.svg',
  './manifest.webmanifest'
];

function abs(p) {
  return new URL(p, self.registration.scope).toString();
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (cache) {
      return Promise.all(
        SHELL.map(function (p) {
          return cache.add(new Request(abs(p), { cache: 'reload' })).catch(function () {
            /* 单个资源失败不应阻断整体安装 */
          });
        })
      );
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) {
          if (k !== VERSION) return caches.delete(k);
        })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

function isApi(url) {
  return url.pathname.indexOf('/api/') !== -1 || /\/api$/.test(url.pathname);
}

function isShellAsset(url) {
  return /\/assets\//.test(url.pathname) ||
    /\/icon\.svg$/.test(url.pathname) ||
    /manifest\.webmanifest$/.test(url.pathname);
}

self.addEventListener('fetch', function (e) {
  var req = e.request;

  /* 只处理 GET；POST 等写操作直接交给网络 */
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  /* 跨域请求不接管 */
  if (url.origin !== self.location.origin) return;

  /* 本地服务 API：永不缓存 */
  if (isApi(url)) return;

  /* 页面导航：网络优先，离线回退壳 */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function () {
        return caches.match(abs('./index.html')).then(function (hit) {
          return hit || caches.match(abs('./')) || Response.error();
        });
      })
    );
    return;
  }

  /* 静态资源：缓存优先，后台顺手更新 */
  if (isShellAsset(url)) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(function (hit) {
        var network = fetch(req).then(function (res) {
          if (res && res.status === 200 && res.type === 'basic') {
            var copy = res.clone();
            caches.open(VERSION).then(function (c) { c.put(req, copy); });
          }
          return res;
        }).catch(function () { return hit; });
        return hit || network;
      })
    );
  }
});
