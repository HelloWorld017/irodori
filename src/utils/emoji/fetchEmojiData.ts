import type { EmojiData } from '@emoji-mart/react';

const EMOJI_DATA_URL = 'https://cdn.jsdelivr.net/npm/@emoji-mart/data@1.2.1';

let emojiData: EmojiData | null = null;
let emojiDataPromise: Promise<EmojiData | null> | null = null;

export const fetchEmojiData = async () => {
  if (emojiData ?? emojiDataPromise) {
    return emojiData ?? emojiDataPromise;
  }

  emojiDataPromise = fetch(EMOJI_DATA_URL)
    .then(response => response.json() as Promise<EmojiData>)
    .catch(() => null);

  emojiData = await emojiDataPromise;
  emojiDataPromise = null;

  return emojiData;
};
