import { EditorView, MatchDecorator, ViewPlugin, Decoration, WidgetType } from '@codemirror/view';
import { useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Tag } from '@/fragments/_components/Tag';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useLatestCallback } from '@/hooks/useLatestCallback';
import { useEntriesNotebookId } from '../../_providers/EntriesProvider';
import { useEntriesDetailResolvedTagsById } from '../_providers/EntriesDetailProvider';
import {
  TAG_REFERENCE_CONTENT_REGEX,
  TAG_REFERENCE_INPUT_REGEX,
  isTagReferenceId,
  toTagReference,
} from '../_utils/tagReferences';
import type { TagViewItem } from '@/repositories/TagsRepository';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { Options } from 'ink-mde';
import type { Root } from 'react-dom/client';

type TagPluginProps = {
  getTagById: (tagId: string) => TagViewItem | null;
  rememberTag: (tag: TagViewItem) => void;
  searchTags: (query: string) => Promise<TagViewItem[]>;
  resolveTag: (reference: string) => Promise<TagViewItem | null>;
};

const widgetRoots = new WeakMap<HTMLElement, Root>();

class TagChipWidget extends WidgetType {
  constructor(private readonly tag: TagViewItem) {
    super();
  }

  eq(widget: WidgetType): boolean {
    return (
      widget instanceof TagChipWidget &&
      widget.tag.id === this.tag.id &&
      widget.tag.label === this.tag.label &&
      widget.tag.color === this.tag.color &&
      widget.tag.icon === this.tag.icon
    );
  }

  toDOM(): HTMLElement {
    const dom = document.createElement('span');
    dom.contentEditable = 'false';

    const root = createRoot(dom);
    root.render(<Tag {...this.tag} />);
    widgetRoots.set(dom, root);

    return dom;
  }

  updateDOM(dom: HTMLElement): boolean {
    const root = widgetRoots.get(dom);

    if (!root) {
      return false;
    }

    root.render(<Tag {...this.tag} />);
    return true;
  }

  ignoreEvent(): boolean {
    return true;
  }

  destroy(dom: HTMLElement): void {
    widgetRoots.get(dom)?.unmount();
    widgetRoots.delete(dom);
  }
}

const tagReferenceDecorator = (getTagById: TagPluginProps['getTagById']) =>
  new MatchDecorator({
    regexp: new RegExp(TAG_REFERENCE_CONTENT_REGEX.source, 'g'),
    decoration: match => {
      const tagId = match[1]?.trim();
      if (!tagId) {
        return null;
      }

      const tag = getTagById(tagId);
      if (!tag) {
        return null;
      }

      return Decoration.replace({
        widget: new TagChipWidget(tag),
      });
    },
  });

const buildCompletionResult = ({
  context,
  query,
  tags,
  rememberTag,
}: {
  context: CompletionContext;
  query: string;
  tags: TagViewItem[];
  rememberTag: TagPluginProps['rememberTag'];
}): CompletionResult | null => {
  if (tags.length === 0) {
    return null;
  }

  const match = context.matchBefore(TAG_REFERENCE_INPUT_REGEX);
  if (!match) {
    return null;
  }

  return {
    from: match.from,
    to: context.pos,
    filter: false,
    options: tags.map<Completion>(tag => ({
      label: tag.label,
      detail: tag.id,
      type: 'text',
      boost: isTagReferenceId(query) && tag.id === query ? 100 : undefined,
      section: '태그',
      commitCharacters: [']'],
      apply: (view, _completion, from, to) => {
        rememberTag(tag);

        const insertedReference = toTagReference(tag.id);
        view.dispatch({
          changes: {
            from,
            to,
            insert: insertedReference,
          },
          selection: {
            anchor: from + insertedReference.length,
          },
        });
      },
    })),
  };
};

const buildCompletionSource =
  ({ searchTags, rememberTag }: Pick<TagPluginProps, 'searchTags' | 'rememberTag'>) =>
  async (context: CompletionContext): Promise<CompletionResult | null> => {
    const match = context.matchBefore(TAG_REFERENCE_INPUT_REGEX);

    if (!match) {
      return null;
    }

    const query = match.text
      .slice(2)
      .replace(/\]\]?$/, '')
      .trim();

    if (!query) {
      return null;
    }

    if (match.from === match.to && !context.explicit) {
      return null;
    }

    const tags = await searchTags(query);
    return buildCompletionResult({ context, query, tags, rememberTag });
  };

