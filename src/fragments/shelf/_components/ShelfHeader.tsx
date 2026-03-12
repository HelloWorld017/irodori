import { Popover, PopoverButton } from '@headlessui/react';
import { AnimatedPopoverPanel } from '@/fragments/_components/AnimatedPopoverPanel';
import { IconSettings } from '@/fragments/_icons';
import { useClxDB } from '@/fragments/_providers/DatabaseProvider';

type ShelfHeaderProps = {
  notebookCount: number | null;
};

export const ShelfHeader = ({ notebookCount }: ShelfHeaderProps) => {
  const clxDB = useClxDB();
  const onDatabaseSettings = (closePopover: () => void) => {
    closePopover();
    // FIXME remove storage field
    void clxDB.ui.openDatabaseSettings({ client: clxDB, storage: clxDB.storage });
  };

  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[1.65rem] leading-tight font-semibold text-primary sm:text-[1.8rem]">
            내 일기장
          </h1>
          <p className="text-sm text-secondary sm:text-[0.95rem]">
            {notebookCount !== null &&
              (notebookCount > 0
                ? `${notebookCount}개의 일기장이 정리되어 있어요.`
                : '첫 일기장을 만들고 오늘의 기록을 시작해 보세요.')}
          </p>
        </div>

        <Popover className="relative">
          {({ open, close }) => (
            <>
              <PopoverButton
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full text-lg
                  text-secondary transition hover:bg-elevated-background-hover hover:text-primary
                  focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2
                  focus-visible:ring-offset-base-background focus-visible:outline-none"
                aria-label="설정 열기"
              >
                <IconSettings />
              </PopoverButton>

              <AnimatedPopoverPanel
                open={open}
                anchor={{ to: 'bottom end', gap: 8 }}
                className="z-20 w-44 rounded-xl border border-line bg-base-background p-1 shadow-xl"
              >
                <button
                  type="button"
                  onClick={() => onDatabaseSettings(close)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold
                    text-secondary transition hover:bg-elevated-background hover:text-primary"
                >
                  데이터베이스 설정
                </button>
              </AnimatedPopoverPanel>
            </>
          )}
        </Popover>
      </div>
    </header>
  );
};
