if (!self.define) {
  let e,
    s = {};
  const t = (t, n) => (
    (t = new URL(t + '.js', n).href),
    s[t] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script');
          ((e.src = t), (e.onload = s), document.head.appendChild(e));
        } else ((e = t), importScripts(t), s());
      }).then(() => {
        let e = s[t];
        if (!e) throw new Error(`Module ${t} didn’t register its module`);
        return e;
      })
  );
  self.define = (n, a) => {
    const i = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (s[i]) return;
    let c = {};
    const r = (e) => t(e, i),
      o = { module: { uri: i }, exports: c, require: r };
    s[i] = Promise.all(n.map((e) => o[e] || r(e))).then((e) => (a(...e), c));
  };
}
define(['./workbox-495fd258'], function (e) {
  'use strict';
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/app-build-manifest.json', revision: '0e92fd0b3599b35e5115e0765b29dc4b' },
        {
          url: '/_next/static/chunks/1dd3208c-3b8f8c4a3f4cfe9f.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        { url: '/_next/static/chunks/222-354f9b644a3e28a6.js', revision: 't_BPzLXPLKKtbqGDKI7y0' },
        { url: '/_next/static/chunks/28-fc9106240881c2c5.js', revision: 't_BPzLXPLKKtbqGDKI7y0' },
        { url: '/_next/static/chunks/528-e705f4edff1ad574.js', revision: 't_BPzLXPLKKtbqGDKI7y0' },
        { url: '/_next/static/chunks/787-9eb5bf6bd836ec75.js', revision: 't_BPzLXPLKKtbqGDKI7y0' },
        { url: '/_next/static/chunks/838-5e82a69b57ffa183.js', revision: 't_BPzLXPLKKtbqGDKI7y0' },
        { url: '/_next/static/chunks/840-3cd5ad4e5675bc66.js', revision: 't_BPzLXPLKKtbqGDKI7y0' },
        { url: '/_next/static/chunks/896-d4a3f5ad2d126ff2.js', revision: 't_BPzLXPLKKtbqGDKI7y0' },
        { url: '/_next/static/chunks/956-852086312dca9e1f.js', revision: 't_BPzLXPLKKtbqGDKI7y0' },
        { url: '/_next/static/chunks/985-010280132d913c3f.js', revision: 't_BPzLXPLKKtbqGDKI7y0' },
        {
          url: '/_next/static/chunks/app/_not-found/page-48d12a948a41176f.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/app/access-expired/page-348ecf4dbcc24595.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/app/auth/page-aa30099ccc43b946.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/app/group-archived/page-584887e1c65379c4.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/app/group-completed/page-0cf5c777318a827b.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/expenses/new/page-c99d8f95e25a2d74.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/layout-ab488b6085486770.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/page-a422a34c6886c066.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/settlements/new/page-eb0373fd385ab011.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/app/invite/%5Btoken%5D/page-2d4acad59c6068a0.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/app/layout-067a1d979c6928b9.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/app/member-removed/page-6f4686de4c7c3aa7.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/app/page-6228dc1abd13071a.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/app/pay/%5Btoken%5D/page-321ff3b7b1c82fdc.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/app/referral/%5Bcode%5D/page-99404f149e301d3b.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/framework-3664cab31236a9fa.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        { url: '/_next/static/chunks/main-adca26e7c19f12b2.js', revision: 't_BPzLXPLKKtbqGDKI7y0' },
        {
          url: '/_next/static/chunks/main-app-82c8a1578d5acfa6.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/pages/_app-10a93ab5b7c32eb3.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/pages/_error-2d792b2a41857be4.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-710a5d9c89e3be64.js',
          revision: 't_BPzLXPLKKtbqGDKI7y0',
        },
        { url: '/_next/static/css/9e5a91fa0402c743.css', revision: '9e5a91fa0402c743' },
        {
          url: '/_next/static/t_BPzLXPLKKtbqGDKI7y0/_buildManifest.js',
          revision: 'faaa18916828f796d1c86f67e67dae84',
        },
        {
          url: '/_next/static/t_BPzLXPLKKtbqGDKI7y0/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        { url: '/icons/apple-icon-180x180.png', revision: '2039267aa5d495e9206805b160c081c0' },
        { url: '/icons/icon-128x128.png', revision: '2ba8f49d9f24449b030700cd5dbd3946' },
        { url: '/icons/icon-144x144.png', revision: 'cf8703d85b134a68d2ff9de075cdc9b9' },
        { url: '/icons/icon-152x152.png', revision: 'c8cf3f3e9040baed3f04416c9eed39fb' },
        { url: '/icons/icon-180x180.png', revision: '2039267aa5d495e9206805b160c081c0' },
        { url: '/icons/icon-192x192.png', revision: 'd8e31a4e66148ea6d53940e3aac82396' },
        { url: '/icons/icon-384x384.png', revision: 'f58203e8da4059c8cb2c11c9008f4174' },
        { url: '/icons/icon-512x512.png', revision: '93fa01f86667f37a7a1991e45e329dfc' },
        { url: '/icons/icon-72x72.png', revision: '41c8184b45a445e845a83394aba40237' },
        { url: '/icons/icon-96x96.png', revision: 'd7cb37288877b4298221c40c8f21e3e6' },
        { url: '/manifest.json', revision: 'f9f5f4314ca04a414b19528675df5d2b' },
      ],
      { ignoreURLParametersMatching: [] },
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({ request: e, response: s, event: t, state: n }) =>
              s && 'opaqueredirect' === s.type
                ? new Response(s.body, { status: 200, statusText: 'OK', headers: s.headers })
                : s,
          },
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-font-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: 'static-audio-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:mp4)$/i,
      new e.CacheFirst({
        cacheName: 'static-video-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-js-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-data',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: 'static-data-assets',
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        const s = e.pathname;
        return !s.startsWith('/api/auth/') && !!s.startsWith('/api/');
      },
      new e.NetworkFirst({
        cacheName: 'apis',
        networkTimeoutSeconds: 10,
        plugins: [new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        return !e.pathname.startsWith('/api/');
      },
      new e.NetworkFirst({
        cacheName: 'others',
        networkTimeoutSeconds: 10,
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 })],
      }),
      'GET',
    ),
    e.registerRoute(
      ({ url: e }) => !(self.origin === e.origin),
      new e.NetworkFirst({
        cacheName: 'cross-origin',
        networkTimeoutSeconds: 10,
        plugins: [new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 })],
      }),
      'GET',
    ));
});
