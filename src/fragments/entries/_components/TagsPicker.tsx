import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Tag } from '@/fragments/_components/Tag';
import { IconSquarePlus } from '@/fragments/_icons';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useShowToast } from '@/fragments/_providers/ToastProvider';
import { classes } from '@/utils/classes';
import { queryKey } from '@/utils/queryKey';
import type { EntriesSearchCriteria } from '../_types';
import type { Tag as TagModel } from '@/repositories/TagsRepository';

type TagsPickerValue = Pick<EntriesSearchCriteria, 'draft' | 'tags'>;

type TagsPickerProps = {
  notebookId: string;
  tagsCategoryId?: string;
  value: TagsPickerValue;
  allowDraft?: boolean;
  allowCreateTag?: boolean;
  className?: string;
  placeholder?: string;
  onChange: (value: TagsPickerValue) => void;
  onSubmit?: (value: TagsPickerValue) => void;
};

const DEFAULT_NEW_TAG_COLOR = '#00a6f4';

const toUniqueTags = (tags: TagModel[]): TagModel[] => {
  const tagsById = new Map<string, TagModel>();
  tags.forEach(tag => {
    tagsById.set(tag.id, tag);
  });
  return [...tagsById.values()];
};

const toTagKey = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');

  if (normalized !== '') {
    return normalized;
  }

  return `tag-${Date.now()}`;
};

