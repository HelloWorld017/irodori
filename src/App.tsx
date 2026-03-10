import { MotionConfig } from 'motion/react';
import { Route, Switch } from 'wouter';
import { AlertList } from '@/fragments/_components/AlertList';
import { ToastList } from '@/fragments/_components/ToastList';
import { AlertProvider } from '@/fragments/_providers/AlertProvider';
import { DatabaseProvider } from '@/fragments/_providers/DatabaseProvider';
import { StickerProvider } from '@/fragments/_providers/StickerProvider';
import { ToastProvider } from '@/fragments/_providers/ToastProvider';
import { EntriesFragment } from '@/fragments/entries';
import { OnboardingFragment } from '@/fragments/onboarding';
import { ShelfFragment } from '@/fragments/shelf';
import { getRoute } from '@/utils/route';
import { QueryProvider } from './fragments/_providers/QueryProvider';
import { RouterProvider } from './fragments/_providers/RouterProvider';
import { EntriesDefaultFragment } from './fragments/entries/default';
import { EntriesDetailFragment } from './fragments/entries/detail';
import type { ReactNode } from 'react';

const AppFrame = ({ children }: { children: ReactNode }) => (
  <MotionConfig transition={{ type: 'spring', visualDuration: 0.2, bounce: 0.1 }}>
    <ToastProvider>
      <AlertProvider>
        <QueryProvider>
          <RouterProvider>
            <DatabaseProvider>
              <StickerProvider>{children}</StickerProvider>
            </DatabaseProvider>
          </RouterProvider>
        </QueryProvider>
        <ToastList />
        <AlertList />
      </AlertProvider>
    </ToastProvider>
  </MotionConfig>
);

export const App = () => (
  <AppFrame>
    <Switch>
      <Route path={getRoute('onboarding')} component={OnboardingFragment} />
      <Route path={getRoute('shelf')} component={ShelfFragment} />
      <Route path={getRoute('entries', true)}>
        <EntriesFragment>
          <Switch>
            <Route path={getRoute('entriesDetail')}>
              <EntriesDetailFragment />
            </Route>
            <Route path={getRoute('entriesEdit')}>
              <EntriesDetailFragment edit />
            </Route>
            <Route component={EntriesDefaultFragment} />
          </Switch>
        </EntriesFragment>
      </Route>
    </Switch>
  </AppFrame>
);
