import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { useGesture } from '@use-gesture/react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconCloudDownload, IconX } from '@/fragments/_icons';
import { useClxDB } from '@/fragments/_providers/DatabaseProvider';
import { useShowToast } from '@/fragments/_providers/ToastProvider';
import { classes } from '@/utils/classes';
import { BlurHash } from './BlurHash';

const GESTURE_DRAG_RATIO = 0.1;
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const INITIAL_DRAG_OFFSET = { x: 0, y: 0 };
const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

type GalleryDragOffset = {
  x: number;
  y: number;
};

export type GalleryAsset = {
  id: string;
  blobDigest: string | null;
  blurhash?: string | null;
  mime?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string;
  filename?: string;
};

type GalleryProps = {
  open: boolean;
  assets: GalleryAsset[];
  initialIndex?: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const clampIndex = (index: number, length: number) => {
  if (length <= 0) {
    return 0;
  }

  return clamp(index, 0, length - 1);
};

const resolveDownloadFilename = (asset: GalleryAsset, index: number) => {
  if (asset.filename?.trim()) {
    return asset.filename.trim();
  }

  const extension = asset.mime ? IMAGE_EXTENSION_BY_MIME[asset.mime] : null;
  const baseName = asset.id.trim() || `image-${index + 1}`;

  return extension ? `${baseName}.${extension}` : baseName;
};

const useCanHover = () => {
  const [canHover, setCanHover] = useState(false);

  useLayoutEffect(() => {
    const mediaQuery = matchMedia('(hover: hover)');
    const handleChange = (event: MediaQueryListEvent) => setCanHover(event.matches);

    setCanHover(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return canHover;
};

export const Gallery = ({
  open,
  assets,
  initialIndex = 0,
  onClose,
  onIndexChange,
}: GalleryProps) => {
  const clxDB = useClxDB();
  const showToast = useShowToast();
  const canHover = useCanHover();

  const [activeIndex, setActiveIndex] = useState(() => clampIndex(initialIndex, assets.length));
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [scale, setScale] = useState(MIN_SCALE);
  const [dragOffset, setDragOffset] = useState<GalleryDragOffset>(INITIAL_DRAG_OFFSET);
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);

  const scaleRef = useRef(scale);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveIndex(clampIndex(initialIndex, assets.length));
  }, [assets.length, initialIndex, open]);

  useEffect(() => {
    setActiveIndex(currentIndex => clampIndex(currentIndex, assets.length));
  }, [assets.length]);

  const currentAsset = assets[activeIndex] ?? null;
  const canMovePrevious = activeIndex > 0;
  const canMoveNext = activeIndex < assets.length - 1;
  const controlTabIndex = canHover ? -1 : 0;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setImageUrl(null);
    setIsImageLoaded(false);
    setImageLoadFailed(false);
    setScale(MIN_SCALE);
    setDragOffset(INITIAL_DRAG_OFFSET);
    setIsDragging(false);
    setIsPinching(false);
    setIsLoadingImage(false);

    const blobDigest = currentAsset?.blobDigest;

    if (!open || !blobDigest) {
      return;
    }

    setIsLoadingImage(true);

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
        console.error('Failed to load gallery image', error);

        if (!cancelled) {
          setImageLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingImage(false);
        }
      }
    })();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [clxDB, currentAsset?.blobDigest, open]);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      const normalizedIndex = clampIndex(nextIndex, assets.length);

      setActiveIndex(currentIndex => {
        if (currentIndex === normalizedIndex) {
          return currentIndex;
        }

        onIndexChange?.(normalizedIndex);
        return normalizedIndex;
      });
    },
    [assets.length, onIndexChange]
  );

  const goToPrevious = useCallback(() => {
    if (!canMovePrevious) {
      return;
    }

    goToIndex(activeIndex - 1);
  }, [activeIndex, canMovePrevious, goToIndex]);

  const goToNext = useCallback(() => {
    if (!canMoveNext) {
      return;
    }

    goToIndex(activeIndex + 1);
  }, [activeIndex, canMoveNext, goToIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevious();
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, open]);

  const bindGesture = useGesture(
    {
      onDrag: ({
        active,
        last,
        movement: [movementX, movementY],
        swipe: [swipeX, swipeY],
        touches,
      }) => {
        if (touches > 1) {
          return;
        }

        setIsDragging(active);
        setDragOffset({
          x: movementX * GESTURE_DRAG_RATIO,
          y: Math.max(movementY, 0) * GESTURE_DRAG_RATIO,
        });

        if (!last) {
          return;
        }

        setIsDragging(false);
        setDragOffset(INITIAL_DRAG_OFFSET);

        if (swipeY > 0) {
          onClose();
          return;
        }

        if (swipeX < 0) {
          goToPrevious();
          return;
        }

        if (swipeX > 0) {
          goToNext();
        }
      },
      onPinch: ({ active, offset: [nextScale] }) => {
        setIsPinching(active);
        setScale(clamp(nextScale, MIN_SCALE, MAX_SCALE));
      },
    },
    {
      drag: {
        filterTaps: true,
        rubberband: true,
        threshold: 6,
        swipe: {
          distance: 36,
          duration: 600,
          velocity: 0.2,
        },
      },
      pinch: {
        from: () => [scaleRef.current, 0],
        rubberband: true,
        scaleBounds: {
          min: MIN_SCALE,
          max: MAX_SCALE,
        },
      },
      eventOptions: {
        passive: false,
      },
      preventDefault: true,
    }
  );

  const imageTransform = useMemo(
    () => `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(${scale})`,
    [dragOffset.x, dragOffset.y, scale]
  );

  const handleDownload = useCallback(async () => {
    const blobDigest = currentAsset?.blobDigest;

    if (!blobDigest) {
      return;
    }

    try {
      const storedBlob = await clxDB.blobs.getBlob(blobDigest);
      const file = await storedBlob.file();
      const objectUrl = URL.createObjectURL(file);
      const anchor = document.createElement('a');

      anchor.href = objectUrl;
      anchor.download = resolveDownloadFilename(currentAsset, activeIndex);
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Failed to download gallery image', error);
      showToast({
        kind: 'error',
        message: '이미지를 다운로드하지 못했어요. 다시 시도해 주세요.',
      });
    }
  }, [activeIndex, clxDB, currentAsset, showToast]);

  return (
    <AnimatePresence>
      {open ? (
        <Dialog static open onClose={onClose} className="fixed inset-0 z-50">
          <DialogBackdrop
            as={motion.div}
            className="fixed inset-0 bg-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <div className="fixed inset-0">
            <DialogPanel
              as={motion.div}
              className="relative h-full w-full"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <div
                className="group relative flex h-full w-full items-center justify-center
                  overflow-hidden px-4 py-8 sm:px-8 sm:py-12"
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute inset-0 z-0"
                  aria-label="갤러리 닫기"
                />

                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-4 right-4 z-30 inline-flex h-11 w-11 items-center
                    justify-center rounded-full bg-base-background/65 text-primary backdrop-blur-xl
                    transition hover:bg-base-background/85"
                  aria-label="갤러리 닫기"
                >
                  <IconX className="text-lg" />
                </button>

                <div className="relative z-10 flex h-full w-full items-center justify-center">
                  {assets.length > 1 ? (
                    <>
                      <button
                        type="button"
                        onClick={goToPrevious}
                        disabled={!canMovePrevious}
                        tabIndex={controlTabIndex}
                        className={classes(
                          `absolute left-4 z-20 inline-flex h-14 w-14 items-center justify-center
                            rounded-full bg-base-background/55 text-2xl font-medium text-primary
                            backdrop-blur-xl transition sm:left-6`,
                          `group-hover:pointer-events-auto group-hover:opacity-100
                            can-hover:pointer-events-none can-hover:opacity-0`,
                          !canMovePrevious && 'cursor-not-allowed opacity-40'
                        )}
                        aria-label="이전 이미지"
                      >
                        <IconChevronLeft />
                      </button>

                      <button
                        type="button"
                        onClick={goToNext}
                        disabled={!canMoveNext}
                        tabIndex={controlTabIndex}
                        className={classes(
                          `absolute right-4 z-20 inline-flex h-14 w-14 items-center justify-center
                            rounded-full bg-base-background/55 text-2xl font-medium text-primary
                            backdrop-blur-xl transition sm:right-6`,
                          `group-hover:pointer-events-auto group-hover:opacity-100
                            can-hover:pointer-events-none can-hover:opacity-0`,
                          !canMoveNext && 'cursor-not-allowed opacity-40'
                        )}
                        aria-label="다음 이미지"
                      >
                        <IconChevronRight />
                      </button>
                    </>
                  ) : null}

                  <div
                    className="pointer-events-none absolute inset-x-4 bottom-4 z-20 flex
                      justify-center sm:bottom-6"
                  >
                    <div
                      className={classes(
                        `pointer-events-auto inline-flex items-center gap-3 rounded-full
                          bg-base-background/70 px-4 py-2.5 text-sm font-medium text-primary
                          shadow-elevated backdrop-blur-xl transition`,
                        `group-hover:pointer-events-auto group-hover:translate-y-0
                          group-hover:opacity-100 can-hover:pointer-events-none
                          can-hover:translate-y-2 can-hover:opacity-0`
                      )}
                    >
                      <button
                        type="button"
                        onClick={goToPrevious}
                        disabled={!canMovePrevious}
                        tabIndex={controlTabIndex}
                        className="disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="이전 이미지"
                      >
                        <IconChevronLeft />
                      </button>
                      <span className="min-w-18 text-center tabular-nums">
                        {assets.length > 0 ? `${activeIndex + 1} / ${assets.length}` : '0 / 0'}
                      </span>
                      <button
                        type="button"
                        onClick={goToNext}
                        disabled={!canMoveNext}
                        tabIndex={controlTabIndex}
                        className="disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="다음 이미지"
                      >
                        <IconChevronRight />
                      </button>
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={!currentAsset?.blobDigest}
                        tabIndex={controlTabIndex}
                        className="text-base leading-none disabled:cursor-not-allowed
                          disabled:opacity-40"
                        aria-label="이미지 다운로드"
                      >
                        <IconCloudDownload />
                      </button>
                    </div>
                  </div>

                  <div className="relative flex h-full w-full items-center justify-center">
                    {currentAsset ? (
                      <div
                        {...bindGesture()}
                        className="relative flex max-h-full max-w-full items-center justify-center
                          select-none"
                        style={{ touchAction: 'none', transform: imageTransform }}
                      >
                        {currentAsset.blurhash && (!imageUrl || !isImageLoaded) ? (
                          <BlurHash
                            hash={currentAsset.blurhash}
                            className="absolute inset-0 h-full w-full rounded-2xl object-cover
                              opacity-70"
                          />
                        ) : null}

                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={currentAsset.alt ?? '갤러리 이미지'}
                            draggable={false}
                            className={classes(
                              `relative z-1 max-h-[calc(100vh-6rem)] max-w-[calc(100vw-3rem)]
                                rounded-2xl object-contain shadow-elevated transition-opacity
                                sm:max-h-[calc(100vh-8rem)] sm:max-w-[calc(100vw-8rem)]`,
                              isImageLoaded ? 'opacity-100' : 'opacity-0',
                              !isDragging && !isPinching && 'transition-transform duration-200'
                            )}
                            onLoad={() => setIsImageLoaded(true)}
                          />
                        ) : null}

                        {!imageUrl && isLoadingImage ? (
                          <div
                            className="flex h-72 w-72 items-center justify-center rounded-[2rem]
                              bg-base-background/12 px-6 text-sm text-white/80 backdrop-blur-sm"
                          >
                            이미지를 불러오는 중이에요.
                          </div>
                        ) : null}

                        {!imageUrl && imageLoadFailed ? (
                          <div
                            className="flex h-72 w-72 items-center justify-center rounded-[2rem]
                              bg-base-background/12 px-6 text-sm text-white/80 backdrop-blur-sm"
                          >
                            이미지를 불러오지 못했어요.
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div
                        className="flex h-72 w-72 items-center justify-center rounded-[2rem]
                          bg-base-background/12 px-6 text-sm text-white/80 backdrop-blur-sm"
                      >
                        표시할 이미지가 없어요.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      ) : null}
    </AnimatePresence>
  );
};
