import type { Services } from '.';
import type { Executor, Repositories } from '@/repositories';
import type { Asset } from '@/repositories/AssetsRepository';

type CreateUploadedAssetInput = {
  blobDigest: string;
  blurhash: string | null;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
};

export class AssetsService {
  private readonly repositories: Repositories;
  private readonly services: Services;

  constructor(repositories: Repositories, services: Services) {
    this.repositories = repositories;
    this.services = services;
  }

  async createUploaded(input: CreateUploadedAssetInput): Promise<Asset> {
    const now = Date.now();
    const id = crypto.randomUUID();

    return this.repositories.withTransaction(async trx => {
      const asset = await this.repositories.assets.createAsset(trx, {
        id,
        blobDigest: input.blobDigest,
        blurhash: input.blurhash,
        mime: input.mime,
        size: input.size,
        width: input.width,
        height: input.height,
        status: 'uploaded',
        createdAt: now,
        updatedAt: now,
      });

      await this.stageAsset(trx, asset);
      return asset;
    });
  }

  private stageAsset(trx: Executor, asset: Asset): Promise<void> {
    return this.services.sync.stageUpdatedDocuments(trx, this.repositories.assets, [
      {
        id: asset.id,
        data: this.repositories.assets.toSyncData(asset),
      },
    ]);
  }
}
