import type { TagViewItem } from '@/repositories/TagsRepository';

export type EntriesSearchCriteria = {
  draft: string;
  tags: TagViewItem[];
  dateBefore: number | null;
};
