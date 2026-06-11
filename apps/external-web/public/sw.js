if (!self.define) {
  let e,
    s = {};
  const i = (i, n) => (
    (i = new URL(i + '.js', n).href),
    s[i] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script');
          ((e.src = i), (e.onload = s), document.head.appendChild(e));
        } else ((e = i), importScripts(i), s());
      }).then(() => {
        let e = s[i];
        if (!e) throw new Error(`Module ${i} didn’t register its module`);
        return e;
      })
  );
  self.define = (n, a) => {
    const c = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (s[c]) return;
    let t = {};
    const r = (e) => i(e, c),
      u = { module: { uri: c }, exports: t, require: r };
    s[c] = Promise.all(n.map((e) => u[e] || r(e))).then((e) => (a(...e), t));
  };
}
define(['./workbox-495fd258'], function (e) {
  'use strict';
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/app-build-manifest.json', revision: '2f4c6e342fa9ac99a6d44d6fd4939910' },
        {
          url: '/_next/static/3_WgSRM9FV3NP8u82iiks/_buildManifest.js',
          revision: 'faaa18916828f796d1c86f67e67dae84',
        },
        {
          url: '/_next/static/3_WgSRM9FV3NP8u82iiks/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        {
          url: '/_next/static/chunks/1dd3208c-51f5c8d0fba304ea.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        { url: '/_next/static/chunks/222-14dfb758f952f47c.js', revision: '3_WgSRM9FV3NP8u82iiks' },
        { url: '/_next/static/chunks/28-541cfa4470f16eed.js', revision: '3_WgSRM9FV3NP8u82iiks' },
        { url: '/_next/static/chunks/452-95daf73ff3e3b37a.js', revision: '3_WgSRM9FV3NP8u82iiks' },
        { url: '/_next/static/chunks/528-e97aa42b40ece308.js', revision: '3_WgSRM9FV3NP8u82iiks' },
        { url: '/_next/static/chunks/787-824e970d7b2e9b3f.js', revision: '3_WgSRM9FV3NP8u82iiks' },
        { url: '/_next/static/chunks/838-5e82a69b57ffa183.js', revision: '3_WgSRM9FV3NP8u82iiks' },
        { url: '/_next/static/chunks/840-11aa9421b74d78d3.js', revision: '3_WgSRM9FV3NP8u82iiks' },
        { url: '/_next/static/chunks/896-39a5761ff13f46a1.js', revision: '3_WgSRM9FV3NP8u82iiks' },
        { url: '/_next/static/chunks/956-3b9d5d9e1e0ccbe2.js', revision: '3_WgSRM9FV3NP8u82iiks' },
        { url: '/_next/static/chunks/985-779dc2e37ebdfadc.js', revision: '3_WgSRM9FV3NP8u82iiks' },
        {
          url: '/_next/static/chunks/app/_not-found/page-5450754f58f1ba6f.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/app/access-expired/page-50359bb9e246b587.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/app/auth/page-acb441d8cb1fcff5.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/app/group-archived/page-de670f6fa4e3ea73.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/app/group-completed/page-6e5f1ec5a6323a8c.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/expenses/new/page-7624072d0cd1fc77.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/layout-0eafa6e24ab92279.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/page-11fd0daf7fd0dcf3.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/settlements/new/page-25892153a34248fc.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/app/invite/%5Btoken%5D/page-52d9cb08e04123a6.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/app/layout-067a1d979c6928b9.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/app/member-removed/page-f089dc9da18c1314.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/app/page-d3a5f6db82a625de.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/app/pay/%5Btoken%5D/page-5e1266810fc4aaf2.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/app/referral/%5Bcode%5D/page-f086998b9541f972.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/framework-3664cab31236a9fa.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        { url: '/_next/static/chunks/main-adca26e7c19f12b2.js', revision: '3_WgSRM9FV3NP8u82iiks' },
        {
          url: '/_next/static/chunks/main-app-82c8a1578d5acfa6.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/pages/_app-10a93ab5b7c32eb3.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/pages/_error-2d792b2a41857be4.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-710a5d9c89e3be64.js',
          revision: '3_WgSRM9FV3NP8u82iiks',
        },
        { url: '/_next/static/css/780c1658b22b5bcd.css', revision: '780c1658b22b5bcd' },
        { url: '/icons/apple-icon-180x180.png', revision: '459b6b2e78fa623db4ce38232ef4b134' },
        { url: '/icons/icon-128x128.png', revision: '8acc8b1b0cfc1703c5387c98684fbf9d' },
        { url: '/icons/icon-144x144.png', revision: '9e0b751c4f52ea5cb39a42388a80d214' },
        { url: '/icons/icon-152x152.png', revision: '5a36193d4f8c5b93359e37f81ddc38b8' },
        { url: '/icons/icon-180x180.png', revision: '459b6b2e78fa623db4ce38232ef4b134' },
        { url: '/icons/icon-192x192.png', revision: '9ffc3fe8bf06d0d742d9e2ebb33df46b' },
        { url: '/icons/icon-384x384.png', revision: '58aa39f3d96e75f3f391a07d8da5d01b' },
        { url: '/icons/icon-512x512.png', revision: '891a8bf27af8af01dbce773bc5c30832' },
        { url: '/icons/icon-72x72.png', revision: '2db4d0ca3d53dedd85a3bf6ffab9edc3' },
        { url: '/icons/icon-96x96.png', revision: '287c8c32f7a46a8a1dc7eea280e19fc8' },
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
            cacheWillUpdate: async ({ request: e, response: s, event: i, state: n }) =>
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
