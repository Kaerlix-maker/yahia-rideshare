// Yahia service worker: network-first for the app's own files only.
// Firebase, maps and CDNs are never touched (always live).
const CACHE = 'yahia-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys()
        .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;   // Firebase / tiles / CDNs: not our business
    e.respondWith(
        // no-cache: always ask GitHub for the newest file (otherwise the phone may keep an old copy ~10 min)
        fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
            if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
            return res;
        }).catch(() => caches.match(req, { ignoreSearch: true })
            .then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
            .then(hit => hit || new Response('', { status: 504 })))
    );
});
