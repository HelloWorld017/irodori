import { EditorSelection } from '@codemirror/state';
import {
  isTagReferenceId,
  TAG_REFERENCE_INPUT_REGEX,
  toTagReference,
} from '@/fragments/entries/detail/_utils/tagReferences';
import type { TagPluginProps } from '../_types/TagPluginProps';
import type { TagViewItem } from '@/repositories/TagsRepository';
import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { Options as InkMde } from 'ink-mde';

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
      type: 'text',
      boost: isTagReferenceId(query) && tag.id === query ? 100 : undefined,
      section: '태그',
      apply: (view, _completion, from, to) => {
        rememberTag(tag);

        const insertedReference = toTagReference(tag.id) + ' ';
        view.dispatch({
          changes: { from, to, insert: insertedReference },
          selection: EditorSelection.cursor(from + insertedReference.length, 1),
        });
      },
    })),
  };
};

export const createTagCompletionPlugin = ({
  searchTags,
  rememberTag,
}: Pick<TagPluginProps, 'searchTags' | 'rememberTag'>): InkMde.Plugin[] => {
  const completionSource = async (context: CompletionContext): Promise<CompletionResult | null> => {
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

  return [
    {
      type: 'completion',
      value: completionSource,
    },
  ];
};
