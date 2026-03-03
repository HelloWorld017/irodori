import { useQuery } from '@tanstack/react-query';
import { IconSearch, IconSquarePlus } from '@/fragments/_icons';
import { useServices } from '@/fragments/_providers/DatabaseProvider';
import { classes } from '@/utils/classes';
import { queryKey } from '@/utils/queryKey';
import { useEntriesNotebook, useEntriesNotebookId } from '../_providers/EntriesProvider';
import { EntriesFinder } from './EntriesFinder';

const SidebarHeader = () => {
  const services = useServices();
  const notebook = useEntriesNotebook();
  const notebookId = useEntriesNotebookId();
  const { data: entriesCount } = useQuery({
    enabled: !!services,
    queryKey: queryKey('entries', 'count', notebookId),
    queryFn: () => services!.entries.countByNotebookId(notebookId),
  });

  if (!notebook) {
    return null;
  }

  return (
    <header className="flex items-center justify-between gap-6">
      <div className="flex flex-col">
        <h2 className="text-lg font-semibold">{notebook.title}</h2>
        <div className="text-secondary">
          {typeof entriesCount === 'number' ? `${entriesCount}개의 일기` : ''}
        </div>
      </div>
      <div className="flex gap-4">
        <button>
          <IconSearch />
        </button>
        <button>
          <IconSquarePlus />
        </button>
      </div>
    </header>
  );
};

export const Sidebar = ({ className }: { className?: string }) => (
  <aside className={classes('border-r border-line', className)}>
    <SidebarHeader />
    <EntriesFinder />
  </aside>
);
