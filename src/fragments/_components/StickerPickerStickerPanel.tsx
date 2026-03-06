import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef, useState } from 'react';
import { IconSearch } from '@/fragments/_icons';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { queryKey } from '@/utils/queryKey';
import { StickerPickerSticker } from './StickerPickerSticker';
import type { StickerViewItem } from '@/repositories/StickersRepository';

const STICKER_COLUMNS = 3;
const STICKER_ROW_HEIGHT = 112;

type UploadedSticker = StickerViewItem & { assetId: string };

type StickerPickerStickerPanelProps = {
  selectedStickerId: string | null;
  onSelect: (stickerId: string) => void;
};

const isUploadedSticker = (sticker: StickerViewItem): sticker is UploadedSticker =>
  sticker.kind === 'custom' && sticker.assetId !== null;

export const StickerPickerStickerPanel = ({
  selectedStickerId,
  onSelect,
}: StickerPickerStickerPanelProps) => {
  const services = useServices();

  const [search, setSearch] = useState('');
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const stickersQuery = useQuery({
    enabled: services !== null,
    queryKey: queryKey('common', 'sticker-picker-list'),
    queryFn: () => services!.stickers.list(),
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
      <label
        className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-elevated-background
          px-2.5 py-2"
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

      {stickersQuery.isPending ? (
        <p className="mt-4 text-center text-sm text-tertiary">스티커를 불러오는 중이에요...</p>
      ) : null}

      {stickersQuery.isError ? (
        <p className="mt-4 text-center text-sm text-tertiary">스티커를 불러오지 못했어요.</p>
      ) : null}

      {!stickersQuery.isPending && !stickersQuery.isError ? (
        uploadedStickers.length === 0 ? (
          <p className="mt-4 text-center text-sm text-tertiary">업로드된 스티커가 없어요.</p>
        ) : filteredStickers.length === 0 ? (
          <p className="mt-4 text-center text-sm text-tertiary">일치하는 스티커가 없어요.</p>
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
    </>
  );
};
