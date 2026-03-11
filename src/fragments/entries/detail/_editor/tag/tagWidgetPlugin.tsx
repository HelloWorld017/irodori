import { Decoration, MatchDecorator, ViewPlugin, WidgetType, EditorView } from '@codemirror/view';
import { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { TAG_REFERENCE_ID_REGEX } from '../../_utils/tagReferences';
import { TagMarkup } from './TagMarkup';
import type { TagPluginProps } from './types';
import type { Options as InkMde } from 'ink-mde';
import type { Root } from 'react-dom/client';

type WidgetState = { root: Root; element: HTMLElement; refs: number };

const EmptyTag = () => (
  <span className="inline-flex h-7 w-18 rounded-full bg-elevated-background" />
);

class TagChipWidget extends WidgetType {
  private tagId: string;
  private fetchTag: TagPluginProps['fetchTag'];
  private state: WidgetState | null = null;

  constructor(tagId: string, fetchTag: TagPluginProps['fetchTag']) {
    super();
    this.tagId = tagId;
    this.fetchTag = fetchTag;
  }

  eq(widget: WidgetType): boolean {
    const isEqual = widget instanceof TagChipWidget && widget.tagId === this.tagId;

    if (!isEqual) {
      return false;
    }

    /*
     * This makes `eq` impure.
     * > If you use render or portal, it will certainly have some delay.
     * > And it would make an flickering artifact when user uses the IME,
     * > which will always trigger redraw, regardless of the result of the `eq`.
     *
     * You can use the `renderToStaticMarkup` instead,
     * but this will not be compatible with the `DynamicIcon`.
     *
     * So, by doing a hand-off, this avoids the remounting.
     */

    if (!this.state && widget.state) {
      this.state = widget.state;
    }

    if (!widget.state && this.state) {
      widget.state = this.state;
    }

    return true;
  }

  ensureState(): WidgetState {
    if (this.state) {
      return this.state;
    }

    const element = document.createElement('span');
    element.contentEditable = 'false';
    element.style.userSelect = 'none';

    const root = createRoot(element);
    this.state = { root, element, refs: 0 };
    this.updateDOM(element);
    return this.state;
  }

  toDOM(): HTMLElement {
    const state = this.ensureState();
    state.refs++;

    return state.element;
  }

  updateDOM(dom: HTMLElement): boolean {
    if (dom !== this.state?.element) {
      return false;
    }

    this.state.root.render(
      <Suspense fallback={<EmptyTag />}>
        <TagMarkup uuid={this.tagId} fetchTag={this.fetchTag} />
      </Suspense>
    );
    return true;
  }

  ignoreEvent(): boolean {
    return true;
  }

  destroy(): void {
    if (!this.state) {
      return;
    }

    this.state.refs--;
    setTimeout(() => {
      if (this.state && this.state.refs <= 0) {
        this.state.root.unmount();
      }
    });
  }
}

const tagReferenceDecorator = (fetchTag: TagPluginProps['fetchTag']) =>
  new MatchDecorator({
    regexp: new RegExp(TAG_REFERENCE_ID_REGEX.source, 'g'),
    decoration: match => {
      const tagId = match[1]?.trim();
      if (!tagId) {
        return null;
      }

      return Decoration.replace({
        widget: new TagChipWidget(tagId, fetchTag),
        inclusive: false,
      });
    },
  });

export const createTagWidgetPlugin = ({
  fetchTag,
}: Pick<TagPluginProps, 'fetchTag'>): InkMde.Plugin[] => {
  const decorator = tagReferenceDecorator(fetchTag);
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
