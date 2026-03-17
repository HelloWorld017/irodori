import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute, addPlugins } from 'workbox-precaching';
import type { WorkboxPlugin } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

const coepRequiredSet = new Set([
  'document',
  'iframe',
  'frame',
  'worker',
  'sharedworker',
  'serviceworker',
  'audioworklet',
  'paintworklet',
]);

const crossOriginIsolationPlugin: WorkboxPlugin = {
  handlerWillRespond: async ({ request, response }) => {
    if (!response) {
      return response;
    }

    if (coepRequiredSet.has(request.destination)) {
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
  },
};

clientsClaim();
addPlugins([crossOriginIsolationPlugin]);
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener('message', event => {
  const data: unknown = event.data;

  if (!data || typeof data !== 'object' || !('type' in data)) {
    return;
  }

  if (data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});
