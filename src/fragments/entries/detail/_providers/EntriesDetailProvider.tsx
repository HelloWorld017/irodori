import { buildContext } from '@/utils/context';
import type { EntryDetailItem } from '@/services/EntriesService';
import type { ReactNode } from 'react';

type EntriesDetailProviderProps = {
  entry: EntryDetailItem;
  children: ReactNode;
};

const [EntriesDetailProvider, useEntriesDetail] = buildContext(
  ({ entry }: EntriesDetailProviderProps) => ({
    entry,
  })
);

export { EntriesDetailProvider };

export const useEntriesDetailEntry = () => useEntriesDetail(state => state.entry);
