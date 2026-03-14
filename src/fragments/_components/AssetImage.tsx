import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useClxDB } from '@/fragments/_providers/DatabaseProvider';
import { classes } from '@/utils/classes';
import { BlurHash } from './BlurHash';

type AssetImageProps = {
  blobDigest: string;
  blurhash?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string;
  className?: string;
  imageClassName?: string;
  loading?: 'eager' | 'lazy';
};

export const AssetImage = ({
  blobDigest,
  blurhash = null,
  width,
  height,
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

  const canUseBlurhash = !!blurhash && !!(width && height);
  const isBlurhashActive = canUseBlurhash && (!imageUrl || !isLoaded);

  return (
    <div className={classes('relative overflow-hidden', className)}>
      <AnimatePresence>
        {isBlurhashActive ? (
          <motion.div
            key="blurhash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full w-full"
          >
            <BlurHash hash={blurhash} className={imageClassName} />
          </motion.div>
        ) : null}

        {imageUrl ? (
          <motion.img
            key="image"
            initial={{ opacity: 0 }}
            animate={{ opacity: +isLoaded }}
            exit={{ opacity: 0 }}
            src={imageUrl}
            alt={alt}
            loading={loading}
            className={classes('z-1 h-full w-full text-[0] text-transparent', imageClassName)}
            onLoad={() => setIsLoaded(true)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
};
