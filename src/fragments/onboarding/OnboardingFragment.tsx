import { useCallback, useEffect, useState } from 'react';
import { match } from 'ts-pattern';
import { useLocation } from 'wouter';
import { buildRoute } from '@/utils/route';
import { useInitializeDatabase, useRepositories } from '../_providers/DatabaseProvider';

type OnboardingStatus = 'idle' | 'starting' | 'ready' | 'error';

const getButtonLabel = (status: OnboardingStatus): string =>
  match(status)
    .with('idle', () => '시작하기')
    .with('starting', () => '시작 중...')
    .with('ready', () => '준비 완료')
    .with('error', () => '다시 시도하기')
    .exhaustive();

type OnboardingViewProps = {
  buttonLabel: string;
  disabled: boolean;
  onStart: () => void;
};

export const OnboardingFragment = () => {
  const [status, setStatus] = useState<OnboardingStatus>('idle');
  const initialize = useInitializeDatabase();

  const handleStart = useCallback(async () => {
    if (status === 'starting' || status === 'ready') {
      return;
    }

    setStatus('starting');

    try {
      const success = await initialize();
      setStatus(success ? 'ready' : 'idle');
    } catch {
      setStatus('error');
    }
  }, [initialize, status]);

  const repositories = useRepositories();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (repositories) {
      navigate(buildRoute('shelf'), { replace: true });
    }
  }, [repositories, navigate]);

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center gap-8
        overflow-hidden px-8 py-12 sm:gap-7 sm:px-6"
    ></main>
  );
};
