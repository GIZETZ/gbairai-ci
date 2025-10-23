
const CACHE_NAME = 'gbairai-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/auth',
  '/map',
  '/feed',
  '/messages',
  '/profile',
  '/static/css/main.css',
  '/static/js/main.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - stratégie network-first pour API, cache-first pour assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Static assets - cache first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|webp)$/)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Default handling
  event.respondWith(
    caches.match(request)
      .then((response) => {
        return response || fetch(request);
      })
  );
});

// Handle API requests
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.status === 200 && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      // Cache seulement certaines API pour l'offline
      if (request.url.includes('/api/gbairais') || 
          request.url.includes('/api/user') || 
          request.url.includes('/api/notifications')) {
        cache.put(request, response.clone());
      }
    }
    
    return response;
  } catch (error) {
    console.log('Requête réseau échouée, essai cache:', error);
    
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    return new Response(
      JSON.stringify({
        error: 'Réseau indisponible',
        message: 'Vous êtes hors ligne. Consultez les données en cache.'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Asset non disponible hors ligne', { status: 404 });
  }
}

// Handle navigation
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const indexResponse = await caches.match('/');
    if (indexResponse) {
      return indexResponse;
    }
    
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Gbairai - Hors ligne</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: linear-gradient(135deg, #F7C948, #1D3557);
              color: white;
              text-align: center;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: rgba(255,255,255,0.1);
              padding: 40px;
              border-radius: 20px;
              backdrop-filter: blur(10px);
              max-width: 400px;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              margin-bottom: 10px;
            }
            .retry-btn {
              background: #F7C948;
              color: #1D3557;
              border: none;
              padding: 12px 24px;
              border-radius: 10px;
              cursor: pointer;
              font-size: 16px;
              font-weight: bold;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🌍</div>
            <h1>Gbairai</h1>
            <p>Vous êtes hors ligne. Consultez vos données en cache ou reconnectez-vous.</p>
            <button class="retry-btn" onclick="window.location.reload()">
              Réessayer
            </button>
          </div>
        </body>
      </html>`,
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Nouveau message sur Gbairai',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      ...data.data
    },
    actions: [
      {
        action: 'view',
        title: 'Voir',
        icon: '/icons/icon-48x48.png'
      },
      {
        action: 'dismiss',
        title: 'Ignorer',
        icon: '/icons/icon-48x48.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Gbairai', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    console.log('Synchronisation en arrière-plan...');
    // Sync des données importantes
    const cache = await caches.open(CACHE_NAME);
    await cache.add('/api/notifications');
    await cache.add('/api/gbairais?limit=10');
  } catch (error) {
    console.log('Erreur sync:', error);
  }
}

// Message handling
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'UPDATE_BADGE') {
    const count = event.data.count;
    if ('setAppBadge' in self) {
      self.setAppBadge(count > 0 ? count : undefined);
    }
  }
});
