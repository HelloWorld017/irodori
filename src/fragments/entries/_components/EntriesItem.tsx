import { Link } from 'wouter';
import { classes } from '@/utils/classes';
import { formatDateShort } from '@/utils/date';
import { buildRoute } from '@/utils/route';
import { useEntriesNotebookId } from '../_providers/EntriesProvider';
import type { EntrySummary } from '@/repositories/EntriesRepository';

type EntriesItemProps = {
  entry: EntrySummary;
};

export const EntriesItem = ({ entry }: EntriesItemProps) => {
  const notebookId = useEntriesNotebookId();

  return (
    <Link
      href={buildRoute('entriesDetail', { notebookId, entryId: entry.id })}
      className={isActive =>
        classes(
          `flex w-full flex-col rounded-xl border p-4 text-left transition focus-visible:ring-2
          focus-visible:ring-highlight focus-visible:ring-offset-2
          focus-visible:ring-offset-base-background focus-visible:outline-none`,
          isActive
            ? 'border-highlight bg-elevated-background'
            : 'border-transparent bg-base-background hover:bg-base-background'
        )
      }
    >
      <div className="flex items-center justify-between gap-3 text-sm text-tertiary">
        <time dateTime={new Date(entry.date).toISOString()}>{formatDateShort(entry.date)}</time>
        <span>#{entry.index}</span>
      </div>
      <h3 className="line-clamp-1 text-lg font-medium text-primary">{entry.title}</h3>
    </Link>
  );
};
