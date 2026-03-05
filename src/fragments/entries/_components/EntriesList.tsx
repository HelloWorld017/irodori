import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { classes } from '@/utils/classes';
import { EntriesItem } from './EntriesItem';
import type { EntryListItem } from '@/services/EntriesService';
import type { ReactNode } from 'react';

type EntriesListProps = {
  entries: EntryListItem[];
  className?: string;
  children?: { header: ReactNode; footer: ReactNode };
};

export const EntriesList = ({ entries, className, children }: EntriesListProps) => {
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 84,
    getItemKey: index => entries[index]?.id ?? index,
    overscan: 6,
  });

  return (
    <div ref={scrollElementRef} className={classes('h-full overflow-y-auto', className)}>
      {children?.header}
      {entries.length === 0 && (
        <section className={classes('py-6 text-center text-sm text-tertiary', className)}>
          표시할 일기가 없어요.
        </section>
      )}

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
                <EntriesItem entry={entry} />
              </li>
            );
          })}
        </ul>
      </div>
      {children?.footer}
    </div>
  );
};
