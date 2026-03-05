import { classes } from '@/utils/classes';
import { EntriesFinder } from './EntriesFinder';
import { SidebarHeader } from './SidebarHeader';

export const Sidebar = ({ className }: { className?: string }) => (
  <aside
    className={classes('flex flex-col border-r border-line bg-elevated-background', className)}
  >
    <SidebarHeader />
    <EntriesFinder />
  </aside>
);
