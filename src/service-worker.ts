import { NAMESPACE } from './constants/common';

declare let self: ServiceWorkerGlobalScope;

const CACHE_NAME = `${NAMESPACE}__cache_v1`;
const COEP_REQUIRED_DESTINATIONS = new Set([
  'document',
  'iframe',
  'frame',
  'worker',
  'sharedworker',
  'serviceworker',
  'audioworklet',
  'paintworklet',
]);

const handleCrossOriginIsolation = async (
  request: Request,
  response: Response
): Promise<Response> => {
  if (!response) {
    return response;
  }

  if (COEP_REQUIRED_DESTINATIONS.has(request.destination)) {
    const newHeaders = new Headers(response.headers);

    newHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
    newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');

    return Promise.resolve(
      new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })
    );
  }

  return response;
};

const manifest = self.__MANIFEST;
self.addEventListener('install', () => {
  void caches.open(CACHE_NAME).then(cache => {
    cache.addAll(manifest.map(entry => entry.url)).catch(console.error);
  });
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames.map(async name => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const response = (async () => {
    let response = await caches.match(request);
    if (!response) {
      response = await fetch(request);
    }

    return handleCrossOriginIsolation(request, response);
  })();

  event.respondWith(response);
});

self.addEventListener('message', event => {
  const data: unknown = event.data;

  if (!data || typeof data !== 'object' || !('type' in data)) {
    return;
  }

  if (data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});
