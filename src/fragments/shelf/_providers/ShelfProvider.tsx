import { useCallback, useState } from 'react';
import { buildContext } from '@/utils/context';
import type { Notebook } from '@/repositories/NotebooksRepository';

export type ShelfModalKind = 'create' | 'edit' | 'delete' | null;

const [ShelfProvider, useShelf] = buildContext(() => {
  const [modalKind, setModalKind] = useState<ShelfModalKind>(null);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);

  const openCreateModal = useCallback(() => {
    setSelectedNotebook(null);
    setModalKind('create');
  }, []);

  const openEditModal = useCallback((notebook: Notebook) => {
    setSelectedNotebook(notebook);
    setModalKind('edit');
  }, []);

  const openDeleteModal = useCallback((notebook: Notebook) => {
    setSelectedNotebook(notebook);
    setModalKind('delete');
  }, []);

  const closeModal = useCallback(() => {
    setModalKind(null);
    setSelectedNotebook(null);
  }, []);

  return {
    modalKind,
    selectedNotebook,
    openCreateModal,
    openEditModal,
    openDeleteModal,
    closeModal,
  };
});

export { ShelfProvider };
export const useShelfModalKind = () => useShelf(state => state.modalKind);
export const useSelectedNotebook = () => useShelf(state => state.selectedNotebook);
export const useOpenCreateModal = () => useShelf(state => state.openCreateModal);
export const useOpenEditModal = () => useShelf(state => state.openEditModal);
export const useOpenDeleteModal = () => useShelf(state => state.openDeleteModal);
export const useCloseShelfModal = () => useShelf(state => state.closeModal);
