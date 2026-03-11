import { useQueryClient, useSuspenseQueries } from '@tanstack/react-query';
import { create, keyResolver, windowScheduler } from '@yornaath/batshit';
import { useDeferredValue, useMemo } from 'react';
import { BATCH_WINDOW_MS } from '@/constants/batch';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { batchKey, queryKey } from '@/utils/queryKey';
import { useEntriesDetailEntry } from '../_providers/EntriesDetailProvider';
import type { TagViewItem } from '@/repositories/TagsRepository';

type UseTagsFetcherInput = {
  tagIds?: string[];
};

const toUniqueIds = (values: string[]): string[] => [...new Set(values)];

export const useTagsFetcher = ({ tagIds = [] }: UseTagsFetcherInput = {}) => {
  const services = useServices();
  const queryClient = useQueryClient();
  const entry = useEntriesDetailEntry();
  const initialTagsById = useMemo(
    () => new Map(entry.tags.map(tag => [tag.id, tag] as const)),
    [entry.tags]
  );
  const resolvedTagIds = useMemo(() => toUniqueIds(tagIds), [tagIds]);
  const resolvedTagIdsDeferred = useDeferredValue(resolvedTagIds);

  const resolveTag = useMemo(
    () =>
      create<TagViewItem[], string, TagViewItem | null>({
        name: batchKey('common', 'tags'),
        fetcher: async (resolvedTagIds: string[]) =>
          services.tags.listByIds([...new Set(resolvedTagIds)]),
        resolver: keyResolver('id'),
        scheduler: windowScheduler(BATCH_WINDOW_MS),
      }),
    [services]
  );

  const getTagQueryOptions = useMemo(
    () => (tagId: string) => ({
      queryKey: queryKey('entriesDetail', 'detail-tag', tagId),
      queryFn: () => resolveTag.fetch(tagId),
      initialData: initialTagsById.get(tagId),
    }),
    [initialTagsById, resolveTag]
  );

  const resolvedTagsById = useSuspenseQueries({
    queries: resolvedTagIdsDeferred.map(tagId => ({
      enabled: true,
      ...getTagQueryOptions(tagId),
    })),
    combine: results =>
      new Map(results.map((result, index) => [resolvedTagIdsDeferred[index], result.data ?? null])),
  });

  const fetchTag = useMemo(
    () =>
      (tagId: string): TagViewItem | null | Promise<TagViewItem | null> => {
        const cachedTag = queryClient.getQueryData<TagViewItem | null>(
          queryKey('entriesDetail', 'detail-tag', tagId)
        );

        if (cachedTag !== undefined) {
          return cachedTag;
        }

        const initialTag = initialTagsById.get(tagId);
        if (initialTag) {
          return initialTag;
        }

        return queryClient.fetchQuery(getTagQueryOptions(tagId));
      },
    [getTagQueryOptions, initialTagsById, queryClient]
  );

  return {
    fetchTag,
    resolvedTagsById,
  };
};
