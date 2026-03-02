import { NotebookCard } from './NotebookCard';
import type { Notebook } from '@/repositories/NotebooksRepository';

type NotebookGridProps = {
  notebooks: Notebook[];
  onOpenNotebook: (notebookId: string) => void;
  onEditNotebook: (notebook: Notebook) => void;
  onDeleteNotebook: (notebook: Notebook) => void;
};

export const NotebookGrid = ({
  notebooks,
  onOpenNotebook,
  onEditNotebook,
  onDeleteNotebook,
}: NotebookGridProps) => (
  <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {notebooks.map(notebook => (
      <li key={notebook.id}>
        <NotebookCard
          notebook={notebook}
          onOpen={onOpenNotebook}
          onEdit={onEditNotebook}
          onDelete={onDeleteNotebook}
        />
      </li>
    ))}
  </ul>
);
