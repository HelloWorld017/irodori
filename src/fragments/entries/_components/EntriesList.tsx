import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { classes } from '@/utils/classes';
import { EntriesItem } from './EntriesItem';
import type { EntrySummary } from '@/repositories/EntriesRepository';
import type { ReactNode } from 'react';

type EntriesListProps = {
  entries: EntrySummary[];
  selectedEntryId?: string | null;
  onSelectEntry?: (entryId: string) => void;
  className?: string;
  children?: { header: ReactNode; footer: ReactNode };
};

export const EntriesList = ({
  entries,
  selectedEntryId = null,
  onSelectEntry,
  className,
  children,
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
      <section className={classes('text-center text-sm text-secondary', className)}>
        {children?.header}
        표시할 일기가 없어요.
        {children?.footer}
      </section>
    );
  }

  return (
    <div ref={scrollElementRef} className={classes('h-full overflow-y-auto', className)}>
      {children?.header}
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        <ul className="relative m-0 list-none">
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
                className="absolute top-0 left-0 w-full py-1"
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
      {children?.footer}
    </div>
  );
};
