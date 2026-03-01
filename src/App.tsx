import { Route, Switch } from 'wouter';
import { DatabaseProvider } from '@/fragments/_providers/DatabaseProvider';
import { OnboardingFragment } from '@/fragments/onboarding';
import { getRoute } from '@/utils/route';

const App = () => (
  <DatabaseProvider>
    <Switch>
      <Route path={getRoute('onboarding')} component={OnboardingFragment} />
    </Switch>
  </DatabaseProvider>
);

export default App;
