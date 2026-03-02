import { motion } from 'motion/react';
import { useState } from 'react';
import { ColorPicker } from './ColorPicker';

type NotebookFormValue = {
  title: string;
  description: string;
  color: string;
};

type NotebookFormModalProps = {
  mode: 'create' | 'edit';
  initialValue: NotebookFormValue;
  pending: boolean;
  onClose: () => void;
  onSubmit: (value: NotebookFormValue) => void;
};

export const NotebookFormModal = ({
  mode,
  initialValue,
  pending,
  onClose,
  onSubmit,
}: NotebookFormModalProps) => {
  const [title, setTitle] = useState(initialValue.title);
  const [description, setDescription] = useState(initialValue.description);
  const [color, setColor] = useState(initialValue.color);

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button className="absolute inset-0 bg-backdrop" onClick={() => onClose()} />
      <section
        className="relative w-full max-w-md rounded-2xl bg-base-background p-5 shadow-elevated
          ring-1 ring-line"
      >
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">
              {mode === 'create' ? '새 일기장 만들기' : '일기장 수정하기'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md px-2 py-1 text-sm font-medium text-secondary transition
              hover:bg-elevated-background hover:text-primary disabled:cursor-not-allowed"
          >
            닫기
          </button>
        </header>

        <form
          className="space-y-4"
          onSubmit={event => {
            event.preventDefault();
            onSubmit({ title, description, color });
          }}
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium text-primary">제목</span>
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              maxLength={80}
              placeholder="일기장 제목"
              className="w-full rounded-xl border border-line bg-elevated-background px-3 py-2
                text-sm text-primary transition outline-none focus:border-highlight"
            />
          </label>

          <ColorPicker value={color} onChange={setColor} />

          <label className="block space-y-2">
            <span className="text-sm font-medium text-primary">설명</span>
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

          <footer className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-xl border border-line bg-base-background px-4 py-2 text-sm
                font-medium text-primary transition hover:bg-elevated-background
                disabled:cursor-not-allowed"
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
      </section>
    </motion.div>
  );
};
