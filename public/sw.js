// Service worker mínimo: hace la app instalable y deja pasar todo por la red (el contenido es en vivo).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
