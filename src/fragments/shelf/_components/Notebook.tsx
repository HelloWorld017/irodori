import { Link } from 'wouter';
import { IconPencil, IconTrash } from '@/fragments/_icons';
import { formatDate } from '@/utils/date';
import { buildRoute } from '@/utils/route';
import type { Notebook as NotebookModel } from '@/repositories/NotebooksRepository';

type NotebookProps = {
  notebook: NotebookModel;
  onEdit: (notebook: NotebookModel) => void;
  onDelete: (notebook: NotebookModel) => void;
};

export const Notebook = ({ notebook, onEdit, onDelete }: NotebookProps) => (
  <div className="flex gap-6">
    <Link
      href={buildRoute('entries', { notebookId: notebook.id })}
      className="relative flex aspect-[3/4] w-28 flex-col overflow-hidden rounded-xl text-left
        md:w-36"
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
          className="line-clamp-2 text-base leading-snug font-semibold wrap-break-word text-white
            md:text-lg"
        >
          {notebook.title}
        </div>
        <div className="mt-4 h-1 w-6 bg-white" />
      </div>
    </Link>

    <div className="flex flex-1 flex-col items-start justify-between gap-2 py-3">
      <div className="flex-1">
        <h2 className="line-clamp-2 text-lg font-semibold">{notebook.title}</h2>
        <div className="mt-1 text-tertiary">{formatDate(notebook.createdAt)} 부터 작성 중</div>
        <div className="mt-1 text-secondary">
          {notebook.description || '아직 설명이 없어요. 이 일기장의 이야기를 적어보세요.'}
        </div>
      </div>
      <div className="-mx-1 flex gap-1">
        <button
          type="button"
          onClick={() => onEdit(notebook)}
          className="flex items-center gap-2 rounded-lg bg-base-background p-2 text-sm font-medium
            text-secondary transition hover:bg-elevated-background"
        >
          <IconPencil />
          수정
        </button>
        <button
          type="button"
          onClick={() => onDelete(notebook)}
          className="flex items-center gap-2 rounded-lg bg-base-background p-2 text-sm font-medium
            text-secondary transition hover:bg-elevated-background"
        >
          <IconTrash />
          삭제
        </button>
      </div>
    </div>
  </div>
);
