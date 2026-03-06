import { useState } from 'react';
import { StickerPicker, type StickerPickerValue } from '@/fragments/_components/StickerPicker';
import { TagsPicker } from '../../_components/TagsPicker';
import { useEntriesNotebookId } from '../../_providers/EntriesProvider';
import {
  useEntriesDetailDraft,
  useSetEntriesDetailDate,
  useSetEntriesDetailStickerValue,
  useSetEntriesDetailTags,
} from '../_providers/EntriesDetailProvider';
import type { EntryDraftSticker } from '@/repositories/EntryDraftsRepository';

const toDateInputValue = (value: number): string => {
  const date = new Date(value);
  const pad2 = (part: number) => part.toString().padStart(2, '0');

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const toDateFromInputValue = (value: string, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const nextValue = new Date(`${value}T00:00:00`).getTime();
  return Number.isFinite(nextValue) ? nextValue : fallback;
};

const toStickerPickerValue = (sticker: EntryDraftSticker | null): StickerPickerValue => {
  if (!sticker) {
    return null;
  }

  if (sticker.kind === 'emoji') {
    return { kind: 'emoji', emoji: sticker.emoji };
  }

  return { kind: 'sticker', stickerId: sticker.sticker.id };
};

export const EntryMetadataEdit = () => {
  const notebookId = useEntriesNotebookId();
  const draft = useEntriesDetailDraft();
  const setDate = useSetEntriesDetailDate();
  const setTags = useSetEntriesDetailTags();
  const setStickerValue = useSetEntriesDetailStickerValue();
  const [tagsDraftInput, setTagsDraftInput] = useState('');

  return (
    <aside className="space-y-5 rounded-[1.75rem] p-6">
      <section className="space-y-2">
        <p className="text-sm font-medium text-secondary">날짜</p>
        <input
          type="date"
          value={toDateInputValue(draft.date)}
          onChange={event => setDate(toDateFromInputValue(event.target.value, draft.date))}
          className="w-full rounded-xl border border-line bg-base-background px-3 py-2 text-sm
            text-primary outline-none focus-visible:ring-2 focus-visible:ring-highlight"
        />
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium text-secondary">태그</p>
        <TagsPicker
          notebookId={notebookId}
          value={{ draft: tagsDraftInput, tags: draft.tags }}
          allowCreateTag={false}
          placeholder="태그를 추가하세요"
          onChange={({ draft: nextDraftInput, tags }) => {
            setTagsDraftInput(nextDraftInput);
            setTags(tags);
          }}
          onSubmit={({ draft: nextDraftInput, tags }) => {
            setTagsDraftInput(nextDraftInput);
            setTags(tags);
          }}
        />
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium text-secondary">스티커</p>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }, (_, index) => {
            const slot = index + 1;
            const value = toStickerPickerValue(
              draft.stickers.find(sticker => sticker.slot === slot) ?? null
            );

            return (
              <div key={slot} className="space-y-2 text-center">
                <StickerPicker
                  value={value}
                  className="w-full"
                  onChange={nextValue => void setStickerValue(slot, nextValue)}
                />
                <p className="text-xs text-tertiary">슬롯 {slot}</p>
              </div>
            );
          })}
        </div>
      </section>
    </aside>
  );
};
