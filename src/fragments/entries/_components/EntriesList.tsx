import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { classes } from '@/utils/classes';
import { EntriesItem } from './EntriesItem';
import type { EntrySummary } from '@/repositories/EntriesRepository';

type EntriesListProps = {
  entries: EntrySummary[];
  selectedEntryId?: string | null;
  onSelectEntry?: (entryId: string) => void;
  className?: string;
  emptyMessage?: string;
};

export const EntriesList = ({
  entries,
  selectedEntryId = null,
  onSelectEntry,
  className,
  emptyMessage = '표시할 일기가 없어요.',
}: EntriesListProps) => {
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 84,
    getItemKey: index => entries[index]?.id ?? index,
    overscan: 6,
  });

  if (entries.length === 0) {
    return (
      <section
        className={classes(
          'rounded-2xl border border-line bg-elevated-background px-4 py-8 text-center',
          'text-sm text-secondary',
          className
        )}
      >
        {emptyMessage}
      </section>
    );
  }

  return (
    <div ref={scrollElementRef} className={classes('h-full overflow-y-auto', className)}>
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        <ul className="relative m-0 list-none p-0">
          {virtualizer.getVirtualItems().map(virtualItem => {
            const entry = entries[virtualItem.index];

            if (!entry) {
              return null;
            }

            return (
              <li
                key={entry.id}
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
                className="absolute top-0 left-0 w-full px-1 py-1"
                style={{ transform: `translateY(${virtualItem.start}px)` }}
              >
                <EntriesItem
                  entry={entry}
                  selected={selectedEntryId === entry.id}
                  onSelect={onSelectEntry}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
