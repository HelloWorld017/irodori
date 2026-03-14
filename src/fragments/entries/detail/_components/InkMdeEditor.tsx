import { acceptCompletion, autocompletion } from '@codemirror/autocomplete';
import { drawSelection, EditorView, keymap } from '@codemirror/view';
import { ink } from 'ink-mde';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NAMESPACE } from '@/constants/common';
import { Dropzone } from '@/fragments/_components/Dropzone';
import { useClxDB, useServices } from '@/fragments/_providers/DatabaseProvider';
import { useLatestCallback } from '@/hooks/useLatestCallback';
import { useMergedRef } from '@/hooks/useMergedRef';
import { usePaste } from '@/hooks/usePaste';
import { uploadAssetImage } from '@/utils/assets';
import { classes } from '@/utils/classes';
import { createPromisePoolSettled } from '@/utils/promise';
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
    .${NAMESPACE}__ink-mde-editor {
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

  const clxDB = useClxDB();
  const services = useServices();
  const onUploadImage = useCallback(
    async (files: File[]) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      const selection = editor.selections().at(-1);
      const assets = (
        await createPromisePoolSettled(
          files.values().map(file => uploadAssetImage({ clxDB, services, file }))
        )
      )
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      const images = assets.map(asset => `![](web+${NAMESPACE}_asset:${asset.id})\n`).join('');
      editor.insert(images, selection);
    },
    [clxDB, services]
  );

  const pasteRef = usePaste(onUploadImage);
  const mergedRef = useMergedRef(containerRef, pasteRef);
  return (
    <>
      <style>{stylesheet}</style>
      <div
        ref={mergedRef}
        className={classes(
          `${NAMESPACE}__ink-mde-editor`,
          'flex h-[75vh] flex-col rounded-2xl border border-line bg-base-background p-3'
        )}
      />
      <Dropzone
        onDrop={onUploadImage}
        title="이미지를 여기에 놓으세요"
        description="이미지를 여기에 놓아서 본문에 추가할 수 있어요."
      />
    </>
  );
};

export const InkMdeEditor = (props: InkMdeEditorProps) => (
  <EditorPortalProvider>
    <InkMdeEditorInner {...props} />
  </EditorPortalProvider>
);
