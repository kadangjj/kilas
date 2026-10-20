/* Zippy service worker: kerangka aplikasi tersimpan offline; API, video, dan unggahan selalu dari jaringan */
const V = 'zippy-v15', SHELL = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'css/app.css', 'css/themes.css',
  'js/icons.js', 'js/core.js', 'js/beranda.js', 'js/audio.js', 'js/profile.js', 'js/search.js', 'js/story.js', 'js/editor.js', 'js/post.js', 'js/pesan.js', 'js/notif.js', 'js/settings.js', 'js/boot.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())) });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && (k.startsWith('kilas-') || k.startsWith('zippy-'))).map(k => caches.delete(k)))).then(() => self.clients.claim())) });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || r.headers.has('range')) return;
  if (u.origin !== location.origin) {
    if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) e.respondWith(caches.open(V).then(async c => { const h = await c.match(r), n = fetch(r).then(x => { c.put(r, x.clone()); return x }).catch(() => h); return h || n }));
    return;
  }
  if (u.pathname.startsWith('/api/') || u.pathname.includes('/uploads/') || u.pathname.endsWith('/admin.html') || u.pathname.endsWith('/admin') || u.pathname.endsWith('/sistem.html') || u.pathname.endsWith('/sistem')) return;
  e.respondWith(fetch(r).then(x => { if (x.ok) { const c = x.clone(); caches.open(V).then(ch => ch.put(r, c)) } return x }).catch(() => caches.match(r).then(h => h || caches.match('index.html'))));
});
