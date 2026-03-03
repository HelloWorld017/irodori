import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { buildContext } from '@/utils/context';

const [EntriesProvider, useEntries] = buildContext(() => {
  const services = useServices();
  const { notebookId } = useParams<{ notebookId: string }>();
  const { data: notebook } = useQuery({
    enabled: !!services,
    queryKey: ['entries', 'notebook', notebookId],
    queryFn: () => services!.notebooks.getById(notebookId),
  });

  return {
    notebookId,
    notebook,
  };
});

export { EntriesProvider };
export const useEntriesNotebook = () => useEntries(state => state.notebook);
export const useEntriesNotebookId = () => useEntries(state => state.notebookId);
