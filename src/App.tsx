import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch } from 'wouter';
import { OnboardingFragment } from '@/fragments/onboarding';
import { ShelfFragment } from '@/fragments/shelf';
import { getRoute } from '@/utils/route';
import { ToastList } from './fragments/_components/ToastList';
import { DatabaseProvider } from './fragments/_providers/DatabaseProvider';
import { ToastProvider } from './fragments/_providers/ToastProvider';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DatabaseProvider>
      <ToastProvider>
        <Switch>
          <Route path={getRoute('onboarding')} component={OnboardingFragment} />
          <Route path={getRoute('shelf')} component={ShelfFragment} />
        </Switch>
        <ToastList />
      </ToastProvider>
    </DatabaseProvider>
  </QueryClientProvider>
);

export default App;
