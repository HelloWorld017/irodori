import EmojiMartPicker from '@emoji-mart/react';
import { useQuery } from '@tanstack/react-query';
import { fetchEmojiData } from '@/utils/emoji';
import { queryKey } from '@/utils/queryKey';

type EmojiPickerPanelProps = {
  onSelect: (emoji: string) => void;
};

const css = String.raw;

export const StickerPickerEmojiPanel = ({ onSelect }: EmojiPickerPanelProps) => {
  const emojiQuery = useQuery({
    queryKey: queryKey('common', 'emoji'),
    queryFn: () => fetchEmojiData(),
  });

  const stylesheet = css`
    .irodori__sticker-picker em-emoji-picker {
      --shadow: none;
      --rgb-color: from var(--color-primary) r g b;
      --rgb-background: from var(--color-base-background) r g b;
      --rgb-accent: from var(--color-highlight) r g b;
      --rgb-input: from var(--color-elevated-background) r g b;
      --color-border: var(--color-elevated-background);
    }
  `;

  return (
    <div className="irodori__sticker-picker mt-3 flex flex-col items-center">
      <style>{stylesheet}</style>

      {emojiQuery.isPending ? (
        <p className="mt-4 text-center text-sm text-tertiary">스티커를 불러오는 중이에요...</p>
      ) : null}

      {emojiQuery.isError ? (
        <p className="mt-4 text-center text-sm text-tertiary">스티커를 불러오지 못했어요.</p>
      ) : null}

      {emojiQuery.data && (
        <EmojiMartPicker
          data={emojiQuery.data}
          emojiVersion={14}
          theme="light"
          locale="ko"
          set="native"
          navPosition="bottom"
          previewPosition="none"
          searchPosition="sticky"
          skinTonePosition="search"
          onEmojiSelect={selection => onSelect(selection.native)}
        />
      )}
    </div>
  );
};
