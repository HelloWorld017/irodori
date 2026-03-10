import { encode as encodeBlurHash } from 'blurhash';
import type { Asset } from '@/repositories/AssetsRepository';
import type { Services } from '@/services';
import type { ClxDBWithUI } from 'clxdb/ui';

type UploadAssetImageInput = {
  clxDB: ClxDBWithUI;
  services: Services;
  file: File;
};

const BLURHASH_MAX_DIMENSION = 64;
const BLURHASH_COMPONENT_X = 4;
const BLURHASH_COMPONENT_Y = 3;

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for asset metadata.'));
    };

    image.src = objectUrl;
  });

const resolveImageMetadata = async (
  file: File
): Promise<{ width: number | null; height: number | null; blurhash: string | null }> => {
  const image = await loadImage(file);
  const width = image.naturalWidth || null;
  const height = image.naturalHeight || null;

  if (!width || !height) {
    return { width, height, blurhash: null };
  }

  try {
    const scale = Math.min(1, BLURHASH_MAX_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return { width, height, blurhash: null };
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    const pixels = context.getImageData(0, 0, targetWidth, targetHeight).data;
    const componentX = Math.max(1, Math.min(BLURHASH_COMPONENT_X, targetWidth));
    const componentY = Math.max(1, Math.min(BLURHASH_COMPONENT_Y, targetHeight));
    const blurhash = encodeBlurHash(pixels, targetWidth, targetHeight, componentX, componentY);

    return { width, height, blurhash };
  } catch {
    return { width, height, blurhash: null };
  }
};

export const uploadAssetImage = async ({
  clxDB,
  services,
  file,
}: UploadAssetImageInput): Promise<Asset> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files can be uploaded as entry assets.');
  }

  const now = Date.now();
  const blobDigest = await clxDB.blobs.putBlob(file, {
    name: file.name,
    mimeType: file.type || undefined,
    createdAt: now,
  });

  try {
    const { width, height, blurhash } = await resolveImageMetadata(file).catch(() => ({
      width: null,
      height: null,
      blurhash: null,
    }));

    return await services.assets.createUploaded({
      blobDigest,
      blurhash,
      mime: file.type || 'application/octet-stream',
      size: file.size,
      width,
      height,
    });
  } catch (error) {
    await clxDB.blobs.deleteBlob(blobDigest).catch(() => undefined);
    throw error;
  }
};
