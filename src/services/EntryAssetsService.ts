import type { Services } from '.';
import type { Repositories } from '@/repositories';
import type { Asset } from '@/repositories/AssetsRepository';
import type { EntryAssetUsage } from '@/repositories/EntryAssetsRepository';

const toUniqueValues = <T>(values: T[]): T[] => [...new Set(values)];

export class EntryAssetsService {
  private readonly repositories: Repositories;

  constructor(repositories: Repositories, _services: Services) {
    this.repositories = repositories;
  }

  async listByEntryId(
    entryId: string,
    options: { usage?: EntryAssetUsage } = {}
  ): Promise<Asset[]> {
    const entryAssets = await this.repositories.entryAssets.listEntryAssetsByEntryId(entryId, {
      usage: options.usage ?? 'inline',
    });
    const assetIds = toUniqueValues(entryAssets.map(entryAsset => entryAsset.assetId));

    if (assetIds.length === 0) {
      return [];
    }

    const assets = await this.repositories.assets.listAssetsByIds(assetIds);
    const assetsById = new Map(assets.map(asset => [asset.id, asset] as const));

    return assetIds.map(assetId => assetsById.get(assetId)).filter(asset => asset !== undefined);
  }
}
