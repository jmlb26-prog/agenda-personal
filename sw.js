/* =========================================================
   Agenda Personal – Service Worker (PWA)
   Permite instalar la app en el móvil y usarla sin conexión.

   Política de caché:
   - Todo se guarda en el dispositivo al instalar (modo avión).
   - Código (index, css, js) y datos.json: RED PRIMERO y caché de
     respaldo → si cambias algo en el PC, el móvil lo ve en cuanto
     haya conexión; sin conexión (o si el servidor devuelve un
     error 5xx/4xx) se usa la última copia guardada.
   - Iconos: caché primero (no cambian).

   IMPORTANTE: si modificas sw.js, sube VERSION para que los
   navegadores descarten la caché antigua.
   ========================================================= */
'use strict';

const VERSION = 'v4';
const CACHE   = 'agenda-' + VERSION;

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './datos.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.png'
];

/* --------- Instalar: guardar la aplicación en el dispositivo --------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache =>
        // tolerante: si algún fichero no está, el resto se cachea igual
        Promise.all(SHELL.map(url => cache.add(url).catch(() => {})))
      )
      .then(() => self.skipWaiting())
  );
});

/* --------- Activar: borrar cachés de versiones anteriores --------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Red primero; si no hay red O la respuesta no es válida (404/5xx),
   se sirve la copia guardada en el dispositivo. */
async function redPrimero(req, esDatos){
  try {
    const res = await fetch(req);
    if (res && res.ok){
      const copia = res.clone();
      caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
      return res;
    }
    const hit = await caches.match(req, { ignoreSearch: esDatos });
    return hit || res;                       // sin copia: se devuelve el error
  } catch (e){
    const hit = await caches.match(req, { ignoreSearch: esDatos });
    if (hit) return hit;
    throw e;
  }
}

/* --------- Peticiones --------- */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // nada de terceros

  const esDatos = url.pathname.endsWith('datos.json');
  const esCritico =
    esDatos ||
    req.mode === 'navigate' ||
    /\.(js|css|webmanifest)$/.test(url.pathname);

  if (esCritico){
    event.respondWith(redPrimero(req, esDatos));
    return;
  }

  // Iconos y resto: caché primero
  event.respondWith(
    caches.match(req).then(hit => hit || redPrimero(req, false))
  );
});
