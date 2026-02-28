import { startClxDBWithUI } from 'clxdb/ui';
import { ClxDBAdapter } from './clxdbAdapter';
import type { Repositories } from '@/repositories';

type ClxDBClient = NonNullable<Awaited<ReturnType<typeof startClxDBWithUI>>>;

let initPromise: Promise<{ clxDB: ClxDBClient; repositories: Repositories } | null> | null = null;
let clxDBAdapter: ClxDBAdapter | null = null;

const getClxDBAdapter = () => {
  if (clxDBAdapter) {
    return clxDBAdapter;
  }

  clxDBAdapter = new ClxDBAdapter();
  return clxDBAdapter;
};

export const initClxDB = async (): Promise<{
  clxDB: ClxDBClient;
  repositories: Repositories;
} | null> => {
  if (initPromise) {
    return initPromise;
  }

  const adapter = getClxDBAdapter();
  initPromise = startClxDBWithUI({ database: adapter })
    .then(clxDB => {
      if (!clxDB) {
        initPromise = null;
        return null;
      }

      return {
        clxDB,
        repositories: adapter.getRepositories(),
      };
    })
    .catch((error: Error) => {
      initPromise = null;
      return Promise.reject(error);
    });

  return initPromise;
};