const buildAutoResolveExtension = ({
  resolveTag,
  rememberTag,
}: Pick<TagPluginProps, 'resolveTag' | 'rememberTag'>) => {
  const resolvedReferenceCache = new Map<string, Promise<TagViewItem | null>>();

  const resolveReference = (reference: string) => {
    const cached = resolvedReferenceCache.get(reference);
    if (cached) {
      return cached;
    }

    const request = resolveTag(reference)
      .then(tag => {
        if (tag) {
          rememberTag(tag);
        }

        return tag;
      })
      .finally(() => {
        resolvedReferenceCache.delete(reference);
      });

    resolvedReferenceCache.set(reference, request);
    return request;
  };

  return EditorView.updateListener.of(update => {
    if (!update.docChanged) {
      return;
    }

    const doc = update.state.doc.toString();
    const unresolvedMatches = [...doc.matchAll(TAG_REFERENCE_CONTENT_REGEX)].flatMap(match => {
      const reference = match[1]?.trim();
      const index = match.index;

      if (!reference || index === undefined || isTagReferenceId(reference)) {
        return [];
      }

      return [
        {
          from: index,
          to: index + match[0].length,
          reference,
          raw: match[0],
        },
      ];
    });

    if (unresolvedMatches.length === 0) {
      return;
    }

    void Promise.all(
      unresolvedMatches.map(async match => ({
        ...match,
        tag: await resolveReference(match.reference),
      }))
    ).then(matches => {
      const changes = matches.flatMap(match => {
        if (!match.tag) {
          return [];
        }

        const currentText = update.view.state.sliceDoc(match.from, match.to);
        if (currentText !== match.raw) {
          return [];
        }

        return [
          {
            from: match.from,
            to: match.to,
            insert: toTagReference(match.tag.id),
          },
        ];
      });

      if (changes.length === 0) {
        return;
      }

      update.view.dispatch({ changes });
    });
  });
};

const createTagPlugin = ({
  getTagById,
  rememberTag,
  searchTags,
  resolveTag,
}: TagPluginProps): NonNullable<Options['plugins']> => {
  const decorator = tagReferenceDecorator(getTagById);
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
    }
  );

  return [
    {
      type: 'completion',
      value: buildCompletionSource({ searchTags, rememberTag }),
    },
    {
      type: 'default',
      value: [
        tagDecorations,
        EditorView.atomicRanges.of(
          view => view.plugin(tagDecorations)?.decorations ?? Decoration.none
        ),
        buildAutoResolveExtension({ resolveTag, rememberTag }),
      ],
    },
  ];
};

export const useTagPlugin = () => {
  const services = useServices();
  const notebookId = useEntriesNotebookId();
  const resolvedTagsById = useEntriesDetailResolvedTagsById();
  const knownTagsRef = useRef(new Map(resolvedTagsById));

  useEffect(() => {
    knownTagsRef.current = new Map([...knownTagsRef.current, ...resolvedTagsById]);
  }, [resolvedTagsById]);

  const getTagById = useLatestCallback((tagId: string) => knownTagsRef.current.get(tagId) ?? null);
  const rememberTag = useLatestCallback((tag: TagViewItem) => {
    knownTagsRef.current.set(tag.id, tag);
  });

  const searchTags = useLatestCallback(async (query: string) => {
    if (!services) {
      return [];
    }

    return services.tags.search({
      notebookId,
      query,
      limit: 8,
    });
  });

  const resolveTag = useLatestCallback(async (reference: string) => {
    if (!services) {
      return null;
    }

    return services.tags.resolveReference({
      notebookId,
      reference,
    });
  });

  const tagPlugin = useMemo(
    () => createTagPlugin({ getTagById, rememberTag, searchTags, resolveTag }),
    [getTagById, rememberTag, searchTags, resolveTag]
  );

  return tagPlugin;
};
