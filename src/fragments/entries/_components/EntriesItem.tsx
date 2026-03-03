import { classes } from '@/utils/classes';
import { formatDate } from '@/utils/date';
import type { EntrySummary } from '@/repositories/EntriesRepository';

type EntriesItemProps = {
  entry: EntrySummary;
  selected?: boolean;
  onSelect?: (entryId: string) => void;
};

export const EntriesItem = ({ entry, onSelect, selected = false }: EntriesItemProps) => (
  <button
    type="button"
    onClick={() => onSelect?.(entry.id)}
    aria-current={selected ? 'true' : undefined}
    className={classes(
      'w-full rounded-xl border p-4 text-left transition focus-visible:outline-none',
      'focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2',
      'focus-visible:ring-offset-base-background',
      selected
        ? 'border-highlight bg-base-background shadow-elevated'
        : 'border-line bg-elevated-background hover:bg-base-background'
    )}
  >
    <div className="flex items-center justify-between gap-3">
      <h3 className="line-clamp-1 text-sm font-semibold text-primary">{entry.title}</h3>
      <time
        dateTime={new Date(entry.date).toISOString()}
        className="shrink-0 text-xs text-tertiary"
      >
        {formatDate(entry.date)}
      </time>
    </div>
  </button>
);
