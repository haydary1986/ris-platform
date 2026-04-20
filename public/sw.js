/* eslint-disable */
// Service worker for Web Push notifications.
//
// Lives at /public/sw.js so it gets served from the site origin (required
// for the browser to register it with the Push API). Scope is the root.
//
// Behaviour:
//   * push event  — render a notification from the server's JSON payload
//   * click event — focus an existing tab or open a new one at payload.url
//
// Kept plain-JS because Next.js doesn't compile files under /public.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'RIS', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'AL-Turath RIS';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag,
    data: { url: data.url || '/' },
    dir: data.dir || 'auto',
    lang: data.lang,
    requireInteraction: Boolean(data.requireInteraction),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      // Focus an already-open tab on the target URL if one exists.
      for (const client of all) {
        if (client.url.includes(target) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise focus any existing tab and navigate it.
      if (all.length > 0 && 'navigate' in all[0]) {
        await all[0].navigate(target);
        return all[0].focus();
      }
      // Else open a fresh tab.
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
    })(),
  );
});
