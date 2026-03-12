import { Decoration, MatchDecorator, ViewPlugin, EditorView } from '@codemirror/view';
import { Suspense } from 'react';
import { TAG_REFERENCE_ID_REGEX } from '@/fragments/entries/detail/_utils/tagReferences';
import { ComponentWidget } from '../../_utils/ComponentWidget';
import { TagMarkup } from '../_components/TagMarkup';
import type { EditorPortal } from '../../_providers/EditorPortalProvider';
import type { TagPluginProps } from '../_types/TagPluginProps';
import type { Options as InkMde } from 'ink-mde';

const EmptyTag = () => (
  <span className="inline-flex h-7 w-18 rounded-full bg-elevated-background" />
);

const tagReferenceDecorator = ({ fetchTag, portal }: Pick<TagPluginProps, 'fetchTag' | 'portal'>) =>
  new MatchDecorator({
    regexp: new RegExp(TAG_REFERENCE_ID_REGEX.source, 'g'),
    decoration: match => {
      const tagId = match[1]?.trim();
      if (!tagId) {
        return null;
      }

      return Decoration.replace({
        widget: new ComponentWidget({
          id: `tag-chip:${tagId}`,
          portal,
          render: () => (
            <Suspense fallback={<EmptyTag />}>
              <TagMarkup uuid={tagId} fetchTag={fetchTag} />
            </Suspense>
          ),
        }),
        inclusive: false,
      });
    },
  });

export const createTagWidgetPlugin = ({
  fetchTag,
  portal,
}: Pick<TagPluginProps, 'fetchTag'> & { portal: EditorPortal }): InkMde.Plugin[] => {
  const decorator = tagReferenceDecorator({ fetchTag, portal });
  const tagDecorations = ViewPlugin.fromClass(
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
          let pluginState = view.plugin(plugin);
          return pluginState ? pluginState.decorations : Decoration.none;
        }),
    }
  );

  return [
    {
      type: 'default',
      value: tagDecorations,
    },
  ];
};
