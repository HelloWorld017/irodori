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
      className="group my-4 block max-w-full overflow-hidden rounded-[1.5rem] border border-line/70
        bg-elevated-background text-left shadow-sm transition hover:border-primary/25"
      aria-label="이미지 확대 보기"
    >
      <AssetImage
        {...asset}
        alt={alt}
        className="max-w-full bg-elevated-background"
        imageClassName="max-h-[28rem] w-auto max-w-full object-contain"
      />
      <span
        className="flex items-center justify-between gap-3 border-t border-line/60 px-4 py-2.5
          text-xs text-secondary transition group-hover:text-primary"
      >
        <span className="truncate">{alt || '이미지'}</span>
        <span className="shrink-0">눌러서 확대</span>
      </span>
    </button>
  );
};
