import { ink } from 'ink-mde';
import { useEffect, useEffectEvent, useRef } from 'react';
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

export const InkMdeEditor = ({ value, placeholder = '', onChange }: InkMdeEditorProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Instance | null>(null);
  const onChangeEvent = useEffectEvent(onChange);

  useEffect(() => {
    const target = containerRef.current;

    if (!target) {
      return;
    }

    let disposed = false;

    void Promise.resolve(
      ink(target, {
        ...editorOptions,
        doc: '',
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

      editorRef.current = instance;
    });

    return () => {
      disposed = true;
      editorRef.current?.destroy();
      editorRef.current = null;
      target.replaceChildren();
    };
  }, [placeholder]);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    if (editor.getDoc() !== value) {
      editor.update(value);
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="min-h-96 rounded-2xl border border-line bg-base-background p-3"
    />
  );
};
