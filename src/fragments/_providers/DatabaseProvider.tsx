import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useLocation } from 'wouter';
import { buildContext } from '@/utils/context';
import { initDatabase } from '@/utils/database';
import { createTaggedError, isTaggedError } from '@/utils/error';
import { buildRoute } from '@/utils/route';
import { useShowToast } from './ToastProvider';
import type { Repositories } from '@/repositories';
import type { Services } from '@/services';
import type { ClxDBWithUI } from 'clxdb/ui';
import type { ReactNode } from 'react';

const [DatabaseProviderInternal, useDatabase] = buildContext(() => {
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

  return {
    clxDB,
    repositories,
    services,
    initialize,
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

  const [, navigate] = useLocation();
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
  <DatabaseProviderInternal>
    <ErrorBoundary FallbackComponent={DatabaseError}>{children}</ErrorBoundary>
  </DatabaseProviderInternal>
);

export const useInitializeDatabase = () => useDatabase(state => state.initialize);
export const useClxDB = () => {
  const clxdb = useDatabase(state => state.clxDB);
  return assertsInitialized(clxdb);
};

export const useRepositories = () => {
  const repositories = useDatabase(state => state.repositories);
  return assertsInitialized(repositories);
};

export const useServices = () => {
  const services = useDatabase(state => state.services);
  return assertsInitialized(services);
};
