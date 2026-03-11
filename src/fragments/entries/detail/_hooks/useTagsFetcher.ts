import { useQueryClient } from '@tanstack/react-query';
import { create, keyResolver, windowScheduler } from '@yornaath/batshit';
import { useMemo } from 'react';
import { BATCH_WINDOW_MS } from '@/constants/batch';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { batchKey, queryKey } from '@/utils/queryKey';
import { useEntriesDetailEntry } from '../_providers/EntriesDetailProvider';
import type { TagViewItem } from '@/repositories/TagsRepository';

export const useTagsFetcher = () => {
  const services = useServices();
  const queryClient = useQueryClient();
  const entry = useEntriesDetailEntry();
  const initialTagsById = useMemo(
    () => new Map(entry.tags.map(tag => [tag.id, tag] as const)),
    [entry.tags]
  );

  const fetchTag = useMemo(
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
      queryFn: () => fetchTag.fetch(tagId),
      initialData: initialTagsById.get(tagId),
    }),
    [initialTagsById, fetchTag]
  );

  const fetchTagWithCache = useMemo(
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
    fetchTag: fetchTagWithCache,
    getTagQueryOptions,
  };
};
