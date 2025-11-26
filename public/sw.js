// Service Worker for Push Notifications
const CACHE_NAME = 'ibrahem-system-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_CACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'إشعار جديد',
    body: 'لديك إشعار جديد',
    icon: '/logo.png',
    badge: '/logo.png',
    tag: 'notification',
    requireInteraction: false,
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || data.notification_type || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        data: data.data || {}
      };
    } catch (e) {
      notificationData.body = event.data.text() || notificationData.body;
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction,
    data: notificationData.data,
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'فتح',
        icon: '/logo.png'
      },
      {
        action: 'close',
        title: 'إغلاق',
        icon: '/logo.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If there's already a window open, focus it
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Background sync event (for offline operations)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      // Sync notifications logic here
      Promise.resolve()
    );
  }
});

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

