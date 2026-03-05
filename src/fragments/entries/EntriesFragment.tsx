import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useEnsureDatabase } from '@/hooks/useEnsureDatabase';
import { buildRoute } from '@/utils/route';
import { Sidebar } from './_components/Sidebar';
import { EntriesProvider, useEntriesNotebook } from './_providers/EntriesProvider';
import { NotebookThemeProvider } from './_providers/NotebookThemeProvider';
import type { ReactNode } from 'react';

const EntriesView = ({ children }: { children: ReactNode }) => {
  const notebook = useEntriesNotebook();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (notebook === null) {
      navigate(buildRoute('shelf'));
    }
  }, [navigate, notebook]);

  useEnsureDatabase();

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar className="max-w-100 flex-1 py-5 sm:py-6" />
      <main className="flex-2 px-8 py-5 sm:px-10 sm:py-6">{children}</main>
    </div>
  );
};

export const EntriesFragment = ({ children }: { children: ReactNode }) => (
  <EntriesProvider>
    <NotebookThemeProvider>
      <EntriesView>{children}</EntriesView>
    </NotebookThemeProvider>
  </EntriesProvider>
);
