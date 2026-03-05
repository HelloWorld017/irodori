import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLORS_PRESET } from '@/constants/colors';
import { IconPlus, IconSquarePlus } from '@/fragments/_icons';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useShowToast } from '@/fragments/_providers/ToastProvider';
import { queryKey } from '@/utils/queryKey';
import { NotebookEditCategoryItem } from './NotebookEditCategoryItem';

type NotebookEditCategoriesProps = {
  notebookId: string;
};

export const NotebookEditCategories = ({ notebookId }: NotebookEditCategoriesProps) => {
  const services = useServices();
  const showToast = useShowToast();
  const queryClient = useQueryClient();
  const categoriesQueryKey = queryKey('shelf', 'notebook-edit-tag-categories', notebookId);

  const invalidateCategories = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: categoriesQueryKey }),
      queryClient.invalidateQueries({
        queryKey: queryKey('entries', 'search-tag-categories', notebookId),
      }),
      queryClient.invalidateQueries({ queryKey: ['entries', 'search-tags'] }),
    ]);
  };

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!services) {
        throw new Error('Services are not initialized.');
      }

      return services.tagCategories.create({
        notebookId,
        label: '새 카테고리',
        icon: null,
        color: COLORS_PRESET[0],
        displayed: true,
        minSelect: 0,
        maxSelect: null,
        required: false,
      });
    },
    onSuccess: async () => {
      await invalidateCategories();
      showToast({ kind: 'success', message: '빈 태그 카테고리를 추가했어요.' });
    },
    onError: error => {
      console.error('Failed to create tag category', error);
      showToast({
        kind: 'error',
        message: '카테고리를 추가하지 못했어요. 잠시 후 다시 시도해 주세요.',
      });
    },
  });

  const categoriesQuery = useQuery({
    enabled: services !== null,
    queryKey: categoriesQueryKey,
    queryFn: () => services!.tagCategories.listByNotebookId(notebookId),
  });

  return (
    <section className="space-y-4">
      {categoriesQuery.isPending ? (
        <p className="text-sm text-secondary">카테고리 목록을 불러오는 중이에요...</p>
      ) : null}

      {categoriesQuery.isError ? (
        <p className="text-sm text-secondary">카테고리 목록을 불러오지 못했어요.</p>
      ) : null}

      {categoriesQuery.isSuccess ? (
        categoriesQuery.data.length > 0 ? (
          <ul className="space-y-3">
            {categoriesQuery.data.map(category => (
              <li key={category.id}>
                <NotebookEditCategoryItem
                  notebookId={notebookId}
                  category={category}
                  categoriesQueryKey={categoriesQueryKey}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-secondary">아직 태그 카테고리가 없어요.</p>
        )
      ) : null}

      <button
        type="button"
        onClick={() => {
          createCategoryMutation.mutate();
        }}
        disabled={createCategoryMutation.isPending}
        className="flex items-center gap-1.5 rounded-lg bg-highlight px-3 py-2 text-sm font-semibold
          text-highlight-foreground transition hover:bg-highlight-hover disabled:cursor-not-allowed
          disabled:bg-highlight-disabled"
      >
        <IconPlus className="text-base" />
        {createCategoryMutation.isPending ? '추가 중...' : '빈 카테고리 추가'}
      </button>
    </section>
  );
};
