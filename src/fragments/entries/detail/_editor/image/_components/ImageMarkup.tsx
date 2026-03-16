import { use, useEffect, useEffectEvent, useMemo } from 'react';
import { AssetImage } from '@/fragments/_components/AssetImage';
import { isPromise } from '@/utils/promise';
import { useEditorOpenGallery } from '../../_providers/EditorGalleryProvider';
import type { ImagePluginProps } from '../_types/ImagePluginProps';

type ImageMarkupProps = {
  assetId: string;
  alt: string;
  fetchAsset: ImagePluginProps['fetchAsset'];
  isGalleryEnabled: boolean;
  requestMeasure: () => void;
};

export const ImageMarkup = ({
  assetId,
  alt,
  fetchAsset,
  isGalleryEnabled,
  requestMeasure,
}: ImageMarkupProps) => {
  const openGallery = useEditorOpenGallery();
  const result = useMemo(() => fetchAsset(assetId), [assetId, fetchAsset]);
  const asset = isPromise(result) ? use(result) : result;

  const onRequestMeasureEvent = useEffectEvent(requestMeasure);
  useEffect(() => {
    onRequestMeasureEvent();
  }, []);

  if (!asset || !asset.mime.startsWith('image/')) {
    return null;
  }

  const image = (
    <AssetImage
      asset={asset}
      alt={alt}
      className="max-h-[480px] overflow-hidden rounded-[1.5rem]"
    />
  );

  if (!isGalleryEnabled) {
    return image;
  }

  return (
    <button
      type="button"
      onClick={() => openGallery(assetId)}
      className="relative my-4 block max-w-full overflow-hidden transition hover:brightness-90"
      aria-label="이미지 확대 보기"
    >
      {image}
    </button>
  );
};
