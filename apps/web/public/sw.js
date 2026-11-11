/* HEXTRA service worker — enables installability and web push. Intentionally does NOT cache app
 * responses (no offline/stale-app risk); it exists for Add-to-Home-Screen and push notifications. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// A no-op fetch handler keeps the app installable; requests fall through to the network untouched.
self.addEventListener('fetch', () => {});

// Web push: show the notification the server sent (title/body/url in the payload).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || 'HEXTRA';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag,
    data: { url: data.url || '/pass' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Focus an existing tab for the target url, or open a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/pass';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : undefined;
    }),
  );
});
