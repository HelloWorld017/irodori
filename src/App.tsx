import { Route, Switch } from 'wouter';
import { OnboardingFragment } from '@/fragments/onboarding';

const App = () => (
  <Switch>
    <Route path="/">
      <OnboardingFragment />
    </Route>
    <Route>
      <OnboardingFragment />
    </Route>
  </Switch>
);

export default App;
