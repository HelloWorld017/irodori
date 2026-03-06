declare module '@emoji-mart/react' {
  export interface EmojiDataCategory {
    id: string;
    emojis: string[];
  }

  export interface EmojiItem {
    id: string;
    name: string;
    native: string;
    shortcodes: string;
    unified: string;
    emoticons: string[];
    keywords: string[];
  }

  export interface EmojiDataItem {
    id: string;
    keywords: string[];
    name: string;
    skins: { unified: string; native: string }[];
    version: number;
  }

  export interface EmojiData {
    aliases: Record<string, string>;
    categories: EmojiDataCategory[];
    emojis: Record<string, EmojiDataItem>;
    sheet: {
      cols: number;
      rows: number;
    };
  }

  export type PickerLocale =
    | 'ar'
    | 'be'
    | 'cs'
    | 'de'
    | 'en'
    | 'es'
    | 'fa'
    | 'fi'
    | 'fr'
    | 'hi'
    | 'it'
    | 'ja'
    | 'ko'
    | 'nl'
    | 'pl'
    | 'pt'
    | 'ru'
    | 'sa'
    | 'tr'
    | 'uk'
    | 'vi'
    | 'zh';

  export interface PickerProps {
    data: EmojiData;
    onEmojiSelect: (item: EmojiItem, e: React.MouseEvent) => void;
    onClickOutside?: (e: React.MouseEvent) => void;

    autoFocus?: boolean;
    dynamicWidth?: boolean;
    emojiButtonColors?: string;
    emojiButtonRadius?: string;
    emojiButtonSize?: number;
    emojiSize?: number;
    emojiVersion?: 1 | 2 | 3 | 4 | 5 | 11 | 12 | 12.1 | 13 | 13.1 | 14 | 15;
    exceptEmojis?: string[];
    icons?: 'auto' | 'outline' | 'solid';
    locale?: PickerLocale;
    maxFrequentRows?: number;
    navPosition?: 'top' | 'bottom' | 'none';
    noCountryFlags?: boolean;
    noResultsEmoji?: null | 'string';
    perLine?: number;
    previewEmoji?: null | 'string';
    previewPosition?: 'top' | 'bottom' | 'none';
    searchPosition?: 'sticky' | 'static' | 'none';
    set?: 'native' | 'apple' | 'facebook' | 'google' | 'twitter';
    skin?: 1 | 2 | 3 | 4 | 5 | 6;
    skinTonePosition?: 'preview' | 'search' | 'none';
    theme?: 'auto' | 'light' | 'dark';
  }

  declare const Picker: (props: PickerProps) => React.JSX.Element;
  export default Picker;
}
