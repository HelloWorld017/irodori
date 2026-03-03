import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useEnsureDatabase } from '@/hooks/useEnsureDatabase';
import { buildRoute } from '@/utils/route';
import { Sidebar } from './_components/Sidebar';
import { EntriesProvider, useEntriesNotebook } from './_providers/EntriesProvider';
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
    <div className="flex">
      <Sidebar className="max-w-100 flex-1 px-16 py-8" />
      <main className="flex-2 px-16 py-8">{children}</main>
    </div>
  );
};

export const EntriesFragment = ({ children }: { children: ReactNode }) => (
  <EntriesProvider>
    <EntriesView>{children}</EntriesView>
  </EntriesProvider>
);
