import { useInfiniteQuery } from '@tanstack/react-query';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useEntriesNotebookId } from '../_providers/EntriesProvider';
import { EntriesList } from './EntriesList';
import type { EntryListCursor } from '@/repositories/EntriesRepository';

const ENTRY_PAGE_SIZE = 30;

export const EntriesFinder = () => {
  const services = useServices();
  const notebookId = useEntriesNotebookId();

  const entriesQuery = useInfiniteQuery({
    queryKey: ['entries', 'list', notebookId],
    enabled: services !== null && Boolean(notebookId),
    initialPageParam: undefined as EntryListCursor | undefined,
    queryFn: ({ pageParam }) =>
      services!.entries.list({
        notebookId,
        cursor: pageParam,
        limit: ENTRY_PAGE_SIZE,
      }),
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  });

  if (entriesQuery.isPending) {
    return <p className="text-sm font-medium text-secondary">일기를 불러오는 중이에요...</p>;
  }

  if (entriesQuery.isError) {
    return (
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
    );
  }

  const entries = entriesQuery.data.pages.flatMap(page => page.items);

  return (
    <div className="flex w-full flex-col gap-4 px-5 py-8 sm:px-8 sm:py-10">
      <EntriesList entries={entries} className="h-[70vh]" />

      {entriesQuery.hasNextPage ? (
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
