import { useMemo, useState } from 'react';
import { StickerPicker } from '@/fragments/_components/StickerPicker';
import { Tag } from '@/fragments/_components/Tag';
import { TagsPicker } from '../../_components/TagsPicker';
import { useEntriesNotebookId } from '../../_providers/EntriesProvider';
import {
  useAppendEntriesDetailTag,
  useEntriesDetailDraft,
  useEntriesDetailEffectiveTags,
  useRemoveEntriesDetailTag,
  useSetEntriesDetailDate,
  useSetEntriesDetailStickerValue,
} from '../_providers/EntriesDetailProvider';
import { buildEntryMetadataTagSections } from '../_utils/buildEntryMetadataTagSections';
import type { TagCategory } from '@/repositories/TagCategoriesRepository';

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

const toStickerPickerValue = (stickerId: string | null) =>
  stickerId
    ? {
        kind: 'sticker' as const,
        stickerId,
      }
    : null;

const buildCategoryRuleLabel = ({
  minSelect,
  maxSelect,
}: {
  minSelect: number;
  maxSelect: number | null;
}): string | null => {
  const parts: string[] = [];

  if (minSelect > 0) {
    parts.push(`최소 ${minSelect}개`);
  }

  if (maxSelect !== null) {
    parts.push(`최대 ${maxSelect}개`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
};

type EntryMetadataEditProps = {
  className?: string;
  tagCategories: TagCategory[];
};

export const EntryMetadataEdit = ({ className, tagCategories }: EntryMetadataEditProps) => {
  const notebookId = useEntriesNotebookId();
  const draft = useEntriesDetailDraft();
  const effectiveTags = useEntriesDetailEffectiveTags();
  const setDate = useSetEntriesDetailDate();
  const appendTag = useAppendEntriesDetailTag();
  const removeTag = useRemoveEntriesDetailTag();
  const setStickerValue = useSetEntriesDetailStickerValue();

  const [tagsDraftByCategory, setTagsDraftByCategory] = useState<Record<string, string>>({});
  const tagSections = useMemo(
    () => buildEntryMetadataTagSections({ categories: tagCategories, tags: effectiveTags }),
    [effectiveTags, tagCategories]
  );

  return (
    <aside className={className}>
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

      {tagSections?.missingTags.length ? (
        <section className="space-y-3">
          <p className="text-sm font-medium text-secondary">태그</p>
          <div className="flex flex-wrap gap-2">
            {tagSections.missingTags.map(tag => (
              <Tag key={tag.id} {...tag} onRemove={() => removeTag(tag.id)} />
            ))}
          </div>
        </section>
      ) : null}

      {tagSections?.categories.map(category => {
        const ruleLabel = buildCategoryRuleLabel(category);

        return (
          <section key={category.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-secondary">{category.label}</p>
              {ruleLabel ? <p className="text-xs text-tertiary">{ruleLabel}</p> : null}
            </div>

            <TagsPicker
              notebookId={notebookId}
              tagsCategoryId={category.id}
              value={{
                draft: tagsDraftByCategory[category.id] ?? '',
                tags: category.tags,
              }}
              allowCreateTag
              placeholder="태그 검색"
              onChange={({ draft: nextDraftInput }) => {
                setTagsDraftByCategory(current => ({
                  ...current,
                  [category.id]: nextDraftInput,
                }));
              }}
              onAddTag={tagId => appendTag(tagId)}
              onRemoveTag={tagId => removeTag(tagId)}
            />
          </section>
        );
      })}

      {tagSections &&
      tagSections.missingTags.length === 0 &&
      tagSections.categories.length === 0 ? (
        <p className="text-sm text-tertiary">아직 태그 카테고리가 없어요.</p>
      ) : null}

      <section className="space-y-3">
        <p className="text-sm font-medium text-secondary">스티커</p>
        <div className="flex gap-3">
          {Array.from({ length: 3 }, (_, index) => {
            const slot = index + 1;
            const stickerId =
              draft.stickers.find(sticker => sticker.slot === slot)?.stickerId ?? null;

            return (
              <StickerPicker
                key={slot}
                value={toStickerPickerValue(stickerId)}
                onChange={nextValue => void setStickerValue(slot, nextValue)}
              />
            );
          })}
        </div>
      </section>
    </aside>
  );
};
