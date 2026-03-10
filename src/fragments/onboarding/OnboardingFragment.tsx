import { useCallback, useEffect, useState } from 'react';
import { match } from 'ts-pattern';
import ImageLogo from '@/assets/images/logo.svg';
import {
  useInitializeDatabase,
  useIsDatabaseInitialized,
} from '@/fragments/_providers/DatabaseProvider';
import { buildRoute } from '@/utils/route';
import { useNavigate } from '../_providers/RouterProvider';

type OnboardingStatus = 'idle' | 'starting' | 'ready';

const getButtonLabel = (status: OnboardingStatus): string =>
  match(status)
    .with('idle', () => '시작하기')
    .with('starting', () => '시작 중...')
    .with('ready', () => '준비 완료')
    .exhaustive();

type OnboardingViewProps = {
  buttonLabel: string;
  disabled: boolean;
  onStart: () => void;
};

const OnboardingView = ({ buttonLabel, disabled, onStart }: OnboardingViewProps) => (
  <main
    className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12 sm:px-8"
    style={{
      background:
        'radial-gradient(120% 80% at 8% 10%, #fff7dd 0%, rgba(255, 247, 221, 0) 55%),' +
        'linear-gradient(170deg, #fff8f5 0%, #fffef9 100%)',
    }}
  >
    <section
      className="w-full max-w-[26rem] rounded-[2rem] bg-elevated-background
        bg-[radial-gradient(circle_at_65%_0,_rgba(253,187,45,0.8)_0%,_transparent_55%)] p-5
        shadow-elevated ring-1 ring-line"
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
          <h1 className="text-[1.45rem] leading-tight font-semibold text-primary sm:text-[1.6rem]">
            하루를 채우는 작은 기록
          </h1>
          <p className="text-[0.94rem] leading-relaxed text-secondary sm:text-[0.98rem]">
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
    const success = await initialize();
    setStatus(success ? 'ready' : 'idle');
  }, [initialize, status]);

  const isInitialized = useIsDatabaseInitialized();
  const navigate = useNavigate();
  useEffect(() => {
    if (isInitialized) {
      navigate(buildRoute('shelf'), { replace: true });
    }
  }, [isInitialized, navigate]);

  return (
    <OnboardingView
      buttonLabel={getButtonLabel(status)}
      disabled={status === 'starting'}
      onStart={handleStart}
    />
  );
};
