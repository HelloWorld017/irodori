import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Tag } from '@/fragments/_components/Tag';
import { IconSquarePlus } from '@/fragments/_icons';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useShowToast } from '@/fragments/_providers/ToastProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { classes } from '@/utils/classes';
import { anyParams, queryKey } from '@/utils/queryKey';
import type { EntriesSearchCriteria } from '../_types/EntriesSearchCriteria';
import type { TagViewItem as TagModel } from '@/repositories/TagsRepository';
import type { ReactNode } from 'react';

type TagsPickerValue = Pick<EntriesSearchCriteria, 'draft' | 'tags'>;

type TagsPickerProps = {
  notebookId: string;
  tagsCategoryId?: string;
  searchLimit?: number;
  multiLine?: boolean;
  value: TagsPickerValue;
  allowDraft?: boolean;
  allowCreateTag?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  icon?: ReactNode;
  children?: ReactNode;
  onChange?: (value: TagsPickerValue) => void;
  onAddTag?: (tagId: string) => void;
  onRemoveTag?: (tagId: string) => void;
  onSubmit?: (value: TagsPickerValue) => void;
};

const toUniqueTags = (tags: TagModel[]): TagModel[] => {
  const tagsById = new Map<string, TagModel>();
  tags.forEach(tag => {
    tagsById.set(tag.id, tag);
  });
  return [...tagsById.values()];
};

export const TagsPicker = ({
  notebookId,
  tagsCategoryId,
  searchLimit = 5,
  multiLine = true,
  value,
  allowDraft = true,
  allowCreateTag = false,
  className,
  inputClassName,
  placeholder = '태그나 키워드를 입력하세요',
  icon,
  children,
  onChange,
  onAddTag,
  onRemoveTag,
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

  const selectedCategory = useMemo(() => {
    if (!tagsCategoryId) {
      return null;
    }

    return (tagCategoriesQuery.data ?? []).find(category => category.id === tagsCategoryId) ?? null;
  }, [tagCategoriesQuery.data, tagsCategoryId]);

  const selectedTagIds = useMemo(() => new Set(value.tags.map(tag => tag.id)), [value.tags]);
  const trimmedDraft = value.draft.trim();
  const normalizedDraft = trimmedDraft.toLowerCase();
  const debouncedDraft = useDebouncedValue(trimmedDraft, { delay: 200 });

  const tagsQuery = useQuery({
    enabled: services !== null && debouncedDraft !== '',
    queryKey: queryKey('entries', 'search-tags', {
      notebookId,
      categoryId: tagsCategoryId ?? null,
      query: debouncedDraft,
      limit: searchLimit,
    }),
    queryFn: () =>
      services!.tags.search({
        notebookId,
        categoryId: tagsCategoryId,
        query: debouncedDraft,
        limit: searchLimit,
      }),
  });

  const maxSelect = tagsCategoryId ? (selectedCategory?.maxSelect ?? null) : null;
  const maxSelectionReached = maxSelect !== null && value.tags.length >= maxSelect;
  const hasTagQueryError = tagCategoriesQuery.isError || (trimmedDraft !== '' && tagsQuery.isError);

  const suggestions = useMemo(
    () => (tagsQuery.data ?? []).filter(tag => !selectedTagIds.has(tag.id)),
    [selectedTagIds, tagsQuery.data]
  );

  const hasMatchedLabel = (tagsQuery.data ?? []).some(
    tag => tag.label.toLowerCase() === normalizedDraft
  );

  const canCreateTagCandidate =
    allowCreateTag &&
    Boolean(tagsCategoryId) &&
    trimmedDraft !== '' &&
    !trimmedDraft.includes(':') &&
    !hasMatchedLabel &&
    !tagsQuery.isFetching;

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
        label: label.trim(),
      });
    },
    onSuccess: async createdTag => {
      await queryClient.invalidateQueries({
        queryKey: queryKey('entries', 'search-tags', anyParams),
      });

      onAddTag?.(createdTag.id);
      onChange?.({
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
    onRemoveTag?.(tagId);
    onChange?.({
      ...value,
      tags: value.tags.filter(tag => tag.id !== tagId),
    });
  };

  const appendTag = (tag: TagModel) => {
    if (selectedTagIds.has(tag.id) || maxSelectionReached) {
      return;
    }

    onAddTag?.(tag.id);
    onChange?.({
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
    <div className={classes('relative w-full', className)}>
      <div
        className={classes(
          'flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-base-background p-3',
          inputClassName
        )}
      >
        {icon && <div className="flex flex-none p-1">{icon}</div>}
        <div
          className={classes(
            'flex min-w-0 flex-1',
            !multiLine && 'relative justify-end overflow-x-hidden'
          )}
        >
          <div
            className={classes(
              'flex flex-1 items-center gap-2',
              multiLine && 'min-w-0 flex-wrap',
              !multiLine && 'shrink-0 basis-auto'
            )}
          >
            {value.tags.map(tag => (
              <Tag key={tag.id} className="flex-none" onRemove={() => removeTag(tag.id)} {...tag} />
            ))}

            <input
              className={`min-h-7 w-20 flex-[1_0] basis-20 self-stretch text-sm text-primary
                outline-none placeholder:text-tertiary`}
              value={value.draft}
              onChange={event => {
                onChange?.({
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
              placeholder={placeholder}
            />
          </div>
        </div>
        {children && <div className="flex flex-none gap-2 p-1">{children}</div>}
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

                  createTagMutation.mutate(trimmedDraft);
                }}
                disabled={createTagMutation.isPending || maxSelectionReached}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary
                  transition hover:bg-elevated-background disabled:cursor-not-allowed
                  disabled:opacity-60"
              >
                <IconSquarePlus className="text-base" />
                {createTagMutation.isPending
                  ? '새 태그를 만들고 있어요...'
                  : `"${trimmedDraft}" 태그 추가`}
              </button>
            </li>
          ) : null}

          {suggestions.length === 0 && !canCreateTagCandidate ? (
            <li className="px-3 py-2 text-center text-sm text-tertiary">일치하는 태그가 없어요.</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
};
