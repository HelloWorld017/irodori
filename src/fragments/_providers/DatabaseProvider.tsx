import { useCallback, useState } from 'react';
import { buildContext } from '@/utils/context';
import { initDatabase } from '@/utils/database';
import type { Repositories } from '@/repositories';
import type { Services } from '@/services';
import type { ClxDBWithUI } from 'clxdb/ui';

const [DatabaseProvider, useDatabase] = buildContext(() => {
  const [clxDB, setClxDB] = useState<ClxDBWithUI | null>(null);
  const [repositories, setRepositories] = useState<Repositories | null>(null);
  const [services, setServices] = useState<Services | null>(null);

  const initialize = useCallback(async () => {
    const initResult = await initDatabase();
    if (!initResult) {
      return false;
    }

    setClxDB(initResult.clxDB);
    setRepositories(initResult.repositories);
    setServices(initResult.services);
    return true;
  }, []);

  return {
    clxDB,
    repositories,
    services,
    initialize,
  };
});

export { DatabaseProvider };

export const useInitializeDatabase = () => useDatabase(state => state.initialize);
export const useClxDB = () => useDatabase(state => state.clxDB);
export const useRepositories = () => useDatabase(state => state.repositories);
export const useServices = () => useDatabase(state => state.services);
