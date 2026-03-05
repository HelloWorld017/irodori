import { motion } from 'motion/react';
import { useState } from 'react';
import { classes } from '@/utils/classes';
import { NotebookEditCategories } from './NotebookEditCategories';
import { NotebookEditDetail } from './NotebookEditDetail';

export type NotebookEditValue = {
  title: string;
  description: string;
  color: string;
};

type NotebookEditProps = {
  mode: 'create' | 'edit';
  notebookId?: string;
  initialValue: NotebookEditValue;
  pending: boolean;
  onClose: () => void;
  onSubmit: (value: NotebookEditValue) => void;
};

type NotebookEditTab = 'detail' | 'categories';

export const NotebookEdit = ({
  mode,
  notebookId,
  initialValue,
  pending,
  onClose,
  onSubmit,
}: NotebookEditProps) => {
  const [tab, setTab] = useState<NotebookEditTab>('detail');
  const isCreateMode = mode === 'create';

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center px-4 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button type="button" className="absolute inset-0 bg-backdrop" onClick={() => onClose()} />

      <section
        className="relative flex h-full max-h-144 w-full max-w-192 flex-col rounded-2xl
          bg-base-background p-8 shadow-elevated ring-1 ring-line"
      >
        <header className="flex flex-none items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-primary">
              {isCreateMode ? '새 일기장 만들기' : '일기장 수정하기'}
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

        {!isCreateMode ? (
          <div className="-mx-3 mb-8 flex flex-none">
            <button
              type="button"
              onClick={() => setTab('detail')}
              aria-pressed={tab === 'detail'}
              className={classes(
                'rounded-lg px-3 py-2 font-medium transition',
                tab === 'detail' ? 'text-primary' : 'text-tertiary'
              )}
            >
              상세
            </button>

            <button
              type="button"
              onClick={() => setTab('categories')}
              aria-pressed={tab === 'categories'}
              className={classes(
                'rounded-lg px-3 py-2 font-medium transition',
                tab === 'categories' ? 'text-primary' : 'text-tertiary'
              )}
            >
              카테고리
            </button>
          </div>
        ) : null}

        <div className="flex flex-1 items-center justify-center">
          {isCreateMode || tab === 'detail' ? (
            <NotebookEditDetail
              initialValue={initialValue}
              mode={mode}
              pending={pending}
              onClose={onClose}
              onSubmit={onSubmit}
            />
          ) : null}

          {!isCreateMode && tab === 'categories' && notebookId ? (
            <NotebookEditCategories notebookId={notebookId} />
          ) : null}
        </div>
      </section>
    </motion.div>
  );
};
