import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef, useState } from 'react';
import { IconPlus, IconSearch } from '@/fragments/_icons';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useStickerImageUrl } from '@/fragments/_providers/StickerProvider';
import { classes } from '@/utils/classes';
import { queryKey } from '@/utils/queryKey';
import { StickerUploadModal } from './StickerUploadModal';
import type { StickerViewItem } from '@/repositories/StickersRepository';

const STICKER_COLUMNS = 3;
const STICKER_ROW_HEIGHT = 112;

type UploadedSticker = StickerViewItem & { assetId: string };

type StickerPickerStickerPanelProps = {
  selectedStickerId: string | null;
  onSelect: (stickerId: string) => void;
};

type StickerPickerStickerProps = {
  sticker: StickerViewItem & { assetId: string };
  selected: boolean;
  onSelect: (stickerId: string) => void;
};

const isUploadedSticker = (sticker: StickerViewItem): sticker is UploadedSticker =>
  sticker.kind === 'custom' && sticker.assetId !== null;

export const StickerPickerSticker = ({
  sticker,
  selected,
  onSelect,
}: StickerPickerStickerProps) => {
  const previewUrl = useStickerImageUrl(sticker.blobDigest);

  return (
    <button
      type="button"
      onClick={() => onSelect(sticker.id)}
      className={classes(
        'flex h-24 flex-col items-center justify-center gap-1 rounded-xl border px-1 transition',
        selected
          ? 'border-highlight bg-base-background text-highlight'
          : 'border-line bg-base-background text-primary hover:bg-elevated-background'
      )}
      style={{ filter: 'url(#effect-sticker-outline)' }}
      title={sticker.label}
    >
      <div
        className={classes(
          'flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg',
          selected ? 'bg-highlight-foreground' : 'bg-elevated-background'
        )}
      >
        {previewUrl && (
          <img
            src={previewUrl}
            alt={sticker.label}
            className="h-12 w-12 object-contain"
            loading="lazy"
          />
        )}
      </div>
      <span className="line-clamp-1 w-full text-[11px]">{sticker.label}</span>
    </button>
  );
};

export const StickerPickerStickerPanel = ({
  selectedStickerId,
  onSelect,
}: StickerPickerStickerPanelProps) => {
  const services = useServices();

  const [search, setSearch] = useState('');
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const stickersQuery = useQuery({
    queryKey: queryKey('common', 'sticker-picker-list'),
    queryFn: () => services.stickers.list(),
  });

  const uploadedStickers = useMemo(
    () => (stickersQuery.data ?? []).filter(isUploadedSticker),
    [stickersQuery.data]
  );

  const normalizedSearch = search.trim().toLowerCase();
  const filteredStickers = useMemo(
    () =>
      uploadedStickers.filter(sticker =>
        normalizedSearch ? sticker.label.toLowerCase().includes(normalizedSearch) : true
      ),
    [normalizedSearch, uploadedStickers]
  );

  const rowCount = Math.ceil(filteredStickers.length / STICKER_COLUMNS);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => STICKER_ROW_HEIGHT,
    overscan: 5,
  });

  return (
    <>
      <svg className="hidden">
        <defs>
          <filter id="effect-sticker-outline" x="-50%" y="-50%" width="200%" height="200%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="14" result="outline" />
            <feFlood flood-color="white" result="color" />
            <feComposite in="color" in2="outline" operator="in" result="outlineColor" />
            <feMerge>
              <feMergeNode in="outlineColor" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <div className="mt-3 flex items-center gap-2">
        <label
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line
            bg-elevated-background px-2.5 py-2"
        >
          <IconSearch className="text-base text-secondary" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="스티커 검색"
            className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none
              placeholder:text-tertiary"
          />
        </label>
        <button
          type="button"
          onClick={() => setIsUploadModalOpen(true)}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-lg border
            border-line bg-base-background text-base text-secondary transition
            hover:bg-elevated-background hover:text-primary"
          aria-label="스티커 업로드"
        >
          <IconPlus />
        </button>
      </div>

      {stickersQuery.isPending ? (
        <p className="mt-4 text-center text-sm text-tertiary">스티커를 불러오는 중이에요...</p>
      ) : null}

      {stickersQuery.isError ? (
        <p className="mt-4 text-center text-sm text-tertiary">스티커를 불러오지 못했어요.</p>
      ) : null}

      {!stickersQuery.isPending && !stickersQuery.isError ? (
        uploadedStickers.length === 0 ? (
          <p className="mt-4 py-8 text-center text-sm text-tertiary">업로드된 스티커가 없어요.</p>
        ) : filteredStickers.length === 0 ? (
          <p className="mt-4 py-8 text-center text-sm text-tertiary">일치하는 스티커가 없어요.</p>
        ) : (
          <div
            ref={scrollElementRef}
            className="mt-3 h-76 overflow-y-auto rounded-xl border border-line
              bg-elevated-background p-2"
          >
            <div
              className="relative w-full"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {rowVirtualizer.getVirtualItems().map(virtualRow => {
                const baseIndex = virtualRow.index * STICKER_COLUMNS;

                return (
                  <div
                    key={virtualRow.key}
                    className="absolute top-0 left-0 grid w-full grid-cols-3 gap-2"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    {Array.from({ length: STICKER_COLUMNS }, (_, offset) => {
                      const sticker = filteredStickers[baseIndex + offset];
                      if (!sticker) {
                        return (
                          <div
                            key={`empty-${virtualRow.index}-${offset}`}
                            className="h-24 rounded-xl"
                          />
                        );
                      }

                      const selected = selectedStickerId === sticker.id;

                      return (
                        <StickerPickerSticker
                          key={sticker.id}
                          sticker={sticker}
                          selected={selected}
                          onSelect={onSelect}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : null}
      <StickerUploadModal
        open={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploaded={sticker => {
          setIsUploadModalOpen(false);
          onSelect(sticker.id);
        }}
      />
    </>
  );
};
