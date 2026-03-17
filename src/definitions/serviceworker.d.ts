interface PrecacheEntry {
  integrity?: string;
  url: string;
  revision?: string | null;
}

declare global {
  interface ServiceWorkerGlobalScope {
    __MANIFEST: Array<PrecacheEntry>;
  }
}

export {};
