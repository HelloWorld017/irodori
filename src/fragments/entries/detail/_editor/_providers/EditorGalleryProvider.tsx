import { useCallback, useMemo, useState } from 'react';
import { Gallery } from '@/fragments/_components/Gallery';
import { buildContext } from '@/utils/context';
import { useEntriesDetailAssets } from '../../_providers/EntriesDetailProvider';
import type { ReactNode } from 'react';

const [EditorGalleryStateProvider, useEditorGalleryState] = buildContext(() => {
  const images = useEntriesDetailAssets();
  const [activeId, setActiveId] = useState<string | null>(null);
  const openGallery = useCallback((assetId: string) => {
    setActiveId(assetId);
  }, []);

  const activeIndex = useMemo(
    () => images.findIndex(image => image.id === activeId),
    [activeId, images]
  );

  return {
    images,
    activeId,
    activeIndex,
    setActiveId,
    openGallery,
    closeGallery: () => setActiveId(null),
  };
});

const EditorGalleryRenderer = () => {
  const images = useEditorGalleryState(state => state.images);
  const activeId = useEditorGalleryState(state => state.activeId);
  const activeIndex = useEditorGalleryState(state => state.activeIndex);
  const closeGallery = useEditorGalleryState(state => state.closeGallery);
  const setActiveId = useEditorGalleryState(state => state.setActiveId);

  return (
    <Gallery
      open={activeId !== null && activeIndex >= 0}
      assets={images}
      index={Math.max(activeIndex, 0)}
      onClose={closeGallery}
      onIndexChange={index => setActiveId(images[index]?.id ?? null)}
    />
  );
};

export const EditorGalleryProvider = ({ children }: { children: ReactNode }) => (
  <EditorGalleryStateProvider>
    {children}
    <EditorGalleryRenderer />
  </EditorGalleryStateProvider>
);

export const useEditorOpenGallery = () => useEditorGalleryState(state => state.openGallery);
