import { ink } from 'ink-mde';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { buildInkMdeTagPlugins } from '../_utils/buildInkMdeTagPlugins';
import type { TagViewItem } from '@/repositories/TagsRepository';
import type { Instance, Options } from 'ink-mde';

type InkMdeEditorProps = {
  notebookId: string;
  resolvedTagsById: Map<string, TagViewItem>;
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
    autocomplete: true,
    images: false,
    lists: true,
    readonly: false,
    spellcheck: false,
    toolbar: false,
  },
  search: true,
};

const css = String.raw;

export const InkMdeEditor = ({
  notebookId,
  resolvedTagsById,
  value,
  placeholder = '',
  onChange,
}: InkMdeEditorProps) => {
  const services = useServices();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);
  const knownTagsRef = useRef(new Map(resolvedTagsById));
  const [initialValue] = useState(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    knownTagsRef.current = new Map([...knownTagsRef.current, ...resolvedTagsById]);
  }, [resolvedTagsById]);

  const getTagById = useCallback((tagId: string) => knownTagsRef.current.get(tagId) ?? null, []);
  const rememberTag = useCallback((tag: TagViewItem) => {
    knownTagsRef.current.set(tag.id, tag);
  }, []);
  const searchTags = useCallback(
    async (query: string) => {
      if (!services) {
        return [];
      }

      const tags = await services.tags.search({
        notebookId,
        query,
        limit: 8,
      });
      tags.forEach(tag => {
        knownTagsRef.current.set(tag.id, tag);
      });
      return tags;
    },
    [notebookId, services]
  );
  const resolveTag = useCallback(
    async (reference: string) => {
      if (!services) {
        return null;
      }

      const tag = await services.tags.resolveReference({
        notebookId,
        reference,
      });

      if (tag) {
        knownTagsRef.current.set(tag.id, tag);
      }

      return tag;
    },
    [notebookId, services]
  );

  useEffect(() => {
    const target = containerRef.current;

    if (!target) {
      return;
    }

    let disposed = false;

    const plugins = buildInkMdeTagPlugins({ getTagById, rememberTag, searchTags, resolveTag });

    void Promise.resolve(
      ink(target, {
        ...editorOptions,
        doc: initialValue,
        placeholder,
        plugins,
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
  }, [getTagById, initialValue, placeholder, rememberTag, resolveTag, searchTags]);

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
