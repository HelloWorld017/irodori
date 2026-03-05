import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { queryKey } from '@/utils/queryKey';
import { useEntriesNotebookId } from '../_providers/EntriesProvider';
import { DEFAULT_ENTRIES_SEARCH_CRITERIA } from '../_types';
import { EntriesList } from './EntriesList';
import { EntriesSearch } from './EntriesSearch';
import type { EntriesSearchCriteria } from '../_types';
import type { EntryListCursor } from '@/repositories/EntriesRepository';

const ENTRY_PAGE_SIZE = 30;

type EntriesFinderProps = {
  searchOpened?: boolean;
  onCloseSearch?: () => void;
};

export const EntriesFinder = ({ searchOpened = false, onCloseSearch }: EntriesFinderProps) => {
  const services = useServices();
  const notebookId = useEntriesNotebookId();
  const [latestCriteria, setCriteria] = useState<EntriesSearchCriteria>(
    DEFAULT_ENTRIES_SEARCH_CRITERIA
  );

  const criteria = useDebouncedValue(latestCriteria, { delay: 1000 });

  const searchText = criteria.draft.trim();
  const selectedTagIds = useMemo(() => criteria.tags.map(tag => tag.id), [criteria.tags]);
  const listQueryParams = useMemo(
    () => ({
      notebookId,
      searchText,
      tagIds: selectedTagIds,
      dateBefore: criteria.dateBefore,
    }),
    [criteria.dateBefore, notebookId, searchText, selectedTagIds]
  );

  const handleCloseSearch = () => {
    setCriteria(DEFAULT_ENTRIES_SEARCH_CRITERIA);
    onCloseSearch?.();
  };

  const entriesQuery = useInfiniteQuery({
    queryKey: queryKey('entries', 'list', listQueryParams),
    enabled: services !== null && Boolean(notebookId),
    initialPageParam: undefined as EntryListCursor | undefined,
    queryFn: ({ pageParam }) =>
      services!.entries.list({
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
    <div className="flex w-full flex-col gap-4 p-6 sm:p-8">
      {searchOpened && (
        <EntriesSearch
          notebookId={notebookId}
          criteria={criteria}
          onCriteriaChange={setCriteria}
          onClose={handleCloseSearch}
        />
      )}

      {entriesQuery.isPending && (
        <p className="text-sm font-medium text-secondary">일기를 불러오는 중이에요...</p>
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

      {entries && <EntriesList entries={entries} className="h-[70vh]" />}
      {entries && entriesQuery.hasNextPage ? (
        <button
          type="button"
          onClick={() => entriesQuery.fetchNextPage()}
          disabled={entriesQuery.isFetchingNextPage}
          className="rounded-lg bg-highlight px-3 py-2 text-sm font-medium text-highlight-foreground
            transition hover:bg-highlight-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {entriesQuery.isFetchingNextPage ? '더 불러오는 중...' : '더 불러오기'}
        </button>
      ) : null}
    </div>
  );
};
