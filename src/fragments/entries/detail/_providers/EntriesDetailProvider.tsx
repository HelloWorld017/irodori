import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useShowToast } from '@/fragments/_providers/ToastProvider';
import { normalizeEntryDraftData } from '@/services/EntryDraftsService';
import { buildContext } from '@/utils/context';
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

const [EntriesDetailProvider, useEntriesDetail] = buildContext(
  ({ entryId, initialDraft, initialSavedAt }: EntriesDetailProviderProps) => {
    const services = useServices();
    const showToast = useShowToast();
    const [draft, setDraft] = useState(() => normalizeEntryDraftData(initialDraft));
    const [saveState, setSaveState] = useState<DraftSaveState>(initialSavedAt ? 'saved' : 'idle');
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(initialSavedAt);
    const savedSnapshotRef = useRef(JSON.stringify(normalizeEntryDraftData(initialDraft)));

    const draftSnapshot = useMemo(() => JSON.stringify(draft), [draft]);
    const isDirty = draftSnapshot !== savedSnapshotRef.current;

    const updateDraft = useCallback((updater: (current: EntryDraftData) => EntryDraftData) => {
      setDraft(current => normalizeEntryDraftData(updater(current)));
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

    const setTags = useCallback(
      (tags: TagViewItem[]) => {
        updateDraft(current => ({
          ...current,
          tags,
        }));
      },
      [updateDraft]
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
      saveState: saveStateWithLastSavedAt,
      setTitle,
      setBody,
      setDate,
      setCover,
      setTags,
      setStickerValue,
    };
  }
);

export { EntriesDetailProvider };

export const useEntriesDetailDraft = () => useEntriesDetail(state => state.draft);
export const useEntriesDetailIsDirty = () => useEntriesDetail(state => state.isDirty);
export const useEntriesDetailSaveState = () => useEntriesDetail(state => state.saveState);
export const useSetEntriesDetailTitle = () => useEntriesDetail(state => state.setTitle);
export const useSetEntriesDetailBody = () => useEntriesDetail(state => state.setBody);
export const useSetEntriesDetailDate = () => useEntriesDetail(state => state.setDate);
export const useSetEntriesDetailCover = () => useEntriesDetail(state => state.setCover);
export const useSetEntriesDetailTags = () => useEntriesDetail(state => state.setTags);
export const useSetEntriesDetailStickerValue = () =>
  useEntriesDetail(state => state.setStickerValue);
