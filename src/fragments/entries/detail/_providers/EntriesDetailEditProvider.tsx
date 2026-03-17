import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useShowToast } from '@/fragments/_providers/ToastProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { normalizeEntryDraftData } from '@/services/EntryDraftsService';
import { buildContext } from '@/utils/context';
import { queryKey } from '@/utils/queryKey';
import { useTagsFetcher } from '../_hooks/useTagsFetcher';
import { extractAssetReferenceIds } from '../_utils/assetReferences';
import { extractTagReferenceIds } from '../_utils/tagReferences';
import type { StickerPickerValue } from '@/fragments/_components/StickerPicker';
import type { EntryDraftCover, EntryDraftData } from '@/repositories/EntryDraftsRepository';
import type { TagViewItem } from '@/repositories/TagsRepository';
import type { EntryDraftPublishAsset } from '@/services/EntryDraftsService';
import type { ReactNode } from 'react';

type DraftSaveState = 'idle' | 'saving' | 'saved' | 'error';

type EntriesDetailProviderProps = {
  entryId: string;
  initialDraft: EntryDraftData;
  initialSavedAt: number | null;
  children: ReactNode;
};

type DraftDocumentState = Pick<EntryDraftData, 'title' | 'body' | 'date' | 'cover'>;

const AUTOSAVE_DELAY = 800;
const CONTENT_TAG_SYNC_DELAY = 200;

const toUniqueIds = (values: string[]): string[] => [...new Set(values)];

const buildDocumentState = (draft: EntryDraftData): DraftDocumentState => ({
  title: draft.title,
  body: draft.body,
  date: draft.date,
  cover: draft.cover,
});

const buildDraftData = ({
  documentState,
  tagIds,
  stickers,
  excludedTagIds,
}: {
  documentState: DraftDocumentState;
  tagIds: string[];
  stickers: EntryDraftData['stickers'];
  excludedTagIds: string[];
}): EntryDraftData =>
  normalizeEntryDraftData({
    ...documentState,
    tagIds,
    stickers,
    excludedTagIds,
  });

