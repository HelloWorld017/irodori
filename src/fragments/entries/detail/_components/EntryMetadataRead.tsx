import { useMemo } from 'react';
import { AssetImage } from '@/fragments/_components/AssetImage';
import { Tag } from '@/fragments/_components/Tag';
import { formatDate } from '@/utils/date';
import { buildEntryMetadataTagSections } from '../_utils/buildEntryMetadataTagSections';
import type { TagCategory } from '@/repositories/TagCategoriesRepository';
import type { EntryDetailItem } from '@/services/EntriesService';

type EntryMetadataReadProps = {
  className?: string;
  entry: EntryDetailItem;
  tagCategories: TagCategory[];
};

export const EntryMetadataRead = ({ className, entry, tagCategories }: EntryMetadataReadProps) => {
  const tagSections = useMemo(
    () =>
      tagCategories
        ? buildEntryMetadataTagSections({ categories: tagCategories, tags: entry.tags })
        : null,
    [entry.tags, tagCategories]
  );

  const visibleCategorySections = useMemo(
    () => tagSections?.categories.filter(category => category.tags.length > 0) ?? [],
    [tagSections]
  );

  return (
    <aside className={className}>
      <section className="space-y-2">
        <p className="text-sm font-medium text-secondary">날짜</p>
        <time dateTime={new Date(entry.date).toISOString()} className="text-base text-primary">
          {formatDate(entry.date)}
        </time>
      </section>

      {tagSections && tagSections.missingTags.length > 0 ? (
        <section className="space-y-3">
          <p className="text-sm font-medium text-secondary">태그</p>
          <div className="flex flex-wrap gap-2">
            {tagSections.missingTags.map(tag => (
              <Tag key={tag.id} {...tag} />
            ))}
          </div>
        </section>
      ) : null}

      {visibleCategorySections.map(category => (
        <section key={category.id} className="space-y-3">
          <p className="text-sm font-medium text-secondary">{category.label}</p>

          <div className="flex flex-wrap gap-2">
            {category.tags.map(tag => (
              <Tag key={tag.id} {...tag} />
            ))}
          </div>
        </section>
      ))}

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
                  <span className="font-emoji text-3xl leading-none">{sticker.emoji}</span>
                ) : (
                  sticker.blobDigest && (
                    <AssetImage
                      asset={{ ...sticker, blobDigest: sticker.blobDigest }}
                      alt={sticker.label}
                      fill="contain"
                    />
                  )
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
