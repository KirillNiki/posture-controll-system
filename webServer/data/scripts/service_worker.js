
const staticDevCache = 'dev-posture-controll-sys-v1'
const assets = [
    '/',
    '/index.html',
    '/style.css',
    '/scripts/app.js',
    '/scripts/logic.js',

    '/icons/logo-192.png',
    '/icons/logo-512.png',
    '/icons/logo.svg',
]


self.addEventListener("install", installEvent => {
    installEvent.waitUntil(
        caches.open(staticDevCache).then(cache => {
            cache.addAll(assets)
        })
    )
})


self.addEventListener("fetch", fetchEvent => {
    fetchEvent.respondWith(
        caches.match(fetchEvent.request).then(res => {
            return res || fetch(fetchEvent.request)
        })
    )
})
