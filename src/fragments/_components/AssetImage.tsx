import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useClxDB } from '@/fragments/_providers/DatabaseProvider';
import { useBlurHash } from '@/hooks/useBlurHash';
import { classes } from '@/utils/classes';

type AssetImageProps = {
  asset: {
    blobDigest: string;
    blurhash?: string | null;
    width?: number | null;
    height?: number | null;
  };
  alt?: string;
  cover?: boolean;
  className?: string;
  imageClassName?: string;
  loading?: 'eager' | 'lazy';
};

export const AssetImage = ({
  asset,
  alt,
  className,
  imageClassName,
  cover,
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

    if (!asset.blobDigest || !clxDB) {
      return;
    }

    void (async () => {
      try {
        const storedBlob = await clxDB.blobs.getBlob(asset.blobDigest);
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
  }, [asset.blobDigest, clxDB]);

  const blurhash = asset.blurhash;
  const canUseBlurhash = !!blurhash && (cover || !!(asset.width && asset.height));
  const isBlurhashActive = canUseBlurhash && (!imageUrl || !isLoaded);
  const canvasRef = useBlurHash(canUseBlurhash ? blurhash : null);

  if (!canUseBlurhash) {
    return (
      imageUrl && (
        <motion.img
          key="image"
          initial={{ opacity: 0 }}
          animate={{ opacity: +isLoaded }}
          src={imageUrl}
          alt={alt}
          loading={loading}
          className={classes(
            'relative z-1 max-h-full max-w-full overflow-hidden text-[0] text-transparent',
            cover && 'h-full w-full object-cover',
            className,
            imageClassName
          )}
          onLoad={() => setIsLoaded(true)}
        />
      )
    );
  }

  const fillClassName = cover && 'object-cover';

  return (
    <div
      className={classes(
        'relative max-h-full max-w-full overflow-hidden',
        cover && 'h-full w-full',
        className
      )}
    >
      {!cover && (
        <svg
          viewBox={`0 0 ${asset.width} ${asset.height}`}
          className={classes('h-auto max-h-full w-auto max-w-full', imageClassName)}
        />
      )}
      <AnimatePresence>
        {isBlurhashActive ? (
          <motion.canvas
            key="blurhash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            ref={canvasRef}
            className={classes('absolute inset-0 h-full w-full', fillClassName, imageClassName)}
          />
        ) : null}

        {!!imageUrl && (
          <motion.img
            key="image"
            initial={{ opacity: 0 }}
            animate={{ opacity: +isLoaded }}
            exit={{ opacity: 0 }}
            src={imageUrl}
            alt={alt}
            loading={loading}
            className={classes(
              'absolute inset-0 z-1 h-full w-full text-[0] text-transparent',
              fillClassName,
              imageClassName
            )}
            onLoad={() => setIsLoaded(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
