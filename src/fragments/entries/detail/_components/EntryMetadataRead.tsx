import { AssetImage } from '@/fragments/_components/AssetImage';
import { Tag } from '@/fragments/_components/Tag';
import { formatDate } from '@/utils/date';
import type { EntryDetailItem } from '@/services/EntriesService';

export const EntryMetadataRead = ({ entry }: { entry: EntryDetailItem }) => (
  <aside className="space-y-5 rounded-[1.75rem] p-6">
    <section className="space-y-2">
      <p className="text-sm font-medium text-secondary">날짜</p>
      <time dateTime={new Date(entry.date).toISOString()} className="text-base text-primary">
        {formatDate(entry.date)}
      </time>
    </section>

    <section className="space-y-3">
      <p className="text-sm font-medium text-secondary">태그</p>
      <div className="flex flex-wrap gap-2">
        {entry.tags.length > 0 ? (
          entry.tags.map(tag => <Tag key={tag.id} {...tag} />)
        ) : (
          <p className="text-sm text-tertiary">아직 태그가 없어요.</p>
        )}
      </div>
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
