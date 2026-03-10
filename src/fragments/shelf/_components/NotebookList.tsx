import { useSuspenseQuery } from '@tanstack/react-query';
import { IconBookPlus } from '@/fragments/_icons';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { queryKey } from '@/utils/queryKey';
import { Notebook } from './Notebook';
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
        <button className="flex gap-6" type="button" onClick={() => onCreateNotebook()}>
          <div
            className="relative flex aspect-[3/4] w-28 flex-col items-center justify-center gap-2
              overflow-hidden rounded-xl border-2 border-dashed border-tertiary text-2xl
              text-tertiary transition hover:opacity-50 md:w-36"
          >
            <IconBookPlus />
            <h2 className="text-base font-semibold">새로 만들기</h2>
          </div>
        </button>
      </li>
    </ul>
  );
};
