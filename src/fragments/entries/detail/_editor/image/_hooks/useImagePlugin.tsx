import { useMemo } from 'react';
import { useAssetsFetcher } from '@/fragments/entries/detail/_hooks/useAssetsFetcher';
import { useEntriesDetailIsReadOnly } from '../../../_providers/EntriesDetailProvider';
import { useEditorPortal } from '../../_providers/EditorPortalProvider';
import { createImageWidgetPlugin } from '../_plugins/imageWidgetPlugin';

export const useImagePlugin = () => {
  const isReadOnly = useEntriesDetailIsReadOnly();
  const editorPortal = useEditorPortal();
  const { fetchAsset } = useAssetsFetcher();

  const imagePlugin = useMemo(
    () =>
      createImageWidgetPlugin({
        isReadOnly,
        fetchAsset,
        portal: editorPortal,
      }),
    [editorPortal, fetchAsset, isReadOnly]
  );

  return imagePlugin;
};
