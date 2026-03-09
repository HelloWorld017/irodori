import { EditorView } from '@codemirror/view';
import {
  isTagReferenceId,
  TAG_REFERENCE_CONTENT_REGEX,
  toTagReference,
} from '../../_utils/tagReferences';
import type { TagPluginProps } from './types';
import type { TagViewItem } from '@/repositories/TagsRepository';
import type { Options as InkMde } from 'ink-mde';

export const createTagResolutionPlugin = ({
  resolveTag,
  rememberTag,
}: Pick<TagPluginProps, 'resolveTag' | 'rememberTag'>): InkMde.Plugin[] => {
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

  const plugin = EditorView.updateListener.of(update => {
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

  return [
    {
      type: 'default',
      value: plugin,
    },
  ];
};
