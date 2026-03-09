import { useSuspenseQuery } from '@tanstack/react-query';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { queryKey } from '@/utils/queryKey';
import { Notebook } from './Notebook';
import { NotebookCreate } from './NotebookCreate';
import type { Notebook as NotebookModel } from '@/repositories/NotebooksRepository';

type NotebookListProps = {
  onCreateNotebook: () => void;
  onEditNotebook: (notebook: NotebookModel) => void;
  onDeleteNotebook: (notebook: NotebookModel) => void;
};

export const NotebookList = ({
  onCreateNotebook,
  onEditNotebook,
  onDeleteNotebook,
}: NotebookListProps) => {
  const services = useServices();
  const { data: notebooks } = useSuspenseQuery({
    queryKey: queryKey('shelf', 'notebooks'),
    queryFn: () => services.notebooks.list(),
  });

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {notebooks.map(notebook => (
        <li key={notebook.id}>
          <Notebook notebook={notebook} onEdit={onEditNotebook} onDelete={onDeleteNotebook} />
        </li>
      ))}
      <li>
        <NotebookCreate onCreate={onCreateNotebook} />
      </li>
    </ul>
  );
};
