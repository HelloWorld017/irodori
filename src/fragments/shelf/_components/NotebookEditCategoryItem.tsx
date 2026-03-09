import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ColorPicker } from '@/fragments/_components/ColorPicker';
import { IconPicker } from '@/fragments/_components/IconPicker';
import { Tag } from '@/fragments/_components/Tag';
import { Toggle } from '@/fragments/_components/Toggle';
import { IconPencil, IconTrash } from '@/fragments/_icons';
import { useConfirm } from '@/fragments/_providers/AlertProvider';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useShowToast } from '@/fragments/_providers/ToastProvider';
import { anyParams, queryKey } from '@/utils/queryKey';
import type { TagCategory } from '@/repositories/TagCategoriesRepository';

type NotebookEditCategoryItemProps = {
  notebookId: string;
  category: TagCategory;
  categoriesQueryKey: readonly unknown[];
};

type CategoryUpdateDraft = {
  label: string;
  icon: string | null;
  color: string;
  displayed: boolean;
  minSelect: number;
  maxSelect: number | null;
};

export const NotebookEditCategoryItem = ({
  notebookId,
  category,
  categoriesQueryKey,
}: NotebookEditCategoryItemProps) => {
  const services = useServices();
  const confirm = useConfirm();
  const showToast = useShowToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [displayedOverride, setDisplayedOverride] = useState<boolean | null>(null);
  const [draftLabel, setDraftLabel] = useState(category.label);
  const [draftIcon, setDraftIcon] = useState<string | null>(category.icon);
  const [draftColor, setDraftColor] = useState(category.color);
  const [draftMinSelect, setDraftMinSelect] = useState(String(category.minSelect));
  const [draftMaxSelect, setDraftMaxSelect] = useState(
    category.maxSelect === null ? '' : String(category.maxSelect)
  );

  const displayed = displayedOverride ?? category.displayed;

  const categoryTagsQueryKey = queryKey('shelf', 'notebook-edit-category-tags', {
    notebookId,
    categoryId: category.id,
  });

  const categoryTagsQuery = useQuery({
    enabled: services !== null,
    queryKey: categoryTagsQueryKey,
    queryFn: () => services!.tags.listByCategoryId(category.id),
  });

  const invalidateQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey }),
      queryClient.invalidateQueries({ queryKey: categoryTagsQueryKey }),
      queryClient.invalidateQueries({
        queryKey: queryKey('common', 'search-tag-categories', notebookId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKey('common', 'search-tags', anyParams),
      }),
    ]);
  };

  const updateCategoryMutation = useMutation({
    mutationFn: async (input: CategoryUpdateDraft) => {
      if (!services) {
        throw new Error('Services are not initialized.');
      }

      return services.tagCategories.update({
        id: category.id,
        label: input.label,
        icon: input.icon,
        color: input.color,
        displayed: input.displayed,
        sortOrder: category.sortOrder,
        minSelect: input.minSelect,
        maxSelect: input.maxSelect,
        required: category.required,
      });
    },
  });

  const removeCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!services) {
        throw new Error('Services are not initialized.');
      }

      await services.tagCategories.remove({ id: category.id });
    },
  });

  const isPending = updateCategoryMutation.isPending || removeCategoryMutation.isPending;

  const resetDraft = () => {
    setDraftLabel(category.label);
    setDraftIcon(category.icon);
    setDraftColor(category.color);
    setDraftMinSelect(String(category.minSelect));
    setDraftMaxSelect(category.maxSelect === null ? '' : String(category.maxSelect));
  };

  const updateCategory = (
    input: CategoryUpdateDraft,
    successMessage: string,
    callbacks?: { onSuccess?: () => void; onError?: () => void }
  ) => {
    updateCategoryMutation.mutate(input, {
      onSuccess: async () => {
        await invalidateQueries();
        showToast({ kind: 'success', message: successMessage });
        callbacks?.onSuccess?.();
      },
      onError: error => {
        callbacks?.onError?.();
        console.error('Failed to update tag category', error);
        showToast({
          kind: 'error',
          message: '태그 카테고리를 수정하지 못했어요. 잠시 후 다시 시도해 주세요.',
        });
      },
    });
  };

  const handleDisplayedToggle = (nextDisplayed: boolean) => {
    if (isPending) {
      return;
    }

    const previousDisplayed = displayed;
    setDisplayedOverride(nextDisplayed);

    updateCategory(
      {
        label: category.label,
        icon: category.icon,
        color: category.color,
        displayed: nextDisplayed,
        minSelect: category.minSelect,
        maxSelect: category.maxSelect,
      },
      '목록 표시 여부를 변경했어요.',
      {
        onSuccess: () => {
          setDisplayedOverride(null);
        },
        onError: () => {
          setDisplayedOverride(previousDisplayed);
        },
      }
    );
  };

  const handleSaveEdit = () => {
    const label = draftLabel.trim();
    const color = draftColor.trim();
    const icon = draftIcon?.trim() ? draftIcon.trim() : null;
    const minSelect = Number.parseInt(draftMinSelect.trim(), 10);
    const maxSelectDraft = draftMaxSelect.trim();

    if (!label) {
      showToast({ kind: 'error', message: '카테고리 제목을 입력해 주세요.' });
      return;
    }

    if (!color) {
      showToast({ kind: 'error', message: '카테고리 색상을 선택해 주세요.' });
      return;
    }

    if (!Number.isInteger(minSelect) || minSelect < 0) {
      showToast({ kind: 'error', message: '최소 선택 수는 0 이상의 숫자여야 해요.' });
      return;
    }

    let maxSelect: number | null = null;
    if (maxSelectDraft) {
      const parsedMaxSelect = Number.parseInt(maxSelectDraft, 10);
      if (!Number.isInteger(parsedMaxSelect) || parsedMaxSelect < minSelect) {
        showToast({ kind: 'error', message: '최대 선택 수는 최소 선택 수보다 작을 수 없어요.' });
        return;
      }

      maxSelect = parsedMaxSelect;
    }

    updateCategory(
      {
        label,
        icon,
        color,
        displayed,
        minSelect,
        maxSelect,
      },
      '태그 카테고리를 수정했어요.',
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleRemove = async () => {
    if (isPending) {
      return;
    }

    const accepted = await confirm({
      title: '카테고리를 삭제할까요?',
      message: `"${category.label}" 카테고리는 되돌릴 수 없어요.`,
      kind: 'warning',
      confirmLabel: '삭제하기',
      cancelLabel: '취소',
    });

    if (!accepted) {
      return;
    }

    removeCategoryMutation.mutate(undefined, {
      onSuccess: async () => {
        await invalidateQueries();
        showToast({ kind: 'success', message: '태그 카테고리를 삭제했어요.' });
      },
      onError: error => {
        console.error('Failed to remove tag category', error);
        showToast({
          kind: 'error',
          message: '태그 카테고리를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.',
        });
      },
    });
  };

  return (
    <article className="rounded-2xl border border-line bg-base-background p-4 px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-primary">{category.label}</h3>
          <p
            className="flex items-center text-xs text-secondary [&>*]:flex [&>*]:items-center
              [&>*]:before:mx-2 [&>*]:before:hidden [&>*]:before:h-0.5 [&>*]:before:w-0.5
              [&>*]:before:rounded-full [&>*]:before:bg-tertiary [&>:not(:first-child)]:before:flex"
          >
            {category.minSelect > 0 && <span>최소 {category.minSelect}개</span>}
            {!!category.maxSelect && <span>최대 {category.maxSelect}개</span>}
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-tertiary">
          <span>목록 표시</span>
          <Toggle
            checked={displayed}
            disabled={isPending}
            onChange={event => handleDisplayedToggle(event.target.checked)}
            className="h-7 w-12"
          />
        </label>
      </div>

      {isEditing ? (
        <div className="mt-4 flex flex-col gap-4 rounded-xl">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-primary">제목</span>
            <div className="flex gap-3">
              <IconPicker value={draftIcon} onChange={setDraftIcon} disabled={isPending} />
              <input
                value={draftLabel}
                onChange={event => setDraftLabel(event.target.value)}
                maxLength={60}
                disabled={isPending}
                className="h-10 w-full rounded-xl border border-line bg-base-background px-3 py-2
                  text-sm text-primary transition outline-none focus:border-highlight
                  disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-primary">색상</span>
            <div className="flex flex-1 items-center">
              <ColorPicker value={draftColor} onChange={setDraftColor} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-primary">최소 선택 수</span>
              <input
                type="number"
                min={0}
                step={1}
                value={draftMinSelect}
                onChange={event => setDraftMinSelect(event.target.value)}
                disabled={isPending}
                className="w-full rounded-xl border border-line bg-base-background px-3 py-2 text-sm
                  text-primary transition outline-none focus:border-highlight
                  disabled:cursor-not-allowed"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-primary">최대 선택 수</span>
              <input
                type="number"
                min={0}
                step={1}
                value={draftMaxSelect}
                onChange={event => setDraftMaxSelect(event.target.value)}
                disabled={isPending}
                placeholder="제한 없음"
                className="w-full rounded-xl border border-line bg-base-background px-3 py-2 text-sm
                  text-primary transition outline-none focus:border-highlight
                  disabled:cursor-not-allowed"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetDraft();
                setIsEditing(false);
              }}
              disabled={isPending}
              className="rounded-lg border border-line bg-base-background px-4 py-1.5 text-sm
                font-medium text-primary transition hover:bg-elevated-background
                disabled:cursor-not-allowed"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isPending}
              className="rounded-lg bg-highlight px-4 py-1.5 text-sm font-semibold
                text-highlight-foreground transition hover:bg-highlight-hover
                disabled:cursor-not-allowed disabled:bg-highlight-disabled"
            >
              저장
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {categoryTagsQuery.isPending ? (
          <p className="text-sm text-tertiary">태그를 불러오는 중이에요...</p>
        ) : null}
        {categoryTagsQuery.isError ? (
          <p className="text-sm text-tertiary">태그를 불러오지 못했어요.</p>
        ) : null}
        {categoryTagsQuery.isSuccess ? (
          categoryTagsQuery.data.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {categoryTagsQuery.data.map(tag => (
                <Tag key={tag.id} {...tag} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-tertiary">아직 등록된 태그가 없어요.</p>
          )
        ) : null}
      </div>

      <div className="-mx-1 mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            if (isEditing) {
              resetDraft();
              setIsEditing(false);
              return;
            }

            resetDraft();
            setIsEditing(true);
          }}
          disabled={isPending}
          className="flex items-center gap-1 rounded-lg bg-base-background px-3 py-1.5 text-sm
            font-medium text-secondary transition hover:bg-elevated-background hover:text-primary
            disabled:cursor-not-allowed"
        >
          <IconPencil />
          {isEditing ? '수정 취소' : '수정'}
        </button>
        <button
          type="button"
          onClick={() => {
            void handleRemove();
          }}
          disabled={isPending}
          className="flex items-center gap-1 rounded-lg bg-base-background px-3 py-1.5 text-sm
            font-medium text-secondary transition hover:bg-elevated-background hover:text-primary
            disabled:cursor-not-allowed"
        >
          <IconTrash />
          삭제
        </button>
      </div>
    </article>
  );
};
