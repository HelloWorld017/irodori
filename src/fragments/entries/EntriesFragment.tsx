import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useRoute } from 'wouter';
import { useBreakPointIsBelow } from '@/hooks/useBreakPointIsBelow';
import { useLatestCallback } from '@/hooks/useLatestCallback';
import { buildRoute, getRoute } from '@/utils/route';
import { AnimateView } from '../_components/AnimateView';
import { useHistoryBack, useNavigate } from '../_providers/RouterProvider';
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
  const historyBack = useHistoryBack();
  const navigate = useNavigate();
  const isMobile = useBreakPointIsBelow('lg');
  const isNotebookPending = useEntriesIsNotebookPending();
  const [isSelfRoute] = useRoute(getRoute('entries'));

  useEffect(() => {
    if (!isNotebookPending && notebook === null) {
      navigate(buildRoute('shelf'));
    }
  }, [isNotebookPending, navigate, notebook]);

  const handleHistoryBack = useLatestCallback(() => {
    if (isSelfRoute) {
      return;
    }

    historyBack();
  });

  if (isMobile) {
    return (
      <div className="relative min-h-screen w-full overflow-x-hidden lg:hidden">
        <Sidebar className="min-h-screen w-full border-r-0 py-5 sm:py-6" />

        <AnimatePresence>
          {!isSelfRoute ? (
            <motion.div
              key="mobile-entry-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, pointerEvents: 'none' }}
              transition={{ type: 'spring', bounce: 0.05, visualDuration: 0.5 }}
              className="fixed inset-0 z-40 lg:hidden"
            >
              <button
                type="button"
                aria-label="일기 목록으로 돌아가기"
                onClick={handleHistoryBack}
                className="absolute inset-0 bg-backdrop"
              />

              <motion.main
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', bounce: 0.05, visualDuration: 0.5 }}
                className="absolute top-0 right-0 h-full w-[calc(100%-2rem)] overflow-y-auto
                  rounded-l-[2rem] border-l border-line bg-base-background shadow-elevated"
              >
                <div className="min-h-full px-4 py-4 sm:px-6 sm:py-5">{children}</div>
              </motion.main>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
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
