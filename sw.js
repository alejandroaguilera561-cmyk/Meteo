// =====================================================
// SERVICE WORKER - CONTROL DE CACHÉ ULTRA ESTRICTO v4
// =====================================================

// Al cambiar el nombre de la caché, obligamos al celular a actualizarse sí o sí
const CACHE_NAME = 'pronostico-zap-cache-v4';

const urlsToCache = [
  '/',
  '/index.html',
  '/app-v2.js', // Aseguramos que registre el nuevo archivo de lógica
  '/manifest.json'
];

// Instalar el Service Worker y almacenar archivos esenciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Archivando nueva telemetría en caché...');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Fuerza al nuevo SW a activarse de inmediato
  );
});

// Activar y LIMPIAR por completo cualquier caché vieja que esté molestando
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('SW: Eliminando caché vieja obsoleta:', cacheName);
            return caches.delete(cacheName); // Borra las versiones viejas del celular
          }
        })
      );
    }).then(() => self.clients.claim()) // Toma el control de la app inmediatamente
  );
});

// Interceptar peticiones para servir desde caché (excepto llamadas a la API de Open-Meteo)
self.addEventListener('fetch', event => {
  // Si la petición es para la API del clima, que vaya siempre a internet directo para dar datos exactos
  if (event.request.url.includes('api.open-meteo.com') || event.request.url.includes('geocoding-api')) {
    return event.respondWith(fetch(event.request));
  }

  // Para el resto de archivos (diseño, iconos, fuentes), usa la estrategia Cache First / Network Fallback
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Retorna el archivo limpio y nuevo de la caché
        }
        return fetch(event.request);
      })
  );
});
