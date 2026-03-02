import { IconPencil, IconTrash } from '@/fragments/_icons';
import type { Notebook as NotebookModel } from '@/repositories/NotebooksRepository';

type NotebookProps = {
  notebook: NotebookModel;
  onOpen: (notebookId: string) => void;
  onEdit: (notebook: NotebookModel) => void;
  onDelete: (notebook: NotebookModel) => void;
};

export const Notebook = ({ notebook, onOpen, onEdit, onDelete }: NotebookProps) => (
  <div className="flex flex-col gap-3">
    <button
      type="button"
      onClick={() => onOpen(notebook.id)}
      className="relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-xl text-left"
      style={{ backgroundColor: `oklch(from ${notebook.color} calc(l * 0.8) calc(c * 0.3) h)` }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent
          to-black/8"
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/8
          to-transparent"
      />

      <div
        className="pointer-events-none absolute inset-y-0 left-3 w-1 bg-gradient-to-r from-white/8
          via-transparent to-black/3"
      />

      <div className="relative flex h-full flex-col p-4 pl-6 md:p-5 md:pl-7">
        <div
          className="sm:text-md line-clamp-2 text-sm leading-snug font-semibold wrap-break-word
            text-white md:text-lg"
        >
          {notebook.title}
        </div>
        <div className="mt-4 h-1 w-6 bg-white" />
      </div>
    </button>

    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-1">
      <h2 className="line-clamp-2 font-semibold">{notebook.title}</h2>
      <div className="flex">
        <button
          type="button"
          onClick={() => onEdit(notebook)}
          className="rounded-lg bg-base-background p-2 text-xs font-medium text-secondary transition
            hover:bg-elevated-background"
        >
          <IconPencil aria-label="수정" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(notebook)}
          className="rounded-lg bg-base-background p-2 text-xs font-medium text-secondary transition
            hover:text-primary"
        >
          <IconTrash aria-label="삭제" />
        </button>
      </div>
    </div>
  </div>
);
