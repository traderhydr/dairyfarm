// Retires the old root-level service worker.
// Before the landing page existed, the app lived at the site root and registered a service worker here.
// That worker would keep serving the cached old app instead of this page, so this script replaces it,
// removes only the caches that belonged to it, and reloads open tabs. The app now lives in /app/ with its own worker.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const scope = self.registration.scope;
    const appScope = scope + 'app/';
    await self.registration.unregister();
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.endsWith(scope) && !key.includes(appScope)) // old root caches only
        .map((key) => caches.delete(key))
    );
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => client.navigate(client.url));
  })());
});
