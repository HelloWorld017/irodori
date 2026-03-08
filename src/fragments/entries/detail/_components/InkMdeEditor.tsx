import { autocompletion } from '@codemirror/autocomplete';
import { drawSelection } from '@codemirror/view';
import { ink } from 'ink-mde';
import { useEffect, useRef, useState } from 'react';
import { useTagPlugin } from '../_editor/useTagPlugin';
import type { Instance, Options } from 'ink-mde';

type InkMdeEditorProps = {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

const editorOptions: Options = {
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
    readonly: false,
    spellcheck: false,
    toolbar: false,
  },
  search: true,
};

const css = String.raw;

export const InkMdeEditor = ({ value, placeholder = '', onChange }: InkMdeEditorProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);
  const [initialValue] = useState(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const tagPlugin = useTagPlugin();

  useEffect(() => {
    const target = containerRef.current;

    if (!target) {
      return;
    }

    let disposed = false;

    const plugins = [...tagPlugin, { type: 'default', value: drawSelection() }] as const;
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
        doc: initialValue,
        placeholder,
        plugins: [...plugins, { type: 'default', value: completion }],
        hooks: {
          ...editorOptions.hooks,
          afterUpdate: (doc: string) => {
            onChangeRef.current(doc);
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
  }, [initialValue, placeholder, tagPlugin]);

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
