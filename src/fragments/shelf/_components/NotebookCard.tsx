import type { Notebook } from '@/repositories/NotebooksRepository';

type NotebookCardProps = {
  notebook: Notebook;
  onOpen: (notebookId: string) => void;
  onEdit: (notebook: Notebook) => void;
  onDelete: (notebook: Notebook) => void;
};

export const NotebookCard = ({ notebook, onOpen, onEdit, onDelete }: NotebookCardProps) => (
  <article
    className="group relative overflow-hidden rounded-2xl bg-elevated-background p-5 shadow-elevated
      ring-1 ring-line"
  >
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-20
        bg-[radial-gradient(100%_120%_at_0%_0%,_rgba(235,160,0,0.18)_0%,_rgba(235,160,0,0)_70%)]"
    />

    <button
      type="button"
      onClick={() => onOpen(notebook.id)}
      className="relative flex w-full flex-col items-start gap-2 text-left"
    >
      <h2 className="line-clamp-1 text-lg font-semibold text-primary">{notebook.title}</h2>
      <p className="line-clamp-3 min-h-16 text-sm leading-relaxed text-secondary">
        {notebook.description || '아직 설명이 없어요. 이 노트북의 이야기를 적어 보세요.'}
      </p>
    </button>

    <div className="relative mt-5 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => onEdit(notebook)}
        className="rounded-lg border border-line bg-base-background px-3 py-1.5 text-xs font-medium
          text-primary transition hover:bg-elevated-background"
      >
        수정
      </button>
      <button
        type="button"
        onClick={() => onDelete(notebook)}
        className="rounded-lg border border-line bg-base-background px-3 py-1.5 text-xs font-medium
          text-secondary transition hover:text-primary"
      >
        삭제
      </button>
    </div>
  </article>
);
