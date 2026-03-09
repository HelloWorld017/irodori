import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { classes } from '@/utils/classes';
import { queryKey } from '@/utils/queryKey';
import { useEntriesNotebookId } from '../_providers/EntriesProvider';
import { EntriesList } from './EntriesList';
import { EntriesSearch } from './EntriesSearch';
import type { EntriesSearchCriteria } from '../_types/EntriesSearchCriteria';
import type { EntryListCursor } from '@/repositories/EntriesRepository';

const ENTRY_PAGE_SIZE = 30;

export const EntriesFinder = ({ className }: { className?: string }) => {
  const services = useServices();
  const notebookId = useEntriesNotebookId();

  const [latestCriteria, setCriteria] = useState<EntriesSearchCriteria | null>(null);
  const criteria = useDebouncedValue(latestCriteria, { delay: 1000 });

  const searchText = criteria?.draft.trim();
  const selectedTagIds = useMemo(() => criteria?.tags.map(tag => tag.id), [criteria]);
  const listQueryParams = useMemo(
    () => ({
      notebookId,
      searchText,
      tagIds: selectedTagIds,
      dateBefore: criteria?.dateBefore,
    }),
    [criteria, notebookId, searchText, selectedTagIds]
  );

  const entriesQuery = useInfiniteQuery({
    queryKey: queryKey('entries', 'list', listQueryParams),
    enabled: Boolean(notebookId),
    initialPageParam: undefined as EntryListCursor | undefined,
    queryFn: ({ pageParam }) =>
      services.entries.list({
        notebookId,
        cursor: pageParam,
        limit: ENTRY_PAGE_SIZE,
        searchText: searchText || undefined,
        tagIds: selectedTagIds,
      }),
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  });

  const entries = entriesQuery.data?.pages.flatMap(page => page.items);

  return (
    <div
      className={classes(
        `relative mt-2 flex w-full flex-1 flex-col gap-4 before:absolute before:top-0 before:z-1
        before:flex before:h-12 before:w-full before:bg-linear-to-b before:from-elevated-background
        before:to-transparent sm:mt-4`,
        className
      )}
    >
      <EntriesList entries={entries ?? []} className="relative min-h-0 flex-[1_1_0] px-6 sm:px-8">
        {{
          header: (
            <>
              <EntriesSearch
                className="sticky top-2 z-2 mb-8 pt-2"
                notebookId={notebookId}
                criteria={latestCriteria}
                onCriteriaChange={setCriteria}
              />
              <div className="flex flex-col gap-4">
                {entriesQuery.isPending && (
                  <p className="px-6 text-center text-sm font-medium text-secondary">
                    일기를 불러오는 중이에요...
                  </p>
                )}

                {entriesQuery.isError && (
                  <section className="rounded-2xl bg-elevated-background p-6 ring-1 ring-line">
                    <p className="text-sm text-secondary">일기 목록을 불러오지 못했어요.</p>
                    <button
                      type="button"
                      onClick={() => entriesQuery.refetch()}
                      className="mt-4 rounded-lg bg-highlight px-3 py-2 text-sm font-medium
                        text-highlight-foreground transition hover:bg-highlight-hover"
                    >
                      다시 시도
                    </button>
                  </section>
                )}
              </div>
            </>
          ),
          footer:
            entries && entriesQuery.hasNextPage ? (
              <button
                type="button"
                onClick={() => entriesQuery.fetchNextPage()}
                disabled={entriesQuery.isFetchingNextPage}
                className="mt-4 rounded-lg bg-highlight px-3 py-2 text-sm font-medium
                  text-highlight-foreground transition hover:bg-highlight-hover
                  disabled:cursor-not-allowed disabled:opacity-60"
              >
                {entriesQuery.isFetchingNextPage ? '더 불러오는 중...' : '더 불러오기'}
              </button>
            ) : null,
        }}
      </EntriesList>
    </div>
  );
};
