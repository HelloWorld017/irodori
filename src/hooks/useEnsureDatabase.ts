import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useRepositories } from '@/fragments/_providers/DatabaseProvider';
import { buildRoute } from '@/utils/route';

export const useEnsureDatabase = () => {
  const repositories = useRepositories();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!repositories) {
      navigate(buildRoute('onboarding'), { replace: true });
    }
  }, [navigate, repositories]);
};