export const TagsPicker = ({
  notebookId,
  tagsCategoryId,
  value,
  allowDraft = true,
  allowCreateTag = false,
  className,
  placeholder = '태그나 키워드를 입력하세요',
  onChange,
  onSubmit,
}: TagsPickerProps) => {
  const services = useServices();
  const showToast = useShowToast();
  const queryClient = useQueryClient();

  const tagCategoriesQuery = useQuery({
    enabled: services !== null,
    queryKey: queryKey('entries', 'search-tag-categories', notebookId),
    queryFn: () => services!.tagCategories.listByNotebookId(notebookId),
  });

  const categoryIds = useMemo(() => {
    if (tagsCategoryId) {
      return [tagsCategoryId];
    }

    return (tagCategoriesQuery.data ?? []).map(category => category.id);
  }, [tagCategoriesQuery.data, tagsCategoryId]);

  const tagsQueries = useQueries({
    queries: categoryIds.map(categoryId => ({
      enabled: services !== null,
      queryKey: queryKey('entries', 'search-tags', { notebookId, categoryId }),
      queryFn: () => services!.tags.listByCategoryId(categoryId),
    })),
  });

  const selectedCategory = useMemo(() => {
    if (!tagsCategoryId) {
      return null;
    }

    return (tagCategoriesQuery.data ?? []).find(category => category.id === tagsCategoryId) ?? null;
  }, [tagCategoriesQuery.data, tagsCategoryId]);

  const availableTags = useMemo(() => {
    const tagsById = new Map<string, TagModel>();
    tagsQueries.forEach(tagsQuery => {
      (tagsQuery.data ?? []).forEach(tag => {
        tagsById.set(tag.id, tag);
      });
    });

    return [...tagsById.values()];
  }, [tagsQueries]);

  const selectedTagIds = useMemo(() => new Set(value.tags.map(tag => tag.id)), [value.tags]);
  const normalizedDraft = value.draft.trim().toLowerCase();
  const maxSelect = tagsCategoryId ? (selectedCategory?.maxSelect ?? null) : null;
  const maxSelectionReached = maxSelect !== null && value.tags.length >= maxSelect;
  const hasTagQueryError =
    tagCategoriesQuery.isError || tagsQueries.some(tagsQuery => tagsQuery.isError);

  const suggestions = useMemo(
    () =>
      availableTags.filter(tag => {
        if (selectedTagIds.has(tag.id)) {
          return false;
        }

        if (normalizedDraft === '') {
          return true;
        }

        return (
          tag.label.toLowerCase().includes(normalizedDraft) ||
          tag.key.toLowerCase().includes(normalizedDraft)
        );
      }),
    [availableTags, normalizedDraft, selectedTagIds]
  );

  const canCreateTagCandidate =
    allowCreateTag &&
    Boolean(tagsCategoryId) &&
    normalizedDraft !== '' &&
    !availableTags.some(
      tag =>
        tag.label.toLowerCase() === normalizedDraft || tag.key.toLowerCase() === normalizedDraft
    );

  const createTagMutation = useMutation({
    mutationFn: async (label: string) => {
      if (!services) {
        throw new Error('Services are not initialized.');
      }

      if (!tagsCategoryId) {
        throw new Error('tagsCategoryId is required to create a tag.');
      }

      return services.tags.create({
        categoryId: tagsCategoryId,
        key: toTagKey(label),
        label: label.trim(),
        color: DEFAULT_NEW_TAG_COLOR,
      });
    },
    onSuccess: async createdTag => {
      await queryClient.invalidateQueries({ queryKey: ['entries', 'search-tags'] });
      onChange({
        draft: '',
        tags: toUniqueTags([...value.tags, createdTag]),
      });
    },
    onError: error => {
      console.error('Failed to create a tag', error);
      showToast({
        kind: 'error',
        message: '새 태그를 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    },
  });

  const removeTag = (tagId: string) => {
    onChange({
      ...value,
      tags: value.tags.filter(tag => tag.id !== tagId),
    });
  };

  const appendTag = (tag: TagModel) => {
    if (selectedTagIds.has(tag.id) || maxSelectionReached) {
      return;
    }

    onChange({
      draft: '',
      tags: toUniqueTags([...value.tags, tag]),
    });
  };

  const handleSubmit = () => {
    if (!allowDraft && value.draft !== '') {
      return;
    }

    onSubmit?.(value);
  };

  return (
    <section className={classes('relative w-full', className)}>
      <div
        className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-line
          bg-base-background px-3 py-2"
      >
        {value.tags.map(tag => (
          <Tag
            key={tag.id}
            label={tag.label}
            color={tag.color}
            onRemove={() => removeTag(tag.id)}
          />
        ))}

        <input
          value={value.draft}
          onChange={event => {
            onChange({
              ...value,
              draft: event.target.value,
            });
          }}
          onKeyDown={event => {
            if (
              event.key === 'Backspace' &&
              value.draft === '' &&
              event.currentTarget.selectionStart === 0 &&
              event.currentTarget.selectionEnd === 0 &&
              value.tags.length > 0
            ) {
              event.preventDefault();
              removeTag(value.tags[value.tags.length - 1].id);
              return;
            }

            if (event.key === 'Enter') {
              event.preventDefault();
              handleSubmit();
            }
          }}
          className="min-w-28 flex-1 bg-transparent text-sm text-primary outline-none
            placeholder:text-tertiary"
          placeholder={placeholder}
        />
      </div>

      {maxSelectionReached ? (
        <p className="mt-2 text-xs text-tertiary">
          최대 {maxSelect}개의 태그까지 선택할 수 있어요.
        </p>
      ) : null}

      {hasTagQueryError ? (
        <p className="mt-2 text-xs text-tertiary">태그 후보를 불러오지 못했어요.</p>
      ) : null}

      {normalizedDraft !== '' ? (
        <ul
          className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-line
            bg-base-background shadow-elevated"
        >
          {suggestions.map(tag => (
            <li key={tag.id}>
              <button
                type="button"
                onClick={() => appendTag(tag)}
                disabled={maxSelectionReached}
                className="flex w-full items-center px-2 py-1.5 text-left transition
                  hover:bg-elevated-background disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Tag label={tag.label} color={tag.color} className="border-transparent" />
              </button>
            </li>
          ))}

          {canCreateTagCandidate ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  if (createTagMutation.isPending || maxSelectionReached) {
                    return;
                  }

                  createTagMutation.mutate(value.draft);
                }}
                disabled={createTagMutation.isPending || maxSelectionReached}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary
                  transition hover:bg-elevated-background disabled:cursor-not-allowed
                  disabled:opacity-60"
              >
                <IconSquarePlus className="text-base" />
                {createTagMutation.isPending
                  ? '새 태그를 만들고 있어요...'
                  : `"${value.draft.trim()}" 태그 추가`}
              </button>
            </li>
          ) : null}

          {suggestions.length === 0 && !canCreateTagCandidate ? (
            <li className="px-3 py-2 text-sm text-secondary">일치하는 태그가 없어요.</li>
          ) : null}
        </ul>
      ) : null}
    </section>
  );
};
