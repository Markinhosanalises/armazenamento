const CACHE_NOME = 'painel-central-v1';
const ARQUIVOS_CACHE = [
  '/index.html',
  '/painel.html',
  '/painel.js',
  '/firebase-config.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) => {
      return Promise.all(
        nomes.filter((nome) => nome !== CACHE_NOME).map((nome) => caches.delete(nome))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  // Não faz cache de chamadas ao Firebase - sempre busca dados atualizados
  if (evento.request.url.includes('firebaseio.com') || evento.request.url.includes('googleapis.com')) {
    return;
  }

  evento.respondWith(
    caches.match(evento.request).then((respostaCache) => {
      return respostaCache || fetch(evento.request);
    })
  );
});
