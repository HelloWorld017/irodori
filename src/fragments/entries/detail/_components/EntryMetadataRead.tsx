import { useMemo } from 'react';
import { AssetImage } from '@/fragments/_components/AssetImage';
import { Tag } from '@/fragments/_components/Tag';
import { DynamicIcon } from '@/fragments/_icons';
import { formatDate } from '@/utils/date';
import { buildTagCategoryGroups } from '../_utils/buildTagCategoryGroups';
import type { TagCategory } from '@/repositories/TagCategoriesRepository';
import type { EntryDetailItem } from '@/services/EntriesService';

const buildCategoryRuleLabel = ({
  minSelect,
  maxSelect,
  required,
}: {
  minSelect: number;
  maxSelect: number | null;
  required: boolean;
}): string | null => {
  const parts: string[] = [];

  if (required) {
    parts.push('필수');
  }

  if (minSelect > 0) {
    parts.push(`최소 ${minSelect}개`);
  }

  if (maxSelect !== null) {
    parts.push(`최대 ${maxSelect}개`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
};

export const EntryMetadataRead = ({
  entry,
  tagCategories,
}: {
  entry: EntryDetailItem;
  tagCategories: TagCategory[] | null;
}) => {
  const tagCategoryGroups = useMemo(
    () =>
      tagCategories
        ? buildTagCategoryGroups({ categories: tagCategories, tags: entry.tags }).filter(
            category => category.tags.length > 0
          )
        : [],
    [entry.tags, tagCategories]
  );

  return (
    <aside className="space-y-5 rounded-[1.75rem] p-6">
      <section className="space-y-2">
        <p className="text-sm font-medium text-secondary">날짜</p>
        <time dateTime={new Date(entry.date).toISOString()} className="text-base text-primary">
          {formatDate(entry.date)}
        </time>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium text-secondary">태그</p>

        {entry.tags.length === 0 ? (
          <p className="text-sm text-tertiary">아직 태그가 없어요.</p>
        ) : null}

        {entry.tags.length > 0 && tagCategories === null ? (
          <div className="flex flex-wrap gap-2">
            {entry.tags.map(tag => (
              <Tag key={tag.id} {...tag} />
            ))}
          </div>
        ) : null}

        {entry.tags.length > 0 && tagCategories !== null ? (
          <div className="space-y-4">
            {tagCategoryGroups.map(category => {
              const ruleLabel = buildCategoryRuleLabel(category);

              return (
                <section key={category.id} className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      {category.icon ? (
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full border
                            border-line bg-base-background text-secondary"
                        >
                          <DynamicIcon name={category.icon} className="text-sm" />
                        </span>
                      ) : null}
                      <span className="font-medium text-primary">{category.label}</span>
                      {category.color ? (
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: category.color }}
                          aria-hidden="true"
                        />
                      ) : null}
                    </div>

                    {ruleLabel ? <p className="text-xs text-tertiary">{ruleLabel}</p> : null}
                    {category.isMissing ? (
                      <p className="text-xs text-tertiary">현재는 삭제된 카테고리예요.</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {category.tags.map(tag => (
                      <Tag key={tag.id} {...tag} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium text-secondary">스티커</p>
        <div className="flex flex-wrap gap-3">
          {entry.stickers.length > 0 ? (
            entry.stickers.map(({ slot, sticker }) => (
              <div
                key={slot}
                className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl
                  border border-line bg-base-background"
                title={sticker.label}
              >
                {sticker.kind === 'emoji' && sticker.emoji ? (
                  <span className="text-3xl leading-none">{sticker.emoji}</span>
                ) : (
                  <AssetImage
                    blobDigest={sticker.blobDigest}
                    alt={sticker.label}
                    className="h-full w-full"
                    imageClassName="h-full w-full object-contain p-2"
                  />
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-tertiary">아직 붙인 스티커가 없어요.</p>
          )}
        </div>
      </section>
    </aside>
  );
};
