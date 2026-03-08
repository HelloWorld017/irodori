import { useMemo } from 'react';
import { IconCalendar, IconSearch } from '@/fragments/_icons';
import { classes } from '@/utils/classes';
import { TagsPicker } from './TagsPicker';
import type { EntriesSearchCriteria } from '../_types/EntriesSearchCriteria';

type EntriesSearchProps = {
  notebookId: string;
  criteria: EntriesSearchCriteria | null;
  className?: string;
  onCriteriaChange: (criteria: EntriesSearchCriteria) => void;
};

export const EntriesSearch = ({
  notebookId,
  criteria,
  className,
  onCriteriaChange,
}: EntriesSearchProps) => {
  const criteriaWithFallback = useMemo(
    () =>
      ({
        draft: criteria?.draft ?? '',
        tags: criteria?.tags ?? [],
        dateBefore: criteria?.dateBefore ?? null,
      }) satisfies EntriesSearchCriteria,
    [criteria]
  );

  return (
    <TagsPicker
      icon={<IconSearch className="text-highlight" />}
      notebookId={notebookId}
      value={{ draft: criteriaWithFallback.draft, tags: criteriaWithFallback.tags }}
      multiLine={false}
      allowDraft
      placeholder="검색"
      className={className}
      inputClassName={classes('bg-base-background/80 shadow-elevated backdrop-blur-xl')}
      onChange={({ draft, tags }) => {
        onCriteriaChange({
          ...criteriaWithFallback,
          draft,
          tags,
        });
      }}
    >
      <IconCalendar className="text-base" />
    </TagsPicker>
  );
};
