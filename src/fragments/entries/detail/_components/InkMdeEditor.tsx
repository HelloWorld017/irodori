import { acceptCompletion, autocompletion } from '@codemirror/autocomplete';
import { drawSelection, EditorView, keymap } from '@codemirror/view';
import { ink } from 'ink-mde';
import { useEffect, useRef, useState } from 'react';
import { useLatestCallback } from '@/hooks/useLatestCallback';
import { EditorPortalProvider } from '../_editor/_providers/EditorPortalProvider';
import { useTagPlugin } from '../_editor/tag';
import type { Instance, Options } from 'ink-mde';

type InkMdeEditorProps = {
  value: string;
  placeholder?: string;
  onChange?: (value: string) => void;
};

const editorOptions = {
  files: {
    clipboard: false,
    dragAndDrop: false,
    injectMarkup: false,
    types: ['image/*'],
    handler: () => undefined,
  },
  hooks: {
    afterUpdate: () => undefined,
    beforeUpdate: () => undefined,
  },
  interface: {
    appearance: 'light',
    attribution: false,
    autocomplete: false,
    images: false,
    lists: true,
    spellcheck: false,
    toolbar: false,
  },
  search: true,
} satisfies Options;

const css = String.raw;

const InkMdeEditorInner = ({ value, placeholder = '', onChange }: InkMdeEditorProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Instance | null>(null);
  const onChangeLatest = useLatestCallback(onChange ?? (() => {}));
  const [initialValue] = useState(value);
  const isReadOnly = !onChange;

  const tagPlugin = useTagPlugin();

  useEffect(() => {
    const target = containerRef.current;

    if (!target) {
      return;
    }

    let disposed = false;

    const plugins = [...tagPlugin] as const;
    const completion = autocompletion({
      defaultKeymap: true,
      icons: false,
      override: plugins
        .filter((plugin): plugin is Options.Plugins.Completion => plugin.type === 'completion')
        .map(plugin => plugin.value)
        .filter(<T extends object>(value: T | Promise<T>): value is T => !('then' in value)),
      optionClass: () => 'ink-tooltip-option',
    });

    void Promise.resolve(
      ink(target, {
        ...editorOptions,
        interface: {
          ...editorOptions.interface,
          readonly: isReadOnly,
        },
        doc: initialValue,
        placeholder,
        plugins: [
          ...plugins,
          ...(!isReadOnly
            ? ([
                { type: 'default', value: drawSelection() },
                { type: 'default', value: completion },
                {
                  type: 'default',
                  value: [keymap.of([{ key: 'Tab', run: acceptCompletion }])],
                },
              ] as const)
            : ([{ type: 'default', value: EditorView.editable.of(false) }] as const)),
        ],
        hooks: {
          ...editorOptions.hooks,
          afterUpdate: (doc: string) => {
            onChangeLatest(doc);
          },
        },
      })
    ).then(instance => {
      if (disposed) {
        instance.destroy();
        return;
      }

      editorRef.current = instance;
    });

    return () => {
      disposed = true;
      editorRef.current?.destroy();
      editorRef.current = null;
      target.replaceChildren();
    };
  }, [initialValue, isReadOnly, onChangeLatest, placeholder, tagPlugin]);

  const stylesheet = css`
    .irodori__ink-mde-editor {
      .ink-mde {
        border: none;
      }

      .cm-editor,
      .cm-scroller,
      .cm-content {
        flex-grow: 1;
      }

      .cm-focused {
        outline: 0;
      }

      .cm-widgetBuffer {
        display: none;
      }
    }
  `;

  return (
    <>
      <style>{stylesheet}</style>
      <div
        ref={containerRef}
        className="irodori__ink-mde-editor flex h-[75vh] flex-col rounded-2xl border border-line
          bg-base-background p-3"
      />
    </>
  );
};

export const InkMdeEditor = (props: InkMdeEditorProps) => (
  <EditorPortalProvider>
    <InkMdeEditorInner {...props} />
  </EditorPortalProvider>
);
