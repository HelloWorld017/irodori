import { Activity, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useBreakPointIsBelow } from '@/hooks/useBreakPointIsBelow';
import { buildRoute, getRoute } from '@/utils/route';
import { AnimateView } from '../_components/AnimateView';
import { useNavigate } from '../_providers/RouterProvider';
import { Sidebar } from './_components/Sidebar';
import {
  EntriesProvider,
  useEntriesIsNotebookPending,
  useEntriesNotebook,
} from './_providers/EntriesProvider';
import { NotebookThemeProvider } from './_providers/NotebookThemeProvider';
import type { ReactNode } from 'react';

const EntriesView = ({ children }: { children: ReactNode }) => {
  const notebook = useEntriesNotebook();
  const navigate = useNavigate();
  const isMobile = useBreakPointIsBelow('lg');
  const isNotebookPending = useEntriesIsNotebookPending();
  const [isSelfRoute] = useRoute(getRoute('entries'));

  useEffect(() => {
    if (!isNotebookPending && notebook === null) {
      navigate(buildRoute('shelf'));
    }
  }, [isNotebookPending, navigate, notebook]);

  if (isMobile) {
    return (
      <div className="relative min-h-dvh w-full overflow-x-hidden lg:hidden">
        <Activity mode={isSelfRoute ? 'visible' : 'hidden'}>
          <AnimateView animation="fade">
            <Sidebar className="min-h-dvh w-full border-r-0 py-5 sm:py-6" />
          </AnimateView>
        </Activity>

        <Activity mode={isSelfRoute ? 'hidden' : 'visible'}>
          <AnimateView animation="slide" key="slide">
            <main className="min-h-dvh px-4 py-4 sm:px-6 sm:py-5">{children}</main>
          </AnimateView>
        </Activity>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full">
      <Sidebar className="h-full min-h-0 max-w-100 flex-2 py-5 sm:py-6" />
      <main className="h-full min-h-0 flex-5 overflow-auto px-8 py-5 sm:px-10 sm:py-6">
        {children}
      </main>
    </div>
  );
};

export const EntriesFragment = ({ children }: { children: ReactNode }) => (
  <AnimateView>
    <EntriesProvider>
      <NotebookThemeProvider>
        <EntriesView>{children}</EntriesView>
      </NotebookThemeProvider>
    </EntriesProvider>
  </AnimateView>
);
