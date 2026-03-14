import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { buildContext } from '@/utils/context';
import { initDatabase } from '@/utils/database';
import { createTaggedError, isTaggedError } from '@/utils/error';
import { buildRoute } from '@/utils/route';
import { useNavigate } from './RouterProvider';
import { useShowToast } from './ToastProvider';
import type { Repositories } from '@/repositories';
import type { Services } from '@/services';
import type { ClxDBWithUI } from 'clxdb/ui';
import type { ReactNode } from 'react';

const [DatabaseContextProvider, useDatabase] = buildContext(() => {
  const [clxDB, setClxDB] = useState<ClxDBWithUI | null>(null);
  const [repositories, setRepositories] = useState<Repositories | null>(null);
  const [services, setServices] = useState<Services | null>(null);

  const showToast = useShowToast();
  const initialize = useCallback(async () => {
    try {
      const initResult = await initDatabase();
      if (!initResult) {
        return false;
      }

      setClxDB(initResult.clxDB);
      setRepositories(initResult.repositories);
      setServices(initResult.services);
      return true;
    } catch (error) {
      console.error('Failed to initialize database', error);
      showToast({
        kind: 'error',
        message: '초기화 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
      });

      return false;
    }
  }, [showToast]);

  const close = useCallback(() => {
    setClxDB(null);
    setRepositories(null);
    setServices(null);
  }, []);

  return {
    clxDB,
    repositories,
    services,
    initialize,
    close,
  };
});

type DatabaseErrorProps = {
  error: unknown;
  resetErrorBoundary: () => void;
};

const DatabaseError = ({ error, resetErrorBoundary }: DatabaseErrorProps) => {
  if (!isTaggedError('database-unavailable', error)) {
    throw error;
  }

  const navigate = useNavigate();
  const initialize = useInitializeDatabase();
  const onInitialize = useEffectEvent(async () => {
    const result = await initialize();
    if (result) {
      resetErrorBoundary();
      return;
    }

    navigate(buildRoute('onboarding'), { replace: true });
  });

  useEffect(() => {
    void onInitialize();
  }, []);

  return null;
};

const assertsInitialized = <T,>(value: T | null | undefined): T => {
  if (!value) {
    throw createTaggedError('database-unavailable', 'The database is not initialized');
  }

  return value;
};

export const DatabaseProvider = ({ children }: { children: ReactNode }) => (
  <DatabaseContextProvider>
    <ErrorBoundary FallbackComponent={DatabaseError}>{children}</ErrorBoundary>
  </DatabaseContextProvider>
);

export const useInitializeDatabase = () => useDatabase(state => state.initialize);
export const useIsDatabaseInitialized = () => !!useDatabase(state => state.repositories);
export const useCloseDatabase = () => useDatabase(state => state.close);

export const useClxDBWithoutCheck = () => useDatabase(state => state.clxDB);
export const useClxDB = () => {
  const clxDB = useClxDBWithoutCheck();
  return assertsInitialized(clxDB);
};

export const useRepositoriesWithoutCheck = () => useDatabase(state => state.repositories);
export const useRepositories = () => {
  const repositories = useRepositoriesWithoutCheck();
  return assertsInitialized(repositories);
};

export const useServicesWithoutCheck = () => useDatabase(state => state.services);
export const useServices = () => {
  const services = useServicesWithoutCheck();
  return assertsInitialized(services);
};
