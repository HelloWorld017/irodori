import { Link, useLocation } from 'wouter';
import { buildRoute } from '@/utils/route';
import { useEntriesNotebookId } from '../_providers/EntriesProvider';

export const EntriesDefaultFragment = () => {
  const [location] = useLocation();
  const notebookId = useEntriesNotebookId();
  return (
    <div>
      {location}
      <Link href={buildRoute('entriesEdit', { notebookId })}>Navigate</Link>
    </div>
  );
};
