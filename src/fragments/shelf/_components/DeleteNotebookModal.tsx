import type { Notebook } from '@/repositories/NotebooksRepository';

type DeleteNotebookModalProps = {
  notebook: Notebook;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const DeleteNotebookModal = ({
  notebook,
  pending,
  onClose,
  onConfirm,
}: DeleteNotebookModalProps) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-primary/45 px-4 py-8">
    <section
      className="w-full max-w-sm rounded-2xl bg-base-background p-5 shadow-elevated ring-1
        ring-line"
    >
      <h2 className="text-lg font-semibold text-primary">일기장을 삭제할까요?</h2>
      <p className="mt-2 text-sm leading-relaxed text-secondary">
        <span className="font-medium text-primary">{notebook.title}</span> 일기장은 목록에서
        사라지며, 되돌릴 수 없어요.
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-xl border border-line bg-base-background px-4 py-2 text-sm font-medium
            text-primary transition hover:bg-elevated-background disabled:cursor-not-allowed"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="rounded-xl bg-highlight px-4 py-2 text-sm font-semibold
            text-highlight-foreground transition hover:bg-highlight-hover
            disabled:cursor-not-allowed disabled:bg-highlight-disabled"
        >
          {pending ? '삭제 중...' : '삭제하기'}
        </button>
      </div>
    </section>
  </div>
);
