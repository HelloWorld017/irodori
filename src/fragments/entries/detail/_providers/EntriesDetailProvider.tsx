import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useShowToast } from '@/fragments/_providers/ToastProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { normalizeEntryDraftData } from '@/services/EntryDraftsService';
import { buildContext } from '@/utils/context';
import { extractTagReferenceIds } from '../_utils';
import type { StickerPickerValue } from '@/fragments/_components/StickerPicker';
import type { EntryDraftCover, EntryDraftData } from '@/repositories/EntryDraftsRepository';
import type { TagViewItem } from '@/repositories/TagsRepository';
import type { ReactNode } from 'react';

type DraftSaveState = 'idle' | 'saving' | 'saved' | 'error';

type EntriesDetailProviderProps = {
  entryId: string;
  initialDraft: EntryDraftData;
  initialSavedAt: number | null;
  children: ReactNode;
};

const AUTOSAVE_DELAY = 800;
const CONTENT_TAG_SYNC_DELAY = 200;

const toUniqueTags = (tags: TagViewItem[]): TagViewItem[] => {
  const tagsById = new Map<string, TagViewItem>();

  tags.forEach(tag => {
    tagsById.set(tag.id, tag);
  });

  return [...tagsById.values()];
};

const toUniqueTagIds = (tagIds: string[]): string[] => [...new Set(tagIds)];

const buildInitialTagState = (initialDraft: EntryDraftData) => {
  const contentTagIds = new Set(extractTagReferenceIds(initialDraft.body));

  return {
    manualTags: initialDraft.tags.filter(tag => !contentTagIds.has(tag.id)),
    contentTags: initialDraft.tags.filter(tag => contentTagIds.has(tag.id)),
    excludedTagIds: initialDraft.excludedTagIds.filter(tagId => contentTagIds.has(tagId)),
  };
};

