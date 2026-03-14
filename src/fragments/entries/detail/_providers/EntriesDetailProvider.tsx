import { buildContext } from '@/utils/context';
import type { Asset } from '@/repositories/AssetsRepository';
import type { EntryDetailItem } from '@/services/EntriesService';
import type { ReactNode } from 'react';

type EntriesDetailProviderProps = {
  entry: EntryDetailItem;
  assets: Asset[];
  children: ReactNode;
};

const [EntriesDetailProvider, useEntriesDetail] = buildContext(
  ({ entry, assets }: EntriesDetailProviderProps) => ({
    entry,
    assets,
  })
);

export { EntriesDetailProvider };

export const useEntriesDetailEntry = () => useEntriesDetail(state => state.entry);

export const useEntriesDetailAssets = () => useEntriesDetail(state => state.assets);
