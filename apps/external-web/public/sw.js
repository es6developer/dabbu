if (!self.define) {
  let e,
    s = {};
  const n = (n, t) => (
    (n = new URL(n + '.js', t).href),
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
  self.define = (t, a) => {
    const c = e || ('document' in self ? document.currentScript.src : '') || location.href;
    if (s[c]) return;
    let i = {};
    const r = (e) => n(e, c),
      o = { module: { uri: c }, exports: i, require: r };
    s[c] = Promise.all(t.map((e) => o[e] || r(e))).then((e) => (a(...e), i));
  };
}
define(['./workbox-495fd258'], function (e) {
  'use strict';
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        { url: '/_next/app-build-manifest.json', revision: 'bc3f66fb9d670259cd8d2be2851bba84' },
        {
          url: '/_next/static/JOHFzHlR5FznbdcxbNjJx/_buildManifest.js',
          revision: 'faaa18916828f796d1c86f67e67dae84',
        },
        {
          url: '/_next/static/JOHFzHlR5FznbdcxbNjJx/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        {
          url: '/_next/static/chunks/1dd3208c-8a6d6fee0c3ff8d3.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        { url: '/_next/static/chunks/222-76a779cf640d4463.js', revision: 'JOHFzHlR5FznbdcxbNjJx' },
        { url: '/_next/static/chunks/28-04ae8808c22c279f.js', revision: 'JOHFzHlR5FznbdcxbNjJx' },
        { url: '/_next/static/chunks/528-f170de7797379adf.js', revision: 'JOHFzHlR5FznbdcxbNjJx' },
        { url: '/_next/static/chunks/787-e0638077583b1ae0.js', revision: 'JOHFzHlR5FznbdcxbNjJx' },
        { url: '/_next/static/chunks/838-5e82a69b57ffa183.js', revision: 'JOHFzHlR5FznbdcxbNjJx' },
        { url: '/_next/static/chunks/878-937be6191e84aa11.js', revision: 'JOHFzHlR5FznbdcxbNjJx' },
        { url: '/_next/static/chunks/896-b5921cae79030585.js', revision: 'JOHFzHlR5FznbdcxbNjJx' },
        { url: '/_next/static/chunks/956-0ce4cffa4945a215.js', revision: 'JOHFzHlR5FznbdcxbNjJx' },
        {
          url: '/_next/static/chunks/app/_not-found/page-4fa418c087366f7e.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/app/access-expired/page-14cd07ce1f1ebdef.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/app/auth/page-459e38601ddb0dfa.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/app/group-archived/page-eb0657b780946f2a.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/app/group-completed/page-bc48bfa36212ba22.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/expenses/new/page-f03b403fd76850bd.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/layout-d8ff292119da9ca1.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/page-4f3e426e911d2a97.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/app/groups/%5Bid%5D/settlements/new/page-a8942afec272d0e7.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/app/invite/%5Btoken%5D/page-b0a2c2c2a9a56280.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/app/layout-e3384e318a76033d.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/app/member-removed/page-e1e779f9261de19a.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/app/page-21536e21916b557f.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/framework-3664cab31236a9fa.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        { url: '/_next/static/chunks/main-962c1e33da588e82.js', revision: 'JOHFzHlR5FznbdcxbNjJx' },
        {
          url: '/_next/static/chunks/main-app-82c8a1578d5acfa6.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/pages/_app-10a93ab5b7c32eb3.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/pages/_error-2d792b2a41857be4.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-9b0250bdeab52306.js',
          revision: 'JOHFzHlR5FznbdcxbNjJx',
        },
        { url: '/_next/static/css/17830a42706e95c8.css', revision: '17830a42706e95c8' },
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
            cacheWillUpdate: async ({ request: e, response: s, event: n, state: t }) =>
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
