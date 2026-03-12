import { useEffect, useMemo, useRef } from 'react';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useEntriesNotebookId } from '@/fragments/entries/_providers/EntriesProvider';
import { useTagsFetcher } from '@/fragments/entries/detail/_hooks/useTagsFetcher';
import { useEntriesDetailEntry } from '@/fragments/entries/detail/_providers/EntriesDetailProvider';
import { useLatestCallback } from '@/hooks/useLatestCallback';
import { isPromise } from '@/utils/promise';
import { useEditorPortal } from '../../_providers/EditorPortalProvider';
import { createTagCompletionPlugin } from '../_plugins/tagCompletionPlugin';
import { createTagResolutionPlugin } from '../_plugins/tagResolutionPlugin';
import { createTagWidgetPlugin } from '../_plugins/tagWidgetPlugin';
import type { TagViewItem } from '@/repositories/TagsRepository';

export const useTagPlugin = () => {
  const services = useServices();
  const notebookId = useEntriesNotebookId();
  const entry = useEntriesDetailEntry();
  const editorPortal = useEditorPortal();
  const { fetchTag: baseFetchTag } = useTagsFetcher();
  const knownTagsRef = useRef(new Map(entry.tags.map(tag => [tag.id, tag])));

  useEffect(() => {
    knownTagsRef.current = new Map([
      ...entry.tags.map(tag => [tag.id, tag] as const),
      ...knownTagsRef.current,
    ]);
  }, [entry.tags]);

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

  const fetchTag = useLatestCallback((tagId: string) => {
    const knownTag = knownTagsRef.current.get(tagId);
    if (knownTag) {
      return knownTag;
    }

    const fetchedTag = baseFetchTag(tagId);
    if (isPromise(fetchedTag)) {
      return fetchedTag
        .then(tag => {
          if (tag) {
            rememberTag(tag);
          }

          return tag;
        })
        .catch(error => {
          console.error('Failed to fetch tag for markup widget', error);
          return null;
        });
    }

    if (fetchedTag) {
      rememberTag(fetchedTag);
    }

    return fetchedTag;
  });

  const tagPlugin = useMemo(() => {
    const props = {
      fetchTag,
      rememberTag,
      searchTags,
      resolveTag,
      portal: editorPortal,
    };

    return [
      ...createTagCompletionPlugin(props),
      ...createTagResolutionPlugin(props),
      ...createTagWidgetPlugin(props),
    ];
  }, [editorPortal, fetchTag, rememberTag, searchTags, resolveTag]);

  return tagPlugin;
};
