import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StickerPickerStickerPanel } from '@/fragments/_components/StickerPickerStickerPanel';
import { IconTrash, IconX } from '@/fragments/_icons';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { StickerProvider } from '@/fragments/_providers/StickerProvider';
import { classes } from '@/utils/classes';
import { queryKey } from '@/utils/queryKey';
import { AssetImage } from './AssetImage';
import { StickerPickerEmojiPanel } from './StickerPickerEmojiPanel';

type StickerPickerTab = 'sticker' | 'emoji';

export type StickerPickerValue =
  | { kind: 'sticker'; stickerId: string }
  | { kind: 'emoji'; emoji: string }
  | null;

type StickerPickerProps = {
  value: StickerPickerValue;
  disabled?: boolean;
  className?: string;
  onChange: (value: StickerPickerValue) => void;
};

export const StickerPicker = ({
  value,
  disabled = false,
  className,
  onChange,
}: StickerPickerProps) => {
  const services = useServices();
  const [tab, setTab] = useState<StickerPickerTab>(value?.kind === 'emoji' ? 'emoji' : 'sticker');
  const selectedStickerId = value?.kind === 'sticker' ? value.stickerId : null;
  const selectedStickerQuery = useQuery({
    enabled: selectedStickerId !== null,
    queryKey: queryKey('common', 'sticker-picker-selected', selectedStickerId),
    queryFn: () => services.stickers.getById(selectedStickerId!),
  });

  const displayedSticker = selectedStickerQuery.data ?? null;
  const emoji = value?.kind === 'emoji' ? value.emoji : displayedSticker?.emoji;

  return (
    <Popover className={classes('relative', className)}>
      {({ close }) => (
        <>
          <PopoverButton
            type="button"
            disabled={disabled}
            className={classes(
              `flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border
              border-line bg-elevated-background text-primary transition hover:bg-base-background
              focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2
              focus-visible:ring-offset-base-background focus-visible:outline-none
              disabled:cursor-not-allowed`,
              value !== null && 'border-highlight'
            )}
            aria-label="스티커 선택"
          >
            {emoji ? (
              <span className="text-[1.5rem] leading-none">{emoji}</span>
            ) : displayedSticker?.blobDigest ? (
              <AssetImage
                blobDigest={displayedSticker.blobDigest}
                alt={displayedSticker.label}
                className="h-full w-full"
                imageClassName="h-full w-full object-cover"
              />
            ) : null}
          </PopoverButton>

          <PopoverPanel
            anchor={{ to: 'bottom start', gap: 8 }}
            className="z-40 w-95 max-w-[calc(100vw-2rem)] rounded-2xl border border-line
              bg-base-background p-3 shadow-elevated"
          >
            <StickerProvider cacheMax={120}>
              <div className="flex items-center justify-between gap-2">
                <div
                  className="flex items-center gap-1 rounded-lg border border-line
                    bg-elevated-background p-1"
                >
                  <button
                    type="button"
                    onClick={() => setTab('sticker')}
                    className={classes(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition',
                      tab === 'sticker'
                        ? 'bg-base-background text-primary'
                        : 'text-tertiary hover:text-primary'
                    )}
                  >
                    스티커
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab('emoji')}
                    className={classes(
                      'rounded-md px-3 py-1.5 text-sm font-medium transition',
                      tab === 'emoji'
                        ? 'bg-base-background text-primary'
                        : 'text-tertiary hover:text-primary'
                    )}
                  >
                    이모지
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onChange(null);
                      close();
                    }}
                    disabled={value === null}
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border
                      border-line bg-base-background text-base text-secondary transition
                      hover:bg-elevated-background hover:text-primary disabled:cursor-not-allowed
                      disabled:opacity-50"
                    aria-label="스티커 선택 해제"
                  >
                    <IconTrash />
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border
                      border-line bg-base-background text-base text-secondary transition
                      hover:bg-elevated-background hover:text-primary disabled:cursor-not-allowed
                      disabled:opacity-50"
                    aria-label="닫기"
                  >
                    <IconX />
                  </button>
                </div>
              </div>

              {tab === 'sticker' ? (
                <StickerPickerStickerPanel
                  selectedStickerId={selectedStickerId}
                  onSelect={stickerId => {
                    onChange({ kind: 'sticker', stickerId });
                    close();
                  }}
                />
              ) : (
                <StickerPickerEmojiPanel
                  onSelect={emoji => {
                    onChange({ kind: 'emoji', emoji });
                    close();
                  }}
                />
              )}
            </StickerProvider>
          </PopoverPanel>
        </>
      )}
    </Popover>
  );
};
