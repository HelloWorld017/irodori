import { use, useEffect, useId, useMemo } from 'react';
import { AssetImage } from '@/fragments/_components/AssetImage';
import { isPromise } from '@/utils/promise';
import { useEditorGallery } from '../../_providers/EditorGalleryProvider';
import type { ImagePluginProps } from '../_types/ImagePluginProps';

type ImageMarkupProps = {
  assetId: string;
  alt: string;
  fetchAsset: ImagePluginProps['fetchAsset'];
};

export const ImageMarkup = ({ assetId, alt, fetchAsset }: ImageMarkupProps) => {
  const registrationId = useId();
  const { registerImage, unregisterImage, openGallery } = useEditorGallery();
  const result = useMemo(() => fetchAsset(assetId), [assetId, fetchAsset]);
  const asset = isPromise(result) ? use(result) : result;

  useEffect(() => {
    if (!asset || !asset.mime.startsWith('image/')) {
      return;
    }

    registerImage({
      registrationId,
      id: asset.id,
      blobDigest: asset.blobDigest,
      blurhash: asset.blurhash,
      mime: asset.mime,
    });

    return () => unregisterImage(registrationId);
  }, [asset, registerImage, registrationId, unregisterImage]);

  if (!asset || !asset.mime.startsWith('image/')) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => openGallery(registrationId)}
      className="relative my-4 block w-full max-w-full overflow-hidden transition
        hover:brightness-90"
      aria-label="이미지 확대 보기"
    >
      <AssetImage
        asset={asset}
        alt={alt}
        className="max-h-[28rem] overflow-hidden rounded-[1.5rem]"
      />
    </button>
  );
};
