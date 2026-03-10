import { useEffect, useMemo, useRef } from 'react';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useLatestCallback } from '@/hooks/useLatestCallback';
import { useEntriesNotebookId } from '../../../_providers/EntriesProvider';
import { useEntriesDetailResolvedTagsById } from '../../_providers/EntriesDetailProvider';
import { createTagCompletionPlugin } from './tagCompletionPlugin';
import { createTagResolutionPlugin } from './tagResolutionPlugin';
import { createTagWidgetPlugin } from './tagWidgetPlugin';
import type { TagViewItem } from '@/repositories/TagsRepository';

export const useTagPlugin = () => {
  const services = useServices();
  const notebookId = useEntriesNotebookId();
  const resolvedTagsById = useEntriesDetailResolvedTagsById();
  const knownTagsRef = useRef(new Map(resolvedTagsById));

  useEffect(() => {
    knownTagsRef.current = new Map([...knownTagsRef.current, ...resolvedTagsById]);
  }, [resolvedTagsById]);

  const getTagById = useLatestCallback((tagId: string) => knownTagsRef.current.get(tagId) ?? null);
  const rememberTag = useLatestCallback((tag: TagViewItem) => {
    knownTagsRef.current.set(tag.id, tag);
  });

  const searchTags = useLatestCallback(async (query: string) =>
    services.tags.search({
      notebookId,
      query,
      limit: 8,
    })
  );

  const resolveTag = useLatestCallback(async (reference: string) =>
    services.tags.resolveReference({
      notebookId,
      reference,
    })
  );

  const tagPlugin = useMemo(() => {
    const props = {
      getTagById,
      rememberTag,
      searchTags,
      resolveTag,
    };

    return [
      ...createTagCompletionPlugin(props),
      ...createTagResolutionPlugin(props),
      ...createTagWidgetPlugin(props),
    ];
  }, [getTagById, rememberTag, searchTags, resolveTag]);

  return tagPlugin;
};
