import { useState } from 'react';
import { classes } from '@/utils/classes';
import { EntriesFinder } from './EntriesFinder';
import { SidebarHeader } from './SidebarHeader';

export const Sidebar = ({ className }: { className?: string }) => {
  const [searchOpened, setSearchOpened] = useState(false);

  return (
    <aside className={classes('border-r border-line', className)}>
      <SidebarHeader onToggleSearch={() => setSearchOpened(!searchOpened)} />
      <EntriesFinder searchOpened={searchOpened} onCloseSearch={() => setSearchOpened(false)} />
    </aside>
  );
};
