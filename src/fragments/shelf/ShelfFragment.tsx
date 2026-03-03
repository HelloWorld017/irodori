import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useShowToast } from '@/fragments/_providers/ToastProvider';
import { useEnsureDatabase } from '@/hooks/useEnsureDatabase';
import { queryKey } from '@/utils/queryKey';
import { DeleteNotebookModal } from './_components/DeleteNotebookModal';
import { NotebookFormModal } from './_components/NotebookFormModal';
import { NotebookList } from './_components/NotebookList';
import { ShelfHeader } from './_components/ShelfHeader';
import { NOTEBOOK_COLORS } from './_constants/notebook';
import {
  ShelfProvider,
  useCloseShelfModal,
  useOpenCreateModal,
  useOpenDeleteModal,
  useOpenEditModal,
  useSelectedNotebook,
  useShelfModalKind,
} from './_providers/ShelfProvider';

const ShelfView = () => {
  const services = useServices();
  const showToast = useShowToast();
  const queryClient = useQueryClient();
  useEnsureDatabase();

  const modalKind = useShelfModalKind();
  const selectedNotebook = useSelectedNotebook();
  const openCreateModal = useOpenCreateModal();
  const openEditModal = useOpenEditModal();
  const openDeleteModal = useOpenDeleteModal();
  const closeModal = useCloseShelfModal();

  const notebooksQueryKey = queryKey('shelf', 'notebooks');
  const notebooksQuery = useQuery({
    queryKey: notebooksQueryKey,
    enabled: services !== null,
    queryFn: () => services!.notebooks.list(),
  });

  const invalidateNotebooks = () => queryClient.invalidateQueries({ queryKey: notebooksQueryKey });

  const createNotebookMutation = useMutation({
    mutationFn: (input: { title: string; description: string; color: string }) =>
      services!.notebooks.create(input),
    onSuccess: async () => {
      await invalidateNotebooks();
      closeModal();
      showToast({ kind: 'success', message: '일기장을 만들었어요.' });
    },
    onError: error => {
      console.error('Failed to create a notebook', error);
      showToast({
        kind: 'error',
        message: '일기장 생성에 실패했어요. 잠시 후 다시 시도해 주세요.',
      });
    },
  });

  const updateNotebookMutation = useMutation({
    mutationFn: (input: { id: string; title: string; description: string; color: string }) =>
      services!.notebooks.update(input),
    onSuccess: async () => {
      await invalidateNotebooks();
      closeModal();
      showToast({ kind: 'success', message: '일기장 정보를 수정했어요.' });
    },
    onError: error => {
      console.error('Failed to update a notebook', error);
      showToast({
        kind: 'error',
        message: '일기장 수정에 실패했어요. 잠시 후 다시 시도해 주세요.',
      });
    },
  });

  const removeNotebookMutation = useMutation({
    mutationFn: (input: { id: string }) => services!.notebooks.remove(input),
    onSuccess: async () => {
      await invalidateNotebooks();
      closeModal();
      showToast({ kind: 'success', message: '일기장을 삭제했어요.' });
    },
    onError: () => {
      showToast({
        kind: 'error',
        message: '일기장 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.',
      });
    },
  });

  const isMutating =
    createNotebookMutation.isPending ||
    updateNotebookMutation.isPending ||
    removeNotebookMutation.isPending;

  const handleCloseModal = () => {
    if (isMutating) {
      return;
    }

    closeModal();
  };

  const notebooks = notebooksQuery.data ?? [];

  return (
    <main
      className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-5 py-8 sm:px-8
        sm:py-10"
    >
      <ShelfHeader notebookCount={notebooks.length} />

      {notebooksQuery.isPending ? (
        <section className="rounded-2xl bg-elevated-background p-6 ring-1 ring-line">
          <p className="text-sm font-medium text-secondary">일기장을 불러오는 중이에요...</p>
        </section>
      ) : null}

      {notebooksQuery.isError ? (
        <section className="rounded-2xl bg-elevated-background p-6 ring-1 ring-line">
          <p className="text-sm text-secondary">일기장을 불러오지 못했어요.</p>
          <button
            type="button"
            onClick={() => notebooksQuery.refetch()}
            className="mt-4 rounded-lg bg-highlight px-3 py-2 text-sm font-medium
              text-highlight-foreground transition hover:bg-highlight-hover"
          >
            다시 시도
          </button>
        </section>
      ) : null}

      {notebooksQuery.isSuccess ? (
        <NotebookList
          notebooks={notebooks}
          onCreateNotebook={openCreateModal}
          onEditNotebook={openEditModal}
          onDeleteNotebook={openDeleteModal}
        />
      ) : null}

      <AnimatePresence>
        {modalKind === 'create' ? (
          <NotebookFormModal
            mode="create"
            initialValue={{ title: '', description: '', color: NOTEBOOK_COLORS[0] }}
            pending={createNotebookMutation.isPending}
            onClose={handleCloseModal}
            onSubmit={({ title, description, color }) => {
              createNotebookMutation.mutate({ title, description, color });
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {modalKind === 'edit' && selectedNotebook ? (
          <NotebookFormModal
            mode="edit"
            initialValue={{
              title: selectedNotebook.title,
              description: selectedNotebook.description,
              color: selectedNotebook.color,
            }}
            pending={updateNotebookMutation.isPending}
            onClose={handleCloseModal}
            onSubmit={({ title, description, color }) => {
              updateNotebookMutation.mutate({ id: selectedNotebook.id, title, description, color });
            }}
          />
        ) : null}
      </AnimatePresence>

      {modalKind === 'delete' && selectedNotebook ? (
        <DeleteNotebookModal
          notebook={selectedNotebook}
          pending={removeNotebookMutation.isPending}
          onClose={handleCloseModal}
          onConfirm={() => {
            removeNotebookMutation.mutate({ id: selectedNotebook.id });
          }}
        />
      ) : null}
    </main>
  );
};

export const ShelfFragment = () => (
  <ShelfProvider>
    <ShelfView />
  </ShelfProvider>
);
