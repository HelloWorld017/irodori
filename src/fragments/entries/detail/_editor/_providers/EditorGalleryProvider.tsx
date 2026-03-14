import { useCallback, useMemo, useState } from 'react';
import { Gallery, type GalleryAsset } from '@/fragments/_components/Gallery';
import { buildContext } from '@/utils/context';
import type { ReactNode } from 'react';

type EditorGalleryImage = GalleryAsset & {
  registrationId: string;
};

type EditorGallery = {
  registerImage: (image: EditorGalleryImage) => void;
  unregisterImage: (registrationId: string) => void;
  openGallery: (registrationId: string) => void;
};

const [EditorGalleryStateProvider, useEditorGalleryState] = buildContext(() => {
  const [images, setImages] = useState<EditorGalleryImage[]>([]);
  const [activeRegistrationId, setActiveRegistrationId] = useState<string | null>(null);

  const registerImage = useCallback((image: EditorGalleryImage) => {
    setImages(current => {
      const existingIndex = current.findIndex(item => item.registrationId === image.registrationId);
      if (existingIndex < 0) {
        return [...current, image];
      }

      const existing = current[existingIndex];
      if (
        existing.id === image.id &&
        existing.blobDigest === image.blobDigest &&
        existing.blurhash === image.blurhash &&
        existing.mime === image.mime
      ) {
        return current;
      }

      const next = [...current];
      next[existingIndex] = image;
      return next;
    });
  }, []);

  const unregisterImage = useCallback((registrationId: string) => {
    setImages(current => current.filter(image => image.registrationId !== registrationId));
    setActiveRegistrationId(current => (current === registrationId ? null : current));
  }, []);

  const openGallery = useCallback((registrationId: string) => {
    setActiveRegistrationId(registrationId);
  }, []);

  const activeIndex = useMemo(
    () => images.findIndex(image => image.registrationId === activeRegistrationId),
    [activeRegistrationId, images]
  );

  return {
    images,
    activeRegistrationId,
    activeIndex,
    registerImage,
    unregisterImage,
    openGallery,
    closeGallery: () => setActiveRegistrationId(null),
    setActiveRegistrationId,
  };
});

const EditorGalleryRenderer = () => {
  const images = useEditorGalleryState(state => state.images);
  const activeRegistrationId = useEditorGalleryState(state => state.activeRegistrationId);
  const activeIndex = useEditorGalleryState(state => state.activeIndex);
  const closeGallery = useEditorGalleryState(state => state.closeGallery);
  const setActiveRegistrationId = useEditorGalleryState(state => state.setActiveRegistrationId);

  const assets = useMemo<GalleryAsset[]>(
    () => images.map(({ registrationId: _, ...asset }) => asset),
    [images]
  );

  return (
    <Gallery
      open={activeRegistrationId !== null && activeIndex >= 0}
      assets={assets}
      initialIndex={Math.max(activeIndex, 0)}
      onClose={closeGallery}
      onIndexChange={index => setActiveRegistrationId(images[index]?.registrationId ?? null)}
    />
  );
};

export const EditorGalleryProvider = ({ children }: { children: ReactNode }) => (
  <EditorGalleryStateProvider>
    {children}
    <EditorGalleryRenderer />
  </EditorGalleryStateProvider>
);

export const useEditorGallery = (): EditorGallery => {
  const registerImage = useEditorGalleryState(state => state.registerImage);
  const unregisterImage = useEditorGalleryState(state => state.unregisterImage);
  const openGallery = useEditorGalleryState(state => state.openGallery);

  return useMemo(
    () => ({
      registerImage,
      unregisterImage,
      openGallery,
    }),
    [openGallery, registerImage, unregisterImage]
  );
};
