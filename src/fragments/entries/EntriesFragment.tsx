import { useEffect } from 'react';
import { buildRoute } from '@/utils/route';
import { AnimateView } from '../_components/AnimateView';
import { useNavigate } from '../_providers/RouterProvider';
import { Sidebar } from './_components/Sidebar';
import { EntriesProvider, useEntriesNotebook } from './_providers/EntriesProvider';
import { NotebookThemeProvider } from './_providers/NotebookThemeProvider';
import type { ReactNode } from 'react';

const EntriesView = ({ children }: { children: ReactNode }) => {
  const notebook = useEntriesNotebook();
  const navigate = useNavigate();

  useEffect(() => {
    if (notebook === null) {
      navigate(buildRoute('shelf'));
    }
  }, [navigate, notebook]);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar className="max-w-100 flex-2 py-5 sm:py-6" />
      <main className="flex-5 px-8 py-5 sm:px-10 sm:py-6">{children}</main>
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
