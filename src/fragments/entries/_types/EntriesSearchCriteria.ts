import type { TagWithColor } from '@/repositories/TagsRepository';

export type EntriesSearchCriteria = {
  draft: string;
  tags: TagWithColor[];
  dateBefore: number | null;
};
