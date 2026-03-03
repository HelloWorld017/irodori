import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch } from 'wouter';
import { ToastList } from '@/fragments/_components/ToastList';
import { DatabaseProvider } from '@/fragments/_providers/DatabaseProvider';
import { ToastProvider } from '@/fragments/_providers/ToastProvider';
import { EntriesFragment } from '@/fragments/entries';
import { OnboardingFragment } from '@/fragments/onboarding';
import { ShelfFragment } from '@/fragments/shelf';
import { getRoute } from '@/utils/route';
import { EntriesDefaultFragment } from './fragments/entries/default';
import { EntriesEditFragment } from './fragments/entries/edit';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DatabaseProvider>
      <ToastProvider>
        <Switch>
          <Route path={getRoute('onboarding')} component={OnboardingFragment} />
          <Route path={getRoute('shelf')} component={ShelfFragment} />
          <Route path={getRoute('entries', true)}>
            <EntriesFragment>
              <Switch>
                <Route path={getRoute('entriesEdit')} component={EntriesEditFragment} />
                <Route component={EntriesDefaultFragment} />
              </Switch>
            </EntriesFragment>
          </Route>
        </Switch>
        <ToastList />
      </ToastProvider>
    </DatabaseProvider>
  </QueryClientProvider>
);

export default App;
