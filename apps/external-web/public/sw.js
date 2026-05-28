if (!self.define) {
  let e,
    n = {};
  const s = (s, i) => (
    (s = new URL(s + '.js', i).href),
    n[s] ||
      new Promise((n) => {
        if ('document' in self) {
          const e = document.createElement('script');
          ((e.src = s), (e.onload = n), document.head.appendChild(e));
        } else ((e = s), importScripts(s), n());
      }).then(() => {
        let e = n[s];
        if (!e) throw new Error(`Module ${s} didn’t register its module`);
        return e;
      })
  );
  self.define = (i, t) => {
    const a = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (n[a]) return;
    let c = {};
    const o = (e) => s(e, a),
      u = { module: { uri: a }, exports: c, require: o };
    n[a] = Promise.all(i.map((e) => u[e] || o(e))).then((e) => (t(...e), c));
  };
}
define(['./workbox-495fd258'], function (e) {
  'use strict';
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/app-build-manifest.json', revision: 'ccf0a28be60213fff4b46d718935c615' },
        {
          url: '/_next/static/chunks/1dd3208c-8a6d6fee0c3ff8d3.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        { url: '/_next/static/chunks/28-04ae8808c22c279f.js', revision: 'i1qnnhEZLAyk2pWYHuxXo' },
        { url: '/_next/static/chunks/528-f170de7797379adf.js', revision: 'i1qnnhEZLAyk2pWYHuxXo' },
        { url: '/_next/static/chunks/688-ad72fe833f32de88.js', revision: 'i1qnnhEZLAyk2pWYHuxXo' },
        { url: '/_next/static/chunks/787-e0638077583b1ae0.js', revision: 'i1qnnhEZLAyk2pWYHuxXo' },
        { url: '/_next/static/chunks/838-5e82a69b57ffa183.js', revision: 'i1qnnhEZLAyk2pWYHuxXo' },
        { url: '/_next/static/chunks/846-bc412c976e90924c.js', revision: 'i1qnnhEZLAyk2pWYHuxXo' },
        { url: '/_next/static/chunks/956-0ce4cffa4945a215.js', revision: 'i1qnnhEZLAyk2pWYHuxXo' },
        {
          url: '/_next/static/chunks/app/_not-found/page-4fa418c087366f7e.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/app/access-expired/page-14cd07ce1f1ebdef.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/app/auth/page-aeb32b0cf11d0440.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/app/group-archived/page-eb0657b780946f2a.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/app/group-completed/page-bc48bfa36212ba22.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/expenses/new/page-79a11d4f09665afa.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/layout-d8ff292119da9ca1.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/page-73466e948b750422.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/settlements/new/page-be7531bdf1abf8aa.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/app/invite/%5Btoken%5D/page-22ed3ddf63b6873c.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/app/layout-96ca8d91c34d41cb.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/app/member-removed/page-e1e779f9261de19a.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/app/page-6e726aa0b33051ac.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/framework-3664cab31236a9fa.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        { url: '/_next/static/chunks/main-962c1e33da588e82.js', revision: 'i1qnnhEZLAyk2pWYHuxXo' },
        {
          url: '/_next/static/chunks/main-app-82c8a1578d5acfa6.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/pages/_app-10a93ab5b7c32eb3.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/pages/_error-2d792b2a41857be4.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-9b0250bdeab52306.js',
          revision: 'i1qnnhEZLAyk2pWYHuxXo',
        },
        { url: '/_next/static/css/9cb5377f18ae7656.css', revision: '9cb5377f18ae7656' },
        {
          url: '/_next/static/i1qnnhEZLAyk2pWYHuxXo/_buildManifest.js',
          revision: 'faaa18916828f796d1c86f67e67dae84',
        },
        {
          url: '/_next/static/i1qnnhEZLAyk2pWYHuxXo/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
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
            cacheWillUpdate: async ({ request: e, response: n, event: s, state: i }) =>
              n && 'opaqueredirect' === n.type
                ? new Response(n.body, { status: 200, statusText: 'OK', headers: n.headers })
                : n,
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
        const n = e.pathname;
        return !n.startsWith('/api/auth/') && !!n.startsWith('/api/');
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
