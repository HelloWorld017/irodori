import { useStickerPreviewUrl } from '@/fragments/_providers/StickerProvider';
import { classes } from '@/utils/classes';
import type { StickerViewItem } from '@/repositories/StickersRepository';

type StickerPickerStickerProps = {
  sticker: StickerViewItem & { assetId: string };
  selected: boolean;
  onSelect: (stickerId: string) => void;
};

export const StickerPickerSticker = ({
  sticker,
  selected,
  onSelect,
}: StickerPickerStickerProps) => {
  const previewUrl = useStickerPreviewUrl(sticker.blobDigest);

  return (
    <button
      type="button"
      onClick={() => onSelect(sticker.id)}
      className={classes(
        'flex h-24 flex-col items-center justify-center gap-1 rounded-xl border px-1 transition',
        selected
          ? 'border-highlight bg-highlight text-highlight-foreground'
          : 'border-line bg-base-background text-primary hover:bg-elevated-background'
      )}
      title={sticker.label}
    >
      <div
        className={classes(
          'flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg',
          selected ? 'bg-highlight-foreground/20' : 'bg-elevated-background'
        )}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={sticker.label}
            className="h-12 w-12 object-contain"
            loading="lazy"
          />
        ) : (
          <span className="px-1 text-[10px] leading-tight text-secondary">{sticker.label}</span>
        )}
      </div>
      <span className="line-clamp-1 w-full text-[11px]">{sticker.label}</span>
    </button>
  );
};
