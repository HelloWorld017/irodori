import { Popover } from '@headlessui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatedPopoverPanel } from '@/fragments/_components/AnimatedPopoverPanel';
import { Tag } from '@/fragments/_components/Tag';
import { IconSquarePlus } from '@/fragments/_icons';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useShowToast } from '@/fragments/_providers/ToastProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { classes } from '@/utils/classes';
import { anyParams, queryKey } from '@/utils/queryKey';
import type { EntriesSearchCriteria } from '../_types/EntriesSearchCriteria';
import type { TagViewItem } from '@/repositories/TagsRepository';
import type { KeyboardEvent, ReactNode } from 'react';

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

type AutocompleteTraverseMethod = 'arrow' | 'tab';

type AutocompleteItem =
  | { kind: 'tag'; id: string; tag: TagViewItem }
  | { kind: 'create'; id: string; label: string };

const toUniqueTags = (tags: TagViewItem[]): TagViewItem[] => {
  const tagsById = new Map<string, TagViewItem>();
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeAutocompleteIndex, setActiveAutocompleteIndex] = useState<number | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [lastTraverseMethod, setLastTraverseMethod] = useState<AutocompleteTraverseMethod | null>(
    null
  );

  const tagCategoriesQuery = useQuery({
    queryKey: queryKey('common', 'search-tag-categories', notebookId),
    queryFn: () => services.tagCategories.listByNotebookId(notebookId),
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
    enabled: debouncedDraft !== '',
    queryKey: queryKey('common', 'search-tags', {
      notebookId,
      categoryId: tagsCategoryId ?? null,
      query: debouncedDraft,
      limit: searchLimit,
    }),
    queryFn: () =>
      services.tags.search({
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
    debouncedDraft !== '' &&
    !debouncedDraft.includes(':') &&
    !hasMatchedLabel &&
    !tagsQuery.isFetching;

  const autocompleteItems = useMemo<AutocompleteItem[]>(() => {
    const items: AutocompleteItem[] = suggestions.map(tag => ({ kind: 'tag', id: tag.id, tag }));

    if (canCreateTagCandidate) {
      items.push({ kind: 'create', id: '__create__', label: debouncedDraft });
    }

    return items;
  }, [canCreateTagCandidate, suggestions, debouncedDraft]);

  const isAutocompleteOpen = isInputFocused && normalizedDraft !== '';
  const activeAutocompleteItem =
    activeAutocompleteIndex === null ? null : (autocompleteItems[activeAutocompleteIndex] ?? null);

  const createTagMutation = useMutation({
    mutationFn: async (label: string) => {
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
        queryKey: queryKey('common', 'search-tags', anyParams),
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

  useEffect(() => {
    if (!isAutocompleteOpen || autocompleteItems.length === 0) {
      setActiveAutocompleteIndex(null);
      setLastTraverseMethod(null);
      return;
    }

    setActiveAutocompleteIndex(current => {
      if (current === null) {
        return null;
      }

      return Math.min(current, autocompleteItems.length - 1);
    });
  }, [autocompleteItems.length, isAutocompleteOpen]);

  const clearAutocompleteState = () => {
    setActiveAutocompleteIndex(null);
    setLastTraverseMethod(null);
  };

  const removeTag = (tagId: string) => {
    clearAutocompleteState();
    onRemoveTag?.(tagId);
    onChange?.({
      ...value,
      tags: value.tags.filter(tag => tag.id !== tagId),
    });
  };

  const appendTag = (tag: TagViewItem) => {
    if (selectedTagIds.has(tag.id) || maxSelectionReached) {
      return;
    }

    clearAutocompleteState();
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
    clearAutocompleteState();
    inputRef.current?.blur();
  };

  const traverseAutocomplete = (direction: -1 | 1, method: AutocompleteTraverseMethod) => {
    if (!isAutocompleteOpen || autocompleteItems.length === 0) {
      return;
    }

    setActiveAutocompleteIndex(current => {
      if (current === null) {
        return direction === 1 ? 0 : autocompleteItems.length - 1;
      }

      const nextIndex = current + direction;

      if (nextIndex < 0) {
        return autocompleteItems.length - 1;
      }

      if (nextIndex >= autocompleteItems.length) {
        return 0;
      }

      return nextIndex;
    });
    setLastTraverseMethod(method);
  };

  const applyAutocompleteItem = (item: AutocompleteItem) => {
    if (item.kind === 'tag') {
      appendTag(item.tag);
      return;
    }

    if (createTagMutation.isPending || maxSelectionReached) {
      return;
    }

    clearAutocompleteState();
    createTagMutation.mutate(item.label);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (autocompleteItems.length === 0 || !isAutocompleteOpen) {
        return;
      }

      event.preventDefault();
      traverseAutocomplete(event.key === 'ArrowDown' ? 1 : -1, 'arrow');
      return;
    }

    if (event.key === 'Tab') {
      if (autocompleteItems.length === 0 || !isAutocompleteOpen) {
        return;
      }

      event.preventDefault();

      if (lastTraverseMethod === 'arrow' && activeAutocompleteItem) {
        applyAutocompleteItem(activeAutocompleteItem);
        return;
      }

      traverseAutocomplete(event.shiftKey ? -1 : 1, 'tab');
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (activeAutocompleteItem) {
        applyAutocompleteItem(activeAutocompleteItem);
        return;
      }

      handleSubmit();
    }
  };

  return (
    <Popover className={classes('relative w-full', className)}>
      <div
        className={classes(
          `flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-base-background p-2
          px-2.5`,
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
              ref={inputRef}
              className={`min-h-7 w-20 flex-[1_0] basis-20 self-stretch text-sm text-primary
                outline-none placeholder:text-tertiary`}
              value={value.draft}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => {
                setIsInputFocused(false);
                clearAutocompleteState();
              }}
              onChange={event => {
                clearAutocompleteState();
                onChange?.({
                  ...value,
                  draft: event.target.value,
                });
              }}
              onKeyDown={handleInputKeyDown}
              placeholder={placeholder}
            />
          </div>
        </div>
        {children && <div className="flex flex-none gap-2 p-1">{children}</div>}
      </div>

      {isAutocompleteOpen ? (
        <AnimatedPopoverPanel
          animate={false}
          className="absolute top-full left-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border
            border-line bg-base-background shadow-elevated"
        >
          <ul>
            {autocompleteItems.map((item, index) => {
              const isActive = activeAutocompleteIndex === index;

              if (item.kind === 'tag') {
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => applyAutocompleteItem(item)}
                      disabled={maxSelectionReached}
                      className={classes(
                        `flex w-full items-center px-2 py-1.5 text-left transition
                          hover:bg-elevated-background disabled:cursor-not-allowed
                          disabled:opacity-60`,
                        isActive && 'bg-elevated-background'
                      )}
                    >
                      <Tag {...item.tag} />
                    </button>
                  </li>
                );
              }

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => applyAutocompleteItem(item)}
                    disabled={createTagMutation.isPending || maxSelectionReached}
                    className={classes(
                      `flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary
                        transition hover:bg-elevated-background disabled:cursor-not-allowed
                        disabled:opacity-60`,
                      isActive && 'bg-elevated-background'
                    )}
                  >
                    <IconSquarePlus className="text-base" />
                    {createTagMutation.isPending
                      ? '새 태그를 만들고 있어요...'
                      : `"${item.label}" 태그 추가`}
                  </button>
                </li>
              );
            })}

            {autocompleteItems.length === 0 ? (
              <li className="px-3 py-2 text-center text-sm text-tertiary">
                {hasTagQueryError ? '태그 후보를 불러오지 못했어요.' : '일치하는 태그가 없어요.'}
              </li>
            ) : null}
          </ul>
        </AnimatedPopoverPanel>
      ) : null}
      {maxSelectionReached ? (
        <p className="mt-2 text-xs text-tertiary">
          최대 {maxSelect}개의 태그까지 선택할 수 있어요.
        </p>
      ) : null}

      {hasTagQueryError && !isAutocompleteOpen ? (
        <p className="mt-2 text-xs text-tertiary">태그 후보를 불러오지 못했어요.</p>
      ) : null}
    </Popover>
  );
};