const [EntriesDetailEditProvider, useEntriesDetailEdit] = buildContext(
  ({ entryId, initialDraft, initialSavedAt }: EntriesDetailProviderProps) => {
    const services = useServices();
    const showToast = useShowToast();
    const normalizedInitialDraft = useMemo(
      () => normalizeEntryDraftData(initialDraft),
      [initialDraft]
    );

    const initialDocumentState = useMemo(
      () => buildDocumentState(normalizedInitialDraft),
      [normalizedInitialDraft]
    );

    const initialContentTagIds = useMemo(
      () => extractTagReferenceIds(normalizedInitialDraft.body),
      [normalizedInitialDraft.body]
    );

    const initialEffectiveTagIds = useMemo(
      () =>
        toUniqueIds([
          ...normalizedInitialDraft.tagIds,
          ...initialContentTagIds.filter(
            tagId => !normalizedInitialDraft.excludedTagIds.includes(tagId)
          ),
        ]),
      [initialContentTagIds, normalizedInitialDraft.excludedTagIds, normalizedInitialDraft.tagIds]
    );

    const initialSnapshot = useMemo(
      () =>
        JSON.stringify(
          buildDraftData({
            documentState: initialDocumentState,
            tagIds: initialEffectiveTagIds,
            stickers: normalizedInitialDraft.stickers,
            excludedTagIds: normalizedInitialDraft.excludedTagIds,
          })
        ),
      [
        initialDocumentState,
        initialEffectiveTagIds,
        normalizedInitialDraft.excludedTagIds,
        normalizedInitialDraft.stickers,
      ]
    );

    const [documentState, setDocumentState] = useState(initialDocumentState);
    const [metadataTagIds, setMetadataTagIds] = useState(normalizedInitialDraft.tagIds);
    const [excludedTagIds, setExcludedTagIds] = useState(normalizedInitialDraft.excludedTagIds);
    const [stickers, setStickers] = useState(normalizedInitialDraft.stickers);
    const [saveState, setSaveState] = useState<DraftSaveState>(initialSavedAt ? 'saved' : 'idle');
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(initialSavedAt);
    const savedSnapshotRef = useRef(initialSnapshot);
    const debouncedBody = useDebouncedValue(documentState.body, { delay: CONTENT_TAG_SYNC_DELAY });

    const { getTagQueryOptions } = useTagsFetcher();

    const contentTagIds = useMemo(() => extractTagReferenceIds(debouncedBody), [debouncedBody]);
    const effectiveTagIds = useMemo(
      () =>
        toUniqueIds([
          ...metadataTagIds,
          ...contentTagIds.filter(tagId => !excludedTagIds.includes(tagId)),
        ]),
      [contentTagIds, excludedTagIds, metadataTagIds]
    );

    const resolvedTagIds = useMemo(
      () => toUniqueIds([...metadataTagIds, ...contentTagIds, ...excludedTagIds]),
      [contentTagIds, excludedTagIds, metadataTagIds]
    );

    const resolvedTagsById = useQueries({
      queries: resolvedTagIds.map(tagId => ({
        enabled: true,
        ...getTagQueryOptions(tagId),
      })),
      combine: results =>
        new Map(results.map((result, index) => [resolvedTagIds[index], result.data ?? null])),
    });

    const effectiveTags = useMemo<TagViewItem[]>(
      () => effectiveTagIds.map(tagId => resolvedTagsById.get(tagId)).filter(x => !!x),
      [effectiveTagIds, resolvedTagsById]
    );

    const draft = useMemo(
      () =>
        buildDraftData({
          documentState,
          tagIds: effectiveTagIds,
          stickers,
          excludedTagIds,
        }),
      [documentState, effectiveTagIds, excludedTagIds, stickers]
    );

    const publishAssets = useMemo<EntryDraftPublishAsset[]>(() => {
      const assets = [
        ...extractAssetReferenceIds(draft.body).map(assetId => ({
          assetId,
          usage: 'inline' as const,
        })),
        ...(draft.cover?.id ? [{ assetId: draft.cover.id, usage: 'cover' as const }] : []),
      ] satisfies EntryDraftPublishAsset[];

      return Array.from(
        new Map(assets.map(asset => [`${asset.usage}:${asset.assetId}`, asset] as const)).values()
      );
    }, [draft.body, draft.cover?.id]);

    const draftSnapshot = useMemo(() => JSON.stringify(draft), [draft]);
    const isDirty = draftSnapshot !== savedSnapshotRef.current;

    const publish = useCallback(
      () => services.entryDrafts.publish({ entryId, data: draft, assets: publishAssets }),
      [draft, entryId, publishAssets, services]
    );

    const updateDocumentState = useCallback(
      (updater: (current: DraftDocumentState) => DraftDocumentState) => {
        setDocumentState(current => updater(current));
      },
      []
    );

    const setTitle = useCallback(
      (title: string) => {
        updateDocumentState(current => ({
          ...current,
          title,
        }));
      },
      [updateDocumentState]
    );

    const setBody = useCallback(
      (body: string) => {
        updateDocumentState(current => ({
          ...current,
          body,
        }));
      },
      [updateDocumentState]
    );

    const setDate = useCallback(
      (date: number) => {
        updateDocumentState(current => ({
          ...current,
          date,
        }));
      },
      [updateDocumentState]
    );

    const setCover = useCallback(
      (cover: EntryDraftCover | null) => {
        updateDocumentState(current => ({
          ...current,
          cover,
        }));
      },
      [updateDocumentState]
    );

    const appendTag = useCallback((tagId: string) => {
      setMetadataTagIds(current => toUniqueIds([...current, tagId]));
      setExcludedTagIds(current => current.filter(currentTagId => currentTagId !== tagId));
    }, []);

    const removeTag = useCallback(
      (tagId: string) => {
        setMetadataTagIds(current => current.filter(currentTagId => currentTagId !== tagId));
        setExcludedTagIds(current => [
          ...current,
          ...(contentTagIds.includes(tagId) ? [tagId] : []),
        ]);
      },
      [contentTagIds]
    );

    const setStickerValue = useCallback(
      async (slot: number, value: StickerPickerValue) => {
        if (!value) {
          setStickers(stickers => stickers.filter(sticker => sticker.slot !== slot));
          return;
        }

        if (value?.kind === 'emoji') {
          const sticker = await services?.stickers
            .findOrCreateEmojiSticker({ emoji: value.emoji })
            .catch(error => {
              console.error('Failed to prepare emoji sticker', error);
              showToast({
                kind: 'error',
                message: '선택한 이모지를 스티커로 준비하지 못했어요. 잠시 후 다시 시도해 주세요.',
              });

              return null;
            });

          setStickers(stickers => [
            ...stickers.filter(sticker => sticker.slot !== slot),
            ...(sticker ? [{ slot, stickerId: sticker.id }] : []),
          ]);
          return;
        }

        setStickers(stickers => [
          ...stickers.filter(sticker => sticker.slot !== slot),
          { slot, stickerId: value.stickerId },
        ]);
      },
      [services, showToast]
    );

    const queryClient = useQueryClient();
    useEffect(() => {
      if (!isDirty) {
        return;
      }

      const timeoutId = window.setTimeout(() => {
        setSaveState('saving');

        void services.entryDrafts
          .save({ entryId, data: draft })
          .then(savedDraft => {
            queryClient.removeQueries({ queryKey: queryKey('entriesDetail', 'draft', entryId) });
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
    }, [draft, entryId, isDirty, queryClient, services]);

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
      saveState: saveStateWithLastSavedAt,

      effectiveTags,

      setTitle,
      setBody,
      setDate,
      setCover,
      appendTag,
      removeTag,
      setStickerValue,
      publish,
    };
  }
);

export { EntriesDetailEditProvider };

export const useEntriesDetailDraft = () => useEntriesDetailEdit(state => state.draft);
export const useEntriesDetailIsDirty = () => useEntriesDetailEdit(state => state.isDirty);
export const useEntriesDetailSaveState = () => useEntriesDetailEdit(state => state.saveState);

export const useEntriesDetailEffectiveTags = () =>
  useEntriesDetailEdit(state => state.effectiveTags);

export const useSetEntriesDetailTitle = () => useEntriesDetailEdit(state => state.setTitle);
export const useSetEntriesDetailBody = () => useEntriesDetailEdit(state => state.setBody);
export const useSetEntriesDetailDate = () => useEntriesDetailEdit(state => state.setDate);
export const useSetEntriesDetailCover = () => useEntriesDetailEdit(state => state.setCover);
export const useAppendEntriesDetailTag = () => useEntriesDetailEdit(state => state.appendTag);
export const useRemoveEntriesDetailTag = () => useEntriesDetailEdit(state => state.removeTag);
export const useSetEntriesDetailStickerValue = () =>
  useEntriesDetailEdit(state => state.setStickerValue);
export const usePublishEntriesDetailDraft = () => useEntriesDetailEdit(state => state.publish);
