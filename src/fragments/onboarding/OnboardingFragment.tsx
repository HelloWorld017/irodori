import { useCallback, useState } from 'react';
import { match } from 'ts-pattern';
import { initClxDB } from '@/features/clxdb/initClxDB';

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

export const OnboardingView = ({ buttonLabel, disabled, onStart }: OnboardingViewProps) => (
  <main
    className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden
      px-8 py-12 sm:gap-7 sm:px-6"
  >
    <div
      aria-hidden
      className="pointer-events-none absolute top-[14vh] -left-24 h-64 w-64 rounded-full
        bg-[linear-gradient(160deg,rgba(255,161,114,0.18),rgba(255,161,114,0.02))]"
    />
    <div
      aria-hidden
      className="pointer-events-none absolute -right-28 -bottom-24 h-80 w-80 rounded-full
        bg-[linear-gradient(190deg,rgba(98,156,255,0.2),rgba(98,156,255,0.03))]"
    />
    <h1
      className="m-0 text-center indent-[0.35em]
        [font-family:'Avenir_Next_Condensed','Avenir_Next','SUIT_Variable','Pretendard','Noto_Sans_KR',sans-serif]
        text-[clamp(2.5rem,8vw,4.75rem)] font-bold tracking-[0.35em] text-[#1b2d47] uppercase
        sm:indent-[0.26em] sm:tracking-[0.26em]"
    >
      IRODORI
    </h1>
    <button
      className="min-w-44 cursor-pointer rounded-full border border-[#0e345d]/20
        bg-[linear-gradient(120deg,#1f4f88_0%,#2a6aac_100%)] px-7 py-3 text-base font-semibold
        tracking-[0.04em] text-[#f8fbff] transition duration-200 ease-out hover:-translate-y-px
        hover:shadow-[0_12px_28px_rgba(31,79,136,0.28)] hover:saturate-110 active:translate-y-px
        disabled:cursor-default disabled:opacity-75 sm:min-w-40 sm:px-[1.4rem] sm:py-3"
      disabled={disabled}
      onClick={onStart}
      type="button"
    >
      {buttonLabel}
    </button>
  </main>
);

export const OnboardingFragment = () => {
  const [status, setStatus] = useState<OnboardingStatus>('idle');

  const handleStart = useCallback(async () => {
    if (status === 'starting' || status === 'ready') {
      return;
    }

    setStatus('starting');

    try {
      const client = await initClxDB();
      setStatus(client == null ? 'idle' : 'ready');
    } catch {
      setStatus('error');
    }
  }, [status]);

  return (
    <OnboardingView
      buttonLabel={getButtonLabel(status)}
      disabled={status === 'starting' || status === 'ready'}
      onStart={() => {
        void handleStart();
      }}
    />
  );
};
