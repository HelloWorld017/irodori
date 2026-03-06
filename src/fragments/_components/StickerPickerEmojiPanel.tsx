import EmojiMartPicker from '@emoji-mart/react';
import { useQuery } from '@tanstack/react-query';
import { fetchEmojiData } from '@/utils/emoji';
import { queryKey } from '@/utils/queryKey';

type EmojiPickerPanelProps = {
  onSelect: (emoji: string) => void;
};

export const StickerPickerEmojiPanel = ({ onSelect }: EmojiPickerPanelProps) => {
  const emojiQuery = useQuery({
    queryKey: queryKey('common', 'emoji'),
    queryFn: () => fetchEmojiData(),
  });

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-line bg-elevated-background p-1">
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
          locale="ko"
          set="native"
          theme="light"
          dynamicWidth
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