const [EntriesDetailProvider, useEntriesDetail] = buildContext(
  ({ entryId, initialDraft, initialSavedAt }: EntriesDetailProviderProps) => {
    const services = useServices();
    const showToast = useShowToast();
    const normalizedInitialDraft = useMemo(
      () => normalizeEntryDraftData(initialDraft),
      [initialDraft]
    );
    const initialTagState = useMemo(
      () => buildInitialTagState(normalizedInitialDraft),
      [normalizedInitialDraft]
    );
    const initialResolvedDraft = useMemo(
      () =>
        normalizeEntryDraftData({
          ...normalizedInitialDraft,
          tags: toUniqueTags([
            ...initialTagState.manualTags,
            ...initialTagState.contentTags.filter(
              tag => !initialTagState.excludedTagIds.includes(tag.id)
            ),
          ]),
          excludedTagIds: initialTagState.excludedTagIds,
        }),
      [initialTagState, normalizedInitialDraft]
    );
    const [draftState, setDraftState] = useState(normalizedInitialDraft);
    const [manualTags, setManualTags] = useState(initialTagState.manualTags);
    const [contentTags, setContentTags] = useState(initialTagState.contentTags);
    const [excludedTagIds, setExcludedTagIds] = useState(initialTagState.excludedTagIds);
    const [saveState, setSaveState] = useState<DraftSaveState>(initialSavedAt ? 'saved' : 'idle');
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(initialSavedAt);
    const savedSnapshotRef = useRef(JSON.stringify(initialResolvedDraft));
    const debouncedBody = useDebouncedValue(draftState.body, { delay: CONTENT_TAG_SYNC_DELAY });
    const debouncedContentTagIds = useMemo(
      () => extractTagReferenceIds(debouncedBody),
      [debouncedBody]
    );

    const visibleContentTags = useMemo(
      () => contentTags.filter(tag => !excludedTagIds.includes(tag.id)),
      [contentTags, excludedTagIds]
    );
    const draft = useMemo(
      () =>
        normalizeEntryDraftData({
          ...draftState,
          tags: toUniqueTags([...manualTags, ...visibleContentTags]),
          excludedTagIds,
        }),
      [draftState, excludedTagIds, manualTags, visibleContentTags]
    );
    const resolvedTagsById = useMemo(
      () => new Map(toUniqueTags([...contentTags, ...manualTags]).map(tag => [tag.id, tag])),
      [contentTags, manualTags]
    );
    const draftSnapshot = useMemo(() => JSON.stringify(draft), [draft]);
    const isDirty = draftSnapshot !== savedSnapshotRef.current;
    const contentTagIdsRef = useRef(new Set(contentTags.map(tag => tag.id)));
    const draftTagsRef = useRef(draft.tags);

    useEffect(() => {
      contentTagIdsRef.current = new Set(contentTags.map(tag => tag.id));
    }, [contentTags]);

    useEffect(() => {
      draftTagsRef.current = draft.tags;
    }, [draft.tags]);

    const updateDraft = useCallback((updater: (current: EntryDraftData) => EntryDraftData) => {
      setDraftState(current => normalizeEntryDraftData(updater(current)));
    }, []);

    const setTitle = useCallback(
      (title: string) => {
        updateDraft(current => ({
          ...current,
          title,
        }));
      },
      [updateDraft]
    );

    const setBody = useCallback(
      (body: string) => {
        updateDraft(current => ({
          ...current,
          body,
        }));
      },
      [updateDraft]
    );

    const setDate = useCallback(
      (date: number) => {
        updateDraft(current => ({
          ...current,
          date,
        }));
      },
      [updateDraft]
    );

    const setCover = useCallback(
      (cover: EntryDraftCover | null) => {
        updateDraft(current => ({
          ...current,
          cover,
        }));
      },
      [updateDraft]
    );

    const appendTag = useCallback((tag: TagViewItem) => {
      setManualTags(current => toUniqueTags([...current, tag]));
      setExcludedTagIds(current => current.filter(tagId => tagId !== tag.id));
    }, []);

    const removeTag = useCallback((tagId: string) => {
      setManualTags(current => current.filter(tag => tag.id !== tagId));
      setExcludedTagIds(current => {
        if (!contentTagIdsRef.current.has(tagId)) {
          return current.filter(currentTagId => currentTagId !== tagId);
        }

        return toUniqueTagIds([...current, tagId]);
      });
    }, []);

    const replaceTagsInCategory = useCallback(
      (categoryId: string, nextTags: TagViewItem[]) => {
        const currentCategoryTagIds = new Set(
          draftTagsRef.current.filter(tag => tag.categoryId === categoryId).map(tag => tag.id)
        );
        const nextTagIds = new Set(nextTags.map(tag => tag.id));

        currentCategoryTagIds.forEach(tagId => {
          if (!nextTagIds.has(tagId)) {
            removeTag(tagId);
          }
        });

        nextTags.forEach(tag => {
          if (!currentCategoryTagIds.has(tag.id)) {
            appendTag(tag);
          }
        });
      },
      [appendTag, removeTag]
    );

    const setStickerValue = useCallback(
      async (slot: number, value: StickerPickerValue) => {
        if (value === null) {
          updateDraft(current => ({
            ...current,
            stickers: current.stickers.filter(sticker => sticker.slot !== slot),
          }));
          return;
        }

        if (value.kind === 'emoji') {
          updateDraft(current => ({
            ...current,
            stickers: [
              ...current.stickers.filter(sticker => sticker.slot !== slot),
              {
                slot,
                kind: 'emoji',
                emoji: value.emoji,
              },
            ],
          }));
          return;
        }

        if (!services) {
          return;
        }

        const sticker = await services.stickers.getById(value.stickerId);

        if (!sticker) {
          showToast({
            kind: 'error',
            message: '선택한 스티커를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
          });
          return;
        }

        updateDraft(current => ({
          ...current,
          stickers: [
            ...current.stickers.filter(currentSticker => currentSticker.slot !== slot),
            {
              slot,
              kind: 'sticker',
              sticker,
            },
          ],
        }));
      },
      [services, showToast, updateDraft]
    );

    useEffect(() => {
      setExcludedTagIds(current => current.filter(tagId => debouncedContentTagIds.includes(tagId)));

      if (!services) {
        setContentTags(current => current.filter(tag => debouncedContentTagIds.includes(tag.id)));
        return;
      }

      if (debouncedContentTagIds.length === 0) {
        setContentTags([]);
        return;
      }

      let cancelled = false;

      void services.tags
        .listByIds(debouncedContentTagIds)
        .then(tags => {
          if (cancelled) {
            return;
          }

          const tagsById = new Map(tags.map(tag => [tag.id, tag]));
          setContentTags(
            debouncedContentTagIds.flatMap(tagId => {
              const tag = tagsById.get(tagId);
              return tag ? [tag] : [];
            })
          );
        })
        .catch(error => {
          if (cancelled) {
            return;
          }

          console.error('Failed to resolve content tags', error);
        });

      return () => {
        cancelled = true;
      };
    }, [debouncedContentTagIds, services]);

    useEffect(() => {
      if (!services || !isDirty) {
        return;
      }

      const timeoutId = window.setTimeout(() => {
        setSaveState('saving');

        void services.entryDrafts
          .save({ entryId, data: draft })
          .then(savedDraft => {
            savedSnapshotRef.current = JSON.stringify(normalizeEntryDraftData(savedDraft.data));
            setLastSavedAt(savedDraft.updatedAt);
            setSaveState('saved');
          })
          .catch(error => {
            console.error('Failed to autosave entry draft', error);
            setSaveState('error');
          });
      }, AUTOSAVE_DELAY);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }, [draft, entryId, isDirty, services]);

    const saveStateWithLastSavedAt = useMemo(
      () => ({
        saveState,
        lastSavedAt,
      }),
      [saveState, lastSavedAt]
    );

    return {
      draft,
      isDirty,
      resolvedTagsById,
      saveState: saveStateWithLastSavedAt,
      setTitle,
      setBody,
      setDate,
      setCover,
      appendTag,
      removeTag,
      replaceTagsInCategory,
      setStickerValue,
    };
  }
);

export { EntriesDetailProvider };

export const useEntriesDetailDraft = () => useEntriesDetail(state => state.draft);
export const useEntriesDetailIsDirty = () => useEntriesDetail(state => state.isDirty);
export const useEntriesDetailResolvedTagsById = () =>
  useEntriesDetail(state => state.resolvedTagsById);
export const useEntriesDetailSaveState = () => useEntriesDetail(state => state.saveState);
export const useSetEntriesDetailTitle = () => useEntriesDetail(state => state.setTitle);
export const useSetEntriesDetailBody = () => useEntriesDetail(state => state.setBody);
export const useSetEntriesDetailDate = () => useEntriesDetail(state => state.setDate);
export const useSetEntriesDetailCover = () => useEntriesDetail(state => state.setCover);
export const useAppendEntriesDetailTag = () => useEntriesDetail(state => state.appendTag);
export const useRemoveEntriesDetailTag = () => useEntriesDetail(state => state.removeTag);
export const useReplaceEntriesDetailTagsInCategory = () =>
  useEntriesDetail(state => state.replaceTagsInCategory);
export const useSetEntriesDetailStickerValue = () =>
  useEntriesDetail(state => state.setStickerValue);
