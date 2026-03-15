import { syntaxTree } from '@codemirror/language';
import { RangeSet, StateField } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import { Suspense } from 'react';
import { ASSET_IMAGE_MARKUP_REGEX } from '@/fragments/entries/detail/_utils/assetReferences';
import { ComponentWidget } from '../../_utils/ComponentWidget';
import { ImageMarkup } from '../_components/ImageMarkup';
import type { ImagePluginProps } from '../_types/ImagePluginProps';
import type { EditorState, Range } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import type { Options as InkMde } from 'ink-mde';

const EmptyImage = () => (
  <span className="my-4 block h-56 w-full max-w-120 rounded-[1.5rem] bg-elevated-background" />
);

const imageDecorator =
  ({ isReadOnly, fetchAsset, portal }: ImagePluginProps) =>
  (state: EditorState) => {
    const widgets: Range<Decoration>[] = [];

    syntaxTree(state).iterate({
      enter: ({ type, from, to }) => {
        if (type.name === 'Image') {
          const match = state.doc.sliceString(from, to).match(ASSET_IMAGE_MARKUP_REGEX);
          if (!match) {
            return;
          }

          const alt = match[1]?.trim() ?? '';
          const assetId = match[2]?.trim();
          if (!assetId) {
            return;
          }

          widgets.push(
            Decoration.replace({
              widget: new ComponentWidget({
                id: `asset-image:${assetId}`,
                portal,
                render: () => (
                  <Suspense fallback={<EmptyImage />}>
                    <ImageMarkup
                      assetId={assetId}
                      alt={alt}
                      fetchAsset={fetchAsset}
                      isGalleryEnabled={isReadOnly}
                    />
                  </Suspense>
                ),
              }),
              side: -1,
              block: true,
            }).range(from, to)
          );
        }
      },
    });

    widgets.sort((a, b) => a.from - b.from);

    return widgets.length > 0 ? RangeSet.of(widgets) : Decoration.none;
  };

export const createImageWidgetPlugin = ({
  isReadOnly,
  fetchAsset,
  portal,
}: ImagePluginProps): InkMde.Plugin[] => {
  const decorator = imageDecorator({ isReadOnly, fetchAsset, portal });
  const imagesField = StateField.define<DecorationSet>({
    create(state) {
      return decorator(state);
    },
    update(images, transaction) {
      if (transaction.docChanged) {
        return decorator(transaction.state);
      }

      return images.map(transaction.changes);
    },
    provide(field) {
      return EditorView.decorations.from(field);
    },
  });

  return [
    {
      type: 'default',
      value: imagesField,
    },
  ];
};
