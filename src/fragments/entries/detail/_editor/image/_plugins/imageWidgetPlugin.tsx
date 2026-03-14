import { Decoration, EditorView, MatchDecorator, ViewPlugin } from '@codemirror/view';
import { Suspense } from 'react';
import { ASSET_IMAGE_MARKUP_REGEX } from '@/fragments/entries/detail/_utils/assetReferences';
import { ComponentWidget } from '../../_utils/ComponentWidget';
import { ImageMarkup } from '../_components/ImageMarkup';
import type { EditorPortal } from '../../_providers/EditorPortalProvider';
import type { ImagePluginProps } from '../_types/ImagePluginProps';
import type { Options as InkMde } from 'ink-mde';

const EmptyImage = () => (
  <span className="my-4 block h-56 w-full max-w-120 rounded-[1.5rem] bg-elevated-background" />
);

const imageDecorator = ({ fetchAsset, portal }: Pick<ImagePluginProps, 'fetchAsset' | 'portal'>) =>
  new MatchDecorator({
    regexp: new RegExp(ASSET_IMAGE_MARKUP_REGEX.source, 'g'),
    decoration: match => {
      const alt = match[1]?.trim() ?? '';
      const assetId = match[2]?.trim();
      if (!assetId) {
        return null;
      }

      return Decoration.replace({
        widget: new ComponentWidget({
          id: `asset-image:${assetId}`,
          portal,
          render: () => (
            <Suspense fallback={<EmptyImage />}>
              <ImageMarkup assetId={assetId} alt={alt} fetchAsset={fetchAsset} />
            </Suspense>
          ),
        }),
        inclusive: false,
      });
    },
  });

export const createImageWidgetPlugin = ({
  fetchAsset,
  portal,
}: Pick<ImagePluginProps, 'fetchAsset'> & { portal: EditorPortal }): InkMde.Plugin[] => {
  const decorator = imageDecorator({ fetchAsset, portal });
  const imageDecorations = ViewPlugin.fromClass(
    class {
      decorations = Decoration.none;

      constructor(view: EditorView) {
        this.decorations = decorator.createDeco(view);
      }

      update(update: Parameters<typeof decorator.updateDeco>[0]) {
        this.decorations = decorator.updateDeco(update, this.decorations);
      }
    },
    {
      decorations: value => value.decorations,
      provide: plugin =>
        EditorView.atomicRanges.of(view => {
          const pluginState = view.plugin(plugin);
          return pluginState ? pluginState.decorations : Decoration.none;
        }),
    }
  );

  return [
    {
      type: 'default',
      value: imageDecorations,
    },
  ];
};
