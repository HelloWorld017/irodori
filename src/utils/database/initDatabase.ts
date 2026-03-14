import { startClxDBWithUI } from 'clxdb/ui';
import { NAMESPACE } from '@/constants/common';
import { initRepositories } from '@/repositories/_utils/initRepositories';
import { initServices } from '@/services/_utils/initServices';
import { ClxDBAdapter } from './clxdbAdapter';
import type { Repositories } from '@/repositories';
import type { Services } from '@/services';
import type { ClxDBWithUI } from 'clxdb/ui';

type DatabaseInitResult = {
  clxDB: ClxDBWithUI;
  repositories: Repositories;
  services: Services;
};

let initPromise: Promise<DatabaseInitResult | null> | null = null;
let clxDBAdapter: ClxDBAdapter | null = null;

const getClxDBAdapter = () => {
  if (clxDBAdapter) {
    return clxDBAdapter;
  }

  clxDBAdapter = new ClxDBAdapter(async uuid => {
    const repositories = await initRepositories(uuid);
    const services = initServices(repositories);

    return { repositories, services };
  });

  return clxDBAdapter;
};

export const initDatabase = async (): Promise<DatabaseInitResult | null> => {
  if (initPromise) {
    return initPromise;
  }

  const adapter = getClxDBAdapter();
  initPromise = startClxDBWithUI({
    database: adapter,
    options: { cacheStorageKey: NAMESPACE, syncInterval: 5 * 1000 },
    ui: {
      locale: 'ko',
      style: { fontFamily: 'var(--font-sans)', palette: 'var(--color-highlight)' },
      theme: 'light',
    },
  })
    .then(clxDB => {
      if (!clxDB) {
        initPromise = null;
        return null;
      }

      return {
        clxDB,
        repositories: adapter.getRepositories(),
        services: adapter.getServices(),
      };
    })
    .catch((error: Error) => {
      initPromise = null;
      return Promise.reject(error);
    });

  return initPromise;
};
