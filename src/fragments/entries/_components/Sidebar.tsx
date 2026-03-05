import { useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { classes } from '@/utils/classes';
import { EntriesFinder } from './EntriesFinder';
import { SidebarHeader } from './SidebarHeader';
import type { EntriesSearchCriteria } from '../_types/EntriesSearchCriteria';

export const Sidebar = ({ className }: { className?: string }) => {
  const [latestCriteria, setCriteria] = useState<EntriesSearchCriteria | null>(null);
  const criteria = useDebouncedValue(latestCriteria, { delay: 1000 });

  return (
    <aside className={classes('border-r border-line', className)}>
      <SidebarHeader criteria={latestCriteria} onCriteriaChange={setCriteria} />
      <EntriesFinder criteria={criteria} />
    </aside>
  );
};
