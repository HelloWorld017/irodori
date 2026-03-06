import { useEffect, useState } from 'react';
import { useClxDB } from '@/fragments/_providers/DatabaseProvider';
import { classes } from '@/utils/classes';
import { BlurHash } from './BlurHash';

type AssetImageProps = {
  blobDigest: string | null;
  blurhash?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  loading?: 'eager' | 'lazy';
};

export const AssetImage = ({
  blobDigest,
  blurhash = null,
  alt,
  className,
  imageClassName,
  loading = 'lazy',
}: AssetImageProps) => {
  const clxDB = useClxDB();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setImageUrl(null);
    setIsLoaded(false);

    if (!blobDigest || !clxDB) {
      return;
    }

    void (async () => {
      try {
        const storedBlob = await clxDB.blobs.getBlob(blobDigest);
        const file = await storedBlob.file();
        objectUrl = URL.createObjectURL(file);

        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        setImageUrl(objectUrl);
      } catch (error) {
        console.error('Failed to load asset image', error);
      }
    })();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [blobDigest, clxDB]);

  if (!blobDigest && !blurhash) {
    return null;
  }

  return (
    <div className={classes('relative overflow-hidden', className)}>
      {blurhash && (!imageUrl || !isLoaded) ? (
        <BlurHash
          hash={blurhash}
          className={classes('absolute inset-0 h-full w-full', imageClassName)}
        />
      ) : null}

      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          loading={loading}
          className={classes(
            'relative z-1 h-full w-full transition duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            imageClassName
          )}
          onLoad={() => setIsLoaded(true)}
        />
      ) : null}
    </div>
  );
};
