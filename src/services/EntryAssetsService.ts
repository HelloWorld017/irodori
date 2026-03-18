import { toEntryAssetEntityId } from '@/repositories/EntryAssetsRepository';
import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type { Asset } from '@/repositories/AssetsRepository';
import type { EntryAsset, EntryAssetUsage } from '@/repositories/EntryAssetsRepository';

type PublishDraftInput = {
  entryId: string;
  assets: { assetId: string; usage: EntryAssetUsage }[];
  now: number;
};

const toUniqueValues = <T>(values: T[]): T[] => [...new Set(values)];

const toEntryAssetIdentityKey = (asset: { assetId: string; usage: EntryAssetUsage }) =>
  `${asset.usage}:${asset.assetId}`;

export class EntryAssetsService {
  private readonly repositories: Repositories;
  private readonly services: Services;

  constructor(repositories: Repositories, services: Services) {
    this.repositories = repositories;
    this.services = services;
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

  async publishDraft(trx: Executor, input: PublishDraftInput): Promise<void> {
    const currentEntryAssets = await this.repositories.entryAssets.listEntryAssetsByEntryId(
      input.entryId,
      {
        executor: trx,
      }
    );
    const currentEntryAssetsByIdentity = new Map(
      currentEntryAssets.map(
        entryAsset => [toEntryAssetIdentityKey(entryAsset), entryAsset] as const
      )
    );
    const nextAssetIdentitySet = new Set(input.assets.map(toEntryAssetIdentityKey));
    const changedEntryAssets: EntryAsset[] = [];

    for (const asset of input.assets) {
      const currentEntryAsset = currentEntryAssetsByIdentity.get(toEntryAssetIdentityKey(asset));
      if (currentEntryAsset) {
        continue;
      }

      const nextEntryAsset = await this.repositories.entryAssets.upsertEntryAsset(trx, {
        entryId: input.entryId,
        assetId: asset.assetId,
        usage: asset.usage,
        createdAt: input.now,
        updatedAt: input.now,
      });

      changedEntryAssets.push(nextEntryAsset);
    }

    for (const currentEntryAsset of currentEntryAssets) {
      const identityKey = toEntryAssetIdentityKey(currentEntryAsset);

      if (nextAssetIdentitySet.has(identityKey)) {
        continue;
      }

      const deletedEntryAsset = await this.repositories.entryAssets.deleteEntryAsset(trx, {
        entryId: input.entryId,
        assetId: currentEntryAsset.assetId,
        usage: currentEntryAsset.usage,
        deletedAt: input.now,
      });

      if (deletedEntryAsset) {
        changedEntryAssets.push(deletedEntryAsset);
      }
    }

    if (changedEntryAssets.length > 0) {
      await this.stageEntryAssets(trx, changedEntryAssets);
    }
  }

  private stageEntryAssets(trx: Executor, entryAssets: EntryAsset[]): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(
      trx,
      this.repositories.entryAssets,
      entryAssets.map(entryAsset => ({
        id: toEntryAssetEntityId(entryAsset.entryId, entryAsset.assetId, entryAsset.usage),
        data: this.repositories.entryAssets.toSyncData(entryAsset),
      }))
    );
  }
}
