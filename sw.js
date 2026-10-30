// Service worker: makes the app open and play saved items with no connection.
// Bump VERSION whenever you deploy changes so returning visitors get them.

const VERSION = 'odeo-v11';

const APP_SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/odeo-favicon.svg',
  'assets/odeo-app-icon.svg',
  'css/tokens.css',
  'css/base.css',
  'css/layout.css',
  'css/components.css',
  'css/reader.css',
  'fonts/OpenDyslexic-Regular.woff2',
  'fonts/OpenDyslexic-Bold.woff2',
  'fonts/ComicNeue-Regular.woff2',
  'fonts/ComicNeue-Bold.woff2',
  'fonts/AtkinsonHyperlegible-Regular.woff2',
  'fonts/AtkinsonHyperlegible-Bold.woff2',
  'fonts/AtkinsonHyperlegible-Regular-ext.woff2',
  'fonts/AtkinsonHyperlegible-Bold-ext.woff2',
  'js/theme-boot.js',
  'js/main.js',
  'js/router.js',
  'js/settings.js',
  'js/speech.js',
  'js/reader.js',
  'js/text.js',
  'js/ui.js',
  'js/covers.js',
  'js/importers.js',
  'js/player-sheets.js',
  'js/settings-ui.js',
  'js/extract.js',
  'js/storage/repo.js',
  'js/storage/local-adapter.js',
  'js/views/home-view.js',
  'js/views/notes-view.js',
  'js/views/settings-view.js',
  'js/views/help-view.js',
  'js/views/text-view.js',
  'js/views/file-view.js',
  'js/views/link-view.js',
  'js/views/session-view.js',
  'js/views/library-view.js',
];

// pdf.js is large, so it's cached in the background after install rather
// than delaying it. Uploading PDFs offline then works too.
const LATER = ['vendor/pdfjs/pdf.min.mjs', 'vendor/pdfjs/pdf.worker.min.mjs'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      cache.addAll(LATER).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve from the cache straight away, and refresh the cache in the
// background ("stale-while-revalidate").
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate';
  const key = isPage ? 'index.html' : req;

  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(key, { ignoreSearch: isPage });
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      return (await network) || new Response('Offline', { status: 503, statusText: 'Offline' });
    })
  );
});
