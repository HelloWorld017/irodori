import { useCallback, useEffect, useState } from 'react';
import { match } from 'ts-pattern';
import { useLocation } from 'wouter';
import ImageLogo from '@/assets/images/logo.svg';
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

const OnboardingView = ({ buttonLabel, disabled, onStart }: OnboardingViewProps) => (
  <main
    className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 sm:px-8"
  >
    <section
      className="w-full max-w-[26rem] rounded-[2rem] bg-elevated-background
        bg-[radial-gradient(circle_at_65%_0,_rgba(253,187,45,0.8)_0%,_transparent_55%)] p-5
        shadow-elevated ring-1 ring-border-subtle"
    >
      <div className="mb-7 flex h-40 items-center justify-center sm:h-44">
        <img
          src={ImageLogo}
          alt="irodori logo"
          className="h-20 w-20 rounded-[1rem] shadow-2xl sm:h-24 sm:w-24"
        />
      </div>

      <div className="space-y-7 px-1 pb-1">
        <div className="space-y-2 text-center">
          <h1
            className="text-[1.45rem] leading-tight font-semibold text-base-foreground
              sm:text-[1.6rem]"
          >
            하루를 채우는 작은 기록
          </h1>
          <p className="text-[0.94rem] leading-relaxed text-muted-foreground sm:text-[0.98rem]">
            오늘의 감정과 순간을 담아내며,
            <br />
            나만의 책장을 차곡차곡 만들어 보세요.
          </p>
        </div>

        <button
          type="button"
          onClick={onStart}
          disabled={disabled}
          className="w-full rounded-[0.95rem] bg-highlight px-4 py-3 text-sm font-medium
            text-highlight-foreground transition hover:bg-highlight-hover
            disabled:cursor-not-allowed disabled:bg-highlight-disabled"
        >
          {buttonLabel}
        </button>
      </div>
    </section>
  </main>
);

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
    <OnboardingView
      buttonLabel={getButtonLabel(status)}
      disabled={status === 'starting'}
      onStart={handleStart}
    />
  );
};
