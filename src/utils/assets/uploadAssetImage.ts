import type { Repositories } from '@/repositories';
import type { Asset } from '@/repositories/AssetsRepository';
import type { Services } from '@/services';
import type { ClxDBWithUI } from 'clxdb/ui';

type UploadAssetImageInput = {
  clxDB: ClxDBWithUI;
  repositories: Repositories;
  services: Services;
  file: File;
};

const resolveImageSize = (file: File): Promise<{ width: number | null; height: number | null }> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to resolve image dimensions.'));
    };

    image.src = objectUrl;
  });

export const uploadAssetImage = async ({
  clxDB,
  repositories,
  services,
  file,
}: UploadAssetImageInput): Promise<Asset> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be uploaded as entry assets.');
  }

  const now = Date.now();
  const assetId = crypto.randomUUID();
  const blobDigest = await clxDB.blobs.putBlob(file, {
    name: file.name,
    mimeType: file.type || undefined,
    createdAt: now,
  });

  try {
    const { width, height } = await resolveImageSize(file).catch(() => ({
      width: null,
      height: null,
    }));

    return await repositories.withTransaction(async trx => {
      const asset = await repositories.assets.createAsset(trx, {
        id: assetId,
        blobDigest,
        blurhash: null,
        mime: file.type || 'application/octet-stream',
        size: file.size,
        width,
        height,
        status: 'uploaded',
        createdAt: now,
        updatedAt: now,
      });

      await services.sync.stageUpdatedDocuments(trx, repositories.assets, [
        {
          id: asset.id,
          data: repositories.assets.toSyncData(asset),
        },
      ]);

      return asset;
    });
  } catch (error) {
    await clxDB.blobs.deleteBlob(blobDigest).catch(() => undefined);
    throw error;
  }
};
