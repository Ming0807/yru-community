// Service Worker for Push Notifications
const CACHE_NAME = 'yru-push-v1';

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'YRU Community';
  
  const options = {
    body: data.body || 'คุณมีการแจ้งเตือนใหม่',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: { 
      url: data.url || '/notifications',
      postId: data.postId || null,
    },
    tag: data.tag || 'default',
    renotify: true,
    actions: [
      { action: 'view', title: 'ดู', icon: '/icon-192x192.png' },
      { action: 'dismiss', title: 'ปิด' },
    ],
  };
  
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') return;
  
  const urlToOpen = event.notification.data?.url || '/notifications';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there's already a window open
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // No window open, open a new one
        return self.clients.openWindow(urlToOpen);
      })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // Handle subscription expiration
  console.log('[SW] Push subscription changed');
});
