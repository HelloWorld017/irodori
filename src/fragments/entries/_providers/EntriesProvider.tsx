import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { useRouteParams } from '@/hooks/useRouteParams';
import { buildContext } from '@/utils/context';
import { queryKey } from '@/utils/queryKey';

const [EntriesProvider, useEntries] = buildContext(() => {
  const services = useServices();
  const { notebookId } = useRouteParams<'entries'>();
  const { data: notebook } = useQuery({
    queryKey: queryKey('entries', 'notebook', notebookId),
    queryFn: () => services.notebooks.getById(notebookId),
  });

  return {
    notebookId,
    notebook,
  };
});

export { EntriesProvider };
export const useEntriesNotebook = () => useEntries(state => state.notebook);
export const useEntriesNotebookId = () => useEntries(state => state.notebookId);
