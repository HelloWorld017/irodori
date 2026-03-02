import { Route, Switch } from 'wouter';
import { OnboardingFragment } from '@/fragments/onboarding';
import { getRoute } from '@/utils/route';
import { ToastList } from './fragments/_components/ToastList';
import { DatabaseProvider } from './fragments/_providers/DatabaseProvider';
import { ToastProvider } from './fragments/_providers/ToastProvider';

const App = () => (
  <DatabaseProvider>
    <ToastProvider>
      <Switch>
        <Route path={getRoute('onboarding')} component={OnboardingFragment} />
      </Switch>
      <ToastList />
    </ToastProvider>
  </DatabaseProvider>
);

export default App;
