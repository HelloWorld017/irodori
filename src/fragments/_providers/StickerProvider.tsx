import { LRUCache } from 'lru-cache';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClxDB } from '@/fragments/_providers/DatabaseProvider';
import { buildContext } from '@/utils/context';

type StickerProviderProps = {
  cacheMax?: number;
};

type StickerPreviewState = Map<string, string | null>;

type StickerContextValue = {
  loadPreviewUrl: (blobDigest: string | null) => Promise<string | null>;
  previewState: StickerPreviewState;
};

const DEFAULT_STICKER_CACHE_MAX = 300;

const [StickerProvider, useSticker] = buildContext<StickerContextValue, StickerProviderProps>(
  ({ cacheMax = DEFAULT_STICKER_CACHE_MAX }) => {
    const clxDB = useClxDB();
    const [previewState, setPreviewState] = useState<StickerPreviewState>(new Map());
    const inFlightLoadMapRef = useRef(new Map<string, Promise<string | null>>());
    const isMountedRef = useRef(true);
    const previewStateRef = useRef(previewState);

    useEffect(() => {
      previewStateRef.current = previewState;
    }, [previewState]);

    const commitPreviewState = useCallback(
      (updater: (current: StickerPreviewState) => StickerPreviewState) => {
        if (!isMountedRef.current) {
          return;
        }

        setPreviewState(current => updater(current));
      },
      []
    );

    const previewCache = useMemo(
      () =>
        new LRUCache<string, string>({
          max: cacheMax,
          dispose: (objectUrl, blobDigest) => {
            URL.revokeObjectURL(objectUrl);

            if (!isMountedRef.current) {
              return;
            }

            commitPreviewState(current => {
              if (!current.has(blobDigest)) {
                return current;
              }

              const next = new Map(current);
              next.delete(blobDigest);
              return next;
            });
          },
        }),
      [cacheMax, commitPreviewState]
    );

    const loadPreviewUrl = useCallback(
      async (blobDigest: string | null): Promise<string | null> => {
        if (!blobDigest || !clxDB) {
          return null;
        }

        const cachedPreviewUrl = previewCache.get(blobDigest);
        if (cachedPreviewUrl) {
          commitPreviewState(current => {
            if (current.get(blobDigest) === cachedPreviewUrl) {
              return current;
            }

            const next = new Map(current);
            next.set(blobDigest, cachedPreviewUrl);
            return next;
          });
          return cachedPreviewUrl;
        }

        if (previewStateRef.current.has(blobDigest)) {
          return previewStateRef.current.get(blobDigest) ?? null;
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

            previewCache.set(blobDigest, objectUrl);
            commitPreviewState(current => {
              if (current.get(blobDigest) === objectUrl) {
                return current;
              }

              const next = new Map(current);
              next.set(blobDigest, objectUrl);
              return next;
            });
            return objectUrl;
          } catch (error) {
            console.error('Failed to load sticker preview', error);
            commitPreviewState(current => {
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
      [clxDB, commitPreviewState, previewCache]
    );

    useEffect(() => {
      isMountedRef.current = true;
      const inFlightLoadMap = inFlightLoadMapRef.current;

      return () => {
        isMountedRef.current = false;
        inFlightLoadMap.clear();
        previewCache.clear();
      };
    }, [previewCache]);

    return {
      loadPreviewUrl,
      previewState,
    };
  }
);

export { StickerProvider };

export const useLoadStickerPreviewUrl = () => useSticker(state => state.loadPreviewUrl);

export const useStickerPreviewUrl = (blobDigest: string | null) => {
  const previewUrl = useSticker(state => {
    if (!blobDigest) {
      return null;
    }

    return state.previewState.get(blobDigest);
  });
  const loadPreviewUrl = useLoadStickerPreviewUrl();

  useEffect(() => {
    if (!blobDigest || previewUrl !== undefined) {
      return;
    }

    void loadPreviewUrl(blobDigest);
  }, [blobDigest, loadPreviewUrl, previewUrl]);

  return previewUrl;
};
