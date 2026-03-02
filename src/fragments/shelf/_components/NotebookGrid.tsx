import { Notebook } from './Notebook';
import type { Notebook as NotebookModel } from '@/repositories/NotebooksRepository';

type NotebookGridProps = {
  notebooks: NotebookModel[];
  onOpenNotebook: (notebookId: string) => void;
  onEditNotebook: (notebook: NotebookModel) => void;
  onDeleteNotebook: (notebook: NotebookModel) => void;
};

export const NotebookGrid = ({
  notebooks,
  onOpenNotebook,
  onEditNotebook,
  onDeleteNotebook,
}: NotebookGridProps) => (
  <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
    {notebooks.map(notebook => (
      <li key={notebook.id}>
        <Notebook
          notebook={notebook}
          onOpen={onOpenNotebook}
          onEdit={onEditNotebook}
          onDelete={onDeleteNotebook}
        />
      </li>
    ))}
  </ul>
);
