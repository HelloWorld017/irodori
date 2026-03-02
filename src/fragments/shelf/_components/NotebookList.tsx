import { Notebook } from './Notebook';
import { NotebookCreate } from './NotebookCreate';
import type { Notebook as NotebookModel } from '@/repositories/NotebooksRepository';

type NotebookListProps = {
  notebooks: NotebookModel[];
  onCreateNotebook: () => void;
  onOpenNotebook: (notebookId: string) => void;
  onEditNotebook: (notebook: NotebookModel) => void;
  onDeleteNotebook: (notebook: NotebookModel) => void;
};

export const NotebookList = ({
  notebooks,
  onCreateNotebook,
  onOpenNotebook,
  onEditNotebook,
  onDeleteNotebook,
}: NotebookListProps) => (
  <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
    <li>
      <NotebookCreate onCreate={onCreateNotebook} />
    </li>
  </ul>
);
