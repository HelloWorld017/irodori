import { Link } from 'wouter';
import { Tag } from '@/fragments/_components/Tag';
import { classes } from '@/utils/classes';
import { formatDateShort } from '@/utils/date';
import { buildRoute } from '@/utils/route';
import { useEntriesNotebookId } from '../_providers/EntriesProvider';
import type { EntryViewItem } from '@/services/EntriesService';

type EntriesItemProps = {
  entry: EntryViewItem;
};

export const EntriesItem = ({ entry }: EntriesItemProps) => {
  const notebookId = useEntriesNotebookId();

  return (
    <Link
      href={buildRoute('entriesDetail', { notebookId, entryId: entry.id })}
      replace
      className={isActive =>
        classes(
          `flex w-full flex-col rounded-xl border p-4 text-left transition focus-visible:ring-2
          focus-visible:ring-highlight focus-visible:ring-offset-2
          focus-visible:ring-offset-base-background focus-visible:outline-none`,
          isActive
            ? 'border-highlight bg-section-background'
            : 'border-transparent bg-base-background hover:bg-base-background'
        )
      }
    >
      <div className="flex items-center justify-between gap-3 text-sm text-tertiary">
        <time dateTime={new Date(entry.date).toISOString()}>{formatDateShort(entry.date)}</time>
        <span>#{entry.index}</span>
      </div>

      <h3 className="line-clamp-1 text-lg font-medium text-primary">{entry.title}</h3>

      {!!entry.tags.length && (
        <div className="mt-4 flex flex-wrap gap-2">
          {entry.tags.map(tag => (
            <Tag key={tag.id} {...tag} />
          ))}
        </div>
      )}
    </Link>
  );
};
