import type { EditorPortal } from '../../_providers/EditorPortalProvider';
import type { TagViewItem } from '@/repositories/TagsRepository';

export type TagPluginProps = {
  portal: EditorPortal;
  fetchTag: (tagId: string) => TagViewItem | null | Promise<TagViewItem | null>;
  rememberTag: (tag: TagViewItem) => void;
  searchTags: (query: string) => Promise<TagViewItem[]>;
  resolveTag: (reference: string) => Promise<TagViewItem | null>;
};
