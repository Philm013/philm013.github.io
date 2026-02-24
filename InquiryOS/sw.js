const CACHE_NAME = 'inquiryos-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './js/main.js',
  './js/core/state.js',
  './js/core/storage.js',
  './js/core/sync.js',
  './js/core/auth.js',
  './js/core/ngss.js',
  './js/core/sims.js',
  './js/ui/renderer.js',
  './js/ui/navigation.js',
  './js/ui/utils.js',
  './js/ui/media.js',
  './JSON/CONCORD_CODAP_DATA.json',
  './JSON/Concord_Interactives.json',
  './JSON/FULL_CONCORD_SEARCH.json',
  './JSON/PHET_simulations.json',
  './js/modules/questions.js',
  './js/modules/models.js',
  './js/modules/investigation.js',
  './js/modules/analysis.js',
  './js/modules/math.js',
  './js/modules/explanations.js',
  './js/modules/argument.js',
  './js/modules/communication.js',
  './js/teacher/dashboard.js',
  './js/teacher/viewer.js',
  './js/teacher/noticeboard.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://code.iconify.design/3/3.1.0/iconify.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js',
  'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
