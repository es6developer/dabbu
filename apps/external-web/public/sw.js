if (!self.define) {
  let e,
    s = {};
  const n = (n, c) => (
    (n = new URL(n + '.js', c).href),
    s[n] ||
      new Promise((s) => {
        if ('document' in self) {
          const e = document.createElement('script');
          ((e.src = n), (e.onload = s), document.head.appendChild(e));
        } else ((e = n), importScripts(n), s());
      }).then(() => {
        let e = s[n];
        if (!e) throw new Error(`Module ${n} didn’t register its module`);
        return e;
      })
  );
  self.define = (c, t) => {
    const i = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (s[i]) return;
    let a = {};
    const r = (e) => n(e, i),
      u = { module: { uri: i }, exports: a, require: r };
    s[i] = Promise.all(c.map((e) => u[e] || r(e))).then((e) => (t(...e), a));
  };
}
define(['./workbox-495fd258'], function (e) {
  'use strict';
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/app-build-manifest.json', revision: 'b684411700b067074dbdf35120e14d40' },
        {
          url: '/_next/static/chunks/1dd3208c-4e0b4c0f4251b6db.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        { url: '/_next/static/chunks/262-cfabc9599b9d09f0.js', revision: 'kt4DlcgfOh7T4uOPXpm6y' },
        { url: '/_next/static/chunks/29-07fa8e9874b42f8d.js', revision: 'kt4DlcgfOh7T4uOPXpm6y' },
        { url: '/_next/static/chunks/326-9e50e43fe4a9f63d.js', revision: 'kt4DlcgfOh7T4uOPXpm6y' },
        { url: '/_next/static/chunks/327-9049ff58340c91ad.js', revision: 'kt4DlcgfOh7T4uOPXpm6y' },
        { url: '/_next/static/chunks/382-73a0c3e8c55a3e85.js', revision: 'kt4DlcgfOh7T4uOPXpm6y' },
        { url: '/_next/static/chunks/528-be2707fb5cc8e64e.js', revision: 'kt4DlcgfOh7T4uOPXpm6y' },
        { url: '/_next/static/chunks/661-51ae0f267d7e3d6c.js', revision: 'kt4DlcgfOh7T4uOPXpm6y' },
        { url: '/_next/static/chunks/787-526cfc487deed37f.js', revision: 'kt4DlcgfOh7T4uOPXpm6y' },
        { url: '/_next/static/chunks/840-a3b161ce3d3e83a9.js', revision: 'kt4DlcgfOh7T4uOPXpm6y' },
        {
          url: '/_next/static/chunks/app/_not-found/page-c112ed0fd4c864e7.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/access-expired/page-a9de42651a1acfe7.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/auth/page-f058d9db120fcf2a.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/group-archived/page-b30107e0d2e2d4da.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/group-completed/page-2751726ecab06791.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/expenses/new/page-f7775bcb8e51b1bd.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/layout-d2ebb3fa3c398c58.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/page-0fdcf900bb7b35f5.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/settlements/new/page-43c6e33a722e7bf1.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/i/%5Btoken%5D/page-adc1e85e09dfd2cf.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/invite/%5Btoken%5D/page-4a47a717c43a5734.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/layout-ee0ea0ea360b879d.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/member-removed/page-64e5a16f3314fa2f.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/page-4406c94073b03020.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/pay/%5Btoken%5D/page-c8d791c0625ac956.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/app/referral/%5Bcode%5D/page-c5d7721859392c07.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/framework-3664cab31236a9fa.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        { url: '/_next/static/chunks/main-62c0166e021cd5f7.js', revision: 'kt4DlcgfOh7T4uOPXpm6y' },
        {
          url: '/_next/static/chunks/main-app-82c8a1578d5acfa6.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/pages/_app-10a93ab5b7c32eb3.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/pages/_error-2d792b2a41857be4.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-163a2522e5bd282f.js',
          revision: 'kt4DlcgfOh7T4uOPXpm6y',
        },
        { url: '/_next/static/css/1b43f87e5e7dc819.css', revision: '1b43f87e5e7dc819' },
        {
          url: '/_next/static/kt4DlcgfOh7T4uOPXpm6y/_buildManifest.js',
          revision: 'faaa18916828f796d1c86f67e67dae84',
        },
        {
          url: '/_next/static/kt4DlcgfOh7T4uOPXpm6y/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        { url: '/icons/apple-icon-180x180.png', revision: '5fd849c12464a92fa973760449439128' },
        { url: '/icons/icon-128x128.png', revision: '2b98b019b26dc75b1cfb33a45bc30e0e' },
        { url: '/icons/icon-144x144.png', revision: 'ca047abdd3cee2a4c48710bb2b71954a' },
        { url: '/icons/icon-152x152.png', revision: 'f602fbeb553c4a52b6a7f6f9f6c6a228' },
        { url: '/icons/icon-180x180.png', revision: '5fd849c12464a92fa973760449439128' },
        { url: '/icons/icon-192x192.png', revision: '1f3594da3968b37d93b986ee5373e967' },
        { url: '/icons/icon-384x384.png', revision: '83187954dc818a23a66093b2d8ebe86b' },
        { url: '/icons/icon-512x512.png', revision: '4680db242feed1d9c72685e8022c9f55' },
        { url: '/icons/icon-72x72.png', revision: '03800082af8dcfe520bc1908c92f8ef8' },
        { url: '/icons/icon-96x96.png', revision: 'a1b8fa04b5a468f9a9c2a67cc4aff78a' },
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
            cacheWillUpdate: async ({ request: e, response: s, event: n, state: c }) =>
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
