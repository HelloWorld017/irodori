import { IconCalendar, IconX } from '@/fragments/_icons';
import { classes } from '@/utils/classes';
import { TagsPicker } from './TagsPicker';
import type { EntriesSearchCriteria } from '../_types';

type EntriesSearchProps = {
  notebookId: string;
  criteria: EntriesSearchCriteria;
  className?: string;
  onCriteriaChange: (criteria: EntriesSearchCriteria) => void;
  onClose: () => void;
};

export const EntriesSearch = ({
  notebookId,
  criteria,
  className,
  onCriteriaChange,
  onClose,
}: EntriesSearchProps) => (
  <section
    className={classes(
      'rounded-2xl border border-line bg-elevated-background px-3 py-3 shadow-elevated',
      className
    )}
  >
    <div className="flex items-start gap-2">
      <div
        className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-base-background
          text-secondary"
      >
        <IconCalendar className="text-base" />
      </div>

      <TagsPicker
        notebookId={notebookId}
        value={{ draft: criteria.draft, tags: criteria.tags }}
        allowDraft
        placeholder="텍스트 또는 태그로 검색"
        className="flex-1"
        onChange={({ draft, tags }) => {
          onCriteriaChange({
            ...criteria,
            draft,
            tags,
          });
        }}
        onSubmit={({ draft, tags }) => {
          onCriteriaChange({
            ...criteria,
            draft,
            tags,
          });
        }}
      />

      <button
        type="button"
        onClick={onClose}
        className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-base-background
          text-secondary transition hover:bg-elevated-background hover:text-primary"
        aria-label="검색 닫기"
      >
        <IconX className="text-base" />
      </button>
    </div>
  </section>
);
