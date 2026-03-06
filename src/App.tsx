import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch } from 'wouter';
import { ToastList } from '@/fragments/_components/ToastList';
import { DatabaseProvider } from '@/fragments/_providers/DatabaseProvider';
import { StickerProvider } from '@/fragments/_providers/StickerProvider';
import { ToastProvider } from '@/fragments/_providers/ToastProvider';
import { EntriesFragment } from '@/fragments/entries';
import { OnboardingFragment } from '@/fragments/onboarding';
import { ShelfFragment } from '@/fragments/shelf';
import { getRoute } from '@/utils/route';
import { EntriesDefaultFragment } from './fragments/entries/default';
import { EntriesDetailFragment } from './fragments/entries/detail';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DatabaseProvider>
      <StickerProvider>
        <ToastProvider>
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
          <ToastList />
        </ToastProvider>
      </StickerProvider>
    </DatabaseProvider>
  </QueryClientProvider>
);

export default App;
