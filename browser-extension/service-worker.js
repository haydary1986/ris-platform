// MV3 service worker — currently a no-op placeholder for future features
// (e.g., scheduled re-syncs, badge updates). Required by manifest.json.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
