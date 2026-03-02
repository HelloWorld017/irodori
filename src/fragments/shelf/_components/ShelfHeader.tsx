type ShelfHeaderProps = {
  notebookCount: number;
};

export const ShelfHeader = ({ notebookCount }: ShelfHeaderProps) => (
  <header className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-[1.65rem] leading-tight font-semibold text-primary sm:text-[1.8rem]">
          내 일기장
        </h1>
        <p className="text-sm text-secondary sm:text-[0.95rem]">
          {notebookCount > 0
            ? `${notebookCount}개의 일기장이 정리되어 있어요.`
            : '첫 일기장을 만들고 오늘의 기록을 시작해 보세요.'}
        </p>
      </div>
    </div>
  </header>
);
