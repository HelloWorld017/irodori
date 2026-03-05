import { IconPencil, IconTrash } from '@/fragments/_icons';
import { formatDate } from '@/utils/date';
import { buildRoute } from '@/utils/route';
import { NotebookThumbnail } from './NotebookThumbnail';
import type { Notebook as NotebookModel } from '@/repositories/NotebooksRepository';

type NotebookProps = {
  notebook: NotebookModel;
  onEdit: (notebook: NotebookModel) => void;
  onDelete: (notebook: NotebookModel) => void;
};

export const Notebook = ({ notebook, onEdit, onDelete }: NotebookProps) => (
  <div className="flex gap-6">
    <NotebookThumbnail
      link={buildRoute('entries', { notebookId: notebook.id })}
      title={notebook.title}
      color={notebook.color}
    />

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
