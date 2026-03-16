import { useState } from 'react';
import { ColorPicker } from '@/fragments/_components/ColorPicker';
import { classes } from '@/utils/classes';
import { NotebookThumbnail } from './NotebookThumbnail';
import type { NotebookEditValue } from './NotebookEdit';

type NotebookEditDetailProps = {
  className?: string;
  initialValue: NotebookEditValue;
  pending: boolean;
  mode: 'create' | 'edit';
  onClose: () => void;
  onSubmit: (value: NotebookEditValue) => void;
};

export const NotebookEditDetail = ({
  className,
  initialValue,
  pending,
  mode,
  onClose,
  onSubmit,
}: NotebookEditDetailProps) => {
  const [title, setTitle] = useState(initialValue.title);
  const [description, setDescription] = useState(initialValue.description);
  const [color, setColor] = useState(initialValue.color);

  return (
    <form
      className={classes('flex min-h-full w-full flex-col gap-4', className)}
      onSubmit={event => {
        event.preventDefault();
        onSubmit({ title, description, color });
      }}
    >
      <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-6">
        <div className="mx-auto shrink-0 md:mx-12">
          <NotebookThumbnail title={title || '새 일기장'} color={color} />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <label className="block space-y-2">
            <div className="text-sm font-medium text-primary">제목</div>
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              maxLength={80}
              placeholder="일기장 제목"
              className="w-full rounded-xl border border-line bg-elevated-background px-3 py-2
                text-sm text-primary transition outline-none focus:border-highlight"
            />
          </label>

          <div className="space-y-4">
            <div className="text-sm font-medium text-primary">표지 색상</div>
            <ColorPicker value={color} onChange={setColor} />
          </div>

          <label className="block space-y-2">
            <div className="text-sm font-medium text-primary">설명</div>
            <textarea
              value={description}
              onChange={event => setDescription(event.target.value)}
              maxLength={240}
              rows={4}
              placeholder="일기장을 어떻게 쓸지 간단히 적어보세요"
              className="w-full resize-none rounded-xl border border-line bg-elevated-background
                px-3 py-2 text-sm text-primary transition outline-none focus:border-highlight"
            />
          </label>
        </div>
      </div>

      <div className="flex-1" />
      <footer className="flex justify-end gap-2 pt-2">
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
          type="submit"
          disabled={pending}
          className="rounded-xl bg-highlight px-4 py-2 text-sm font-semibold
            text-highlight-foreground transition hover:bg-highlight-hover
            disabled:cursor-not-allowed disabled:bg-highlight-disabled"
        >
          {pending ? '저장 중...' : mode === 'create' ? '생성하기' : '수정하기'}
        </button>
      </footer>
    </form>
  );
};
