import { ink } from 'ink-mde';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
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
  const [initialValue] = useState(value);
  const onChangeEvent = useEffectEvent(onChange);

  useEffect(() => {
    const target = containerRef.current;

    if (!target) {
      return;
    }

    let disposed = false;
    let editor: Instance | null = null;

    void Promise.resolve(
      ink(target, {
        ...editorOptions,
        doc: initialValue,
        placeholder,
        hooks: {
          ...editorOptions.hooks,
          afterUpdate: (doc: string) => {
            onChangeEvent(doc);
          },
        },
      })
    ).then(instance => {
      if (disposed) {
        instance.destroy();
        return;
      }

      editor = instance;
    });

    return () => {
      disposed = true;
      editor?.destroy();
      target.replaceChildren();
    };
  }, [initialValue, placeholder]);

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
