import type { TagViewItem } from '@/repositories/TagsRepository';

export type TagPluginProps = {
  getTagById: (tagId: string) => TagViewItem | null;
  rememberTag: (tag: TagViewItem) => void;
  searchTags: (query: string) => Promise<TagViewItem[]>;
  resolveTag: (reference: string) => Promise<TagViewItem | null>;
};
