import { useMemo } from 'react';
import { useAssetsFetcher } from '@/fragments/entries/detail/_hooks/useAssetsFetcher';
import { useEditorPortal } from '../../_providers/EditorPortalProvider';
import { createImageWidgetPlugin } from '../_plugins/imageWidgetPlugin';

export const useImagePlugin = () => {
  const editorPortal = useEditorPortal();
  const { fetchAsset } = useAssetsFetcher();

  const imagePlugin = useMemo(
    () =>
      createImageWidgetPlugin({
        fetchAsset,
        portal: editorPortal,
      }),
    [editorPortal, fetchAsset]
  );

  return imagePlugin;
};
