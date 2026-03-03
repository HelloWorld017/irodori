import type { Tag } from '@/repositories/TagsRepository';

export type EntriesSearchCriteria = {
  draft: string;
  tags: Tag[];
  dateBefore: number | null;
};

export const DEFAULT_ENTRIES_SEARCH_CRITERIA: EntriesSearchCriteria = {
  draft: '',
  tags: [],
  dateBefore: null,
};
