import { LRUCache } from 'lru-cache';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClxDBWithoutCheck } from '@/fragments/_providers/DatabaseProvider';
import { buildContext } from '@/utils/context';

type StickerProviderProps = {
  cacheMax?: number;
};

type StickerImageState = Map<string, string | null>;

type StickerContextValue = {
  loadImageUrl: (blobDigest: string | null) => Promise<string | null>;
  imageState: StickerImageState;
};

const DEFAULT_STICKER_CACHE_MAX = 300;

const [StickerProvider, useSticker] = buildContext<StickerContextValue, StickerProviderProps>(
  ({ cacheMax = DEFAULT_STICKER_CACHE_MAX }) => {
    const clxDB = useClxDBWithoutCheck();
    const [imageState, setImageState] = useState<StickerImageState>(new Map());
    const inFlightLoadMapRef = useRef(new Map<string, Promise<string | null>>());
    const isMountedRef = useRef(true);
    const imageStateRef = useRef(imageState);

    useEffect(() => {
      imageStateRef.current = imageState;
    }, [imageState]);

    const commitImageState = useCallback(
      (updater: (current: StickerImageState) => StickerImageState) => {
        if (!isMountedRef.current) {
          return;
        }

        setImageState(current => updater(current));
      },
      []
    );

    const imageCache = useMemo(
      () =>
        new LRUCache<string, string>({
          max: cacheMax,
          dispose: (objectUrl, blobDigest) => {
            URL.revokeObjectURL(objectUrl);

            if (!isMountedRef.current) {
              return;
            }

            commitImageState(current => {
              if (!current.has(blobDigest)) {
                return current;
              }

              const next = new Map(current);
              next.delete(blobDigest);
              return next;
            });
          },
        }),
      [cacheMax, commitImageState]
    );

    const loadImageUrl = useCallback(
      async (blobDigest: string | null): Promise<string | null> => {
        if (!blobDigest || !clxDB) {
          return null;
        }

        const cachedImageUrl = imageCache.get(blobDigest);
        if (cachedImageUrl) {
          commitImageState(current => {
            if (current.get(blobDigest) === cachedImageUrl) {
              return current;
            }

            const next = new Map(current);
            next.set(blobDigest, cachedImageUrl);
            return next;
          });
          return cachedImageUrl;
        }

        if (imageStateRef.current.has(blobDigest)) {
          return imageStateRef.current.get(blobDigest) ?? null;
        }

        const inFlightLoad = inFlightLoadMapRef.current.get(blobDigest);
        if (inFlightLoad) {
          return inFlightLoad;
        }

        const loadPromise = (async () => {
          try {
            const storedBlob = await clxDB.blobs.getBlob(blobDigest);
            const file = await storedBlob.file();
            const objectUrl = URL.createObjectURL(file);

            imageCache.set(blobDigest, objectUrl);
            commitImageState(current => {
              if (current.get(blobDigest) === objectUrl) {
                return current;
              }

              const next = new Map(current);
              next.set(blobDigest, objectUrl);
              return next;
            });
            return objectUrl;
          } catch (error) {
            console.error('Failed to load sticker image', error);
            commitImageState(current => {
              if (current.get(blobDigest) === null) {
                return current;
              }

              const next = new Map(current);
              next.set(blobDigest, null);
              return next;
            });
            return null;
          } finally {
            inFlightLoadMapRef.current.delete(blobDigest);
          }
        })();

        inFlightLoadMapRef.current.set(blobDigest, loadPromise);
        return loadPromise;
      },
      [clxDB, commitImageState, imageCache]
    );

    useEffect(() => {
      isMountedRef.current = true;
      const inFlightLoadMap = inFlightLoadMapRef.current;

      return () => {
        isMountedRef.current = false;
        inFlightLoadMap.clear();
        imageCache.clear();
      };
    }, [imageCache]);

    return {
      loadImageUrl,
      imageState,
    };
  }
);

export { StickerProvider };

export const useLoadStickerImageUrl = () => useSticker(state => state.loadImageUrl);

export const useStickerImageUrl = (blobDigest: string | null) => {
  const imageUrl = useSticker(state => {
    if (!blobDigest) {
      return null;
    }

    return state.imageState.get(blobDigest);
  });
  const loadImageUrl = useLoadStickerImageUrl();

  useEffect(() => {
    if (!blobDigest || imageUrl !== undefined) {
      return;
    }

    void loadImageUrl(blobDigest);
  }, [blobDigest, loadImageUrl, imageUrl]);

  return imageUrl;
};
