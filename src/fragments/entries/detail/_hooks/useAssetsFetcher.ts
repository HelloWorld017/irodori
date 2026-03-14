import { useQueryClient } from '@tanstack/react-query';
import { create, keyResolver, windowScheduler } from '@yornaath/batshit';
import { useMemo } from 'react';
import { BATCH_WINDOW_MS } from '@/constants/batch';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { batchKey, queryKey } from '@/utils/queryKey';
import { useEntriesDetailAssets } from '../_providers/EntriesDetailProvider';
import type { Asset } from '@/repositories/AssetsRepository';

export const useAssetsFetcher = () => {
  const services = useServices();
  const queryClient = useQueryClient();
  const assets = useEntriesDetailAssets();
  const initialAssetsById = useMemo(
    () => new Map(assets.map(asset => [asset.id, asset] as const)),
    [assets]
  );

  const fetchAsset = useMemo(
    () =>
      create<Asset[], string, Asset | null>({
        name: batchKey('common', 'assets'),
        fetcher: async resolvedAssetIds =>
          services.assets.listByIds([...new Set(resolvedAssetIds)]),
        resolver: keyResolver('id'),
        scheduler: windowScheduler(BATCH_WINDOW_MS),
      }),
    [services]
  );

  const getAssetQueryOptions = useMemo(
    () => (assetId: string) => ({
      queryKey: queryKey('entriesDetail', 'detail-asset', assetId),
      queryFn: () => fetchAsset.fetch(assetId),
      initialData: initialAssetsById.get(assetId),
    }),
    [fetchAsset, initialAssetsById]
  );

  const fetchAssetWithCache = useMemo(
    () =>
      (assetId: string): Asset | null | Promise<Asset | null> => {
        const cachedAsset = queryClient.getQueryData<Asset | null>(
          queryKey('entriesDetail', 'detail-asset', assetId)
        );

        if (cachedAsset !== undefined) {
          return cachedAsset;
        }

        const initialAsset = initialAssetsById.get(assetId);
        if (initialAsset) {
          return initialAsset;
        }

        return queryClient.fetchQuery(getAssetQueryOptions(assetId));
      },
    [getAssetQueryOptions, initialAssetsById, queryClient]
  );

  return {
    fetchAsset: fetchAssetWithCache,
    getAssetQueryOptions,
  };
};
