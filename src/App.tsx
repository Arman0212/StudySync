import { AppProvider, useApp } from './state/store';
import { useRoute } from './state/router';
import { ToastProvider } from './ui/Toast';
import { Layout } from './screens/Layout';
import { Welcome } from './screens/Welcome';
import { Dashboard } from './screens/Dashboard';
import { Setup } from './screens/Setup';
import { Timetable } from './screens/Timetable';
import { Progress } from './screens/Progress';
import { MockTest } from './screens/MockTest';
import { Settings } from './screens/Settings';
import { Recovery } from './screens/Recovery';
import type { KeyValueStore } from './storage/storage';

export function App({ store, clock }: { store?: KeyValueStore; clock?: () => Date } = {}) {
  return (
    <AppProvider {...(store ? { store } : {})} {...(clock ? { clock } : {})}>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </AppProvider>
  );
}

function Router() {
  const { data, recovery } = useApp();
  const path = useRoute();
  if (recovery) return <Recovery />;
  const [, section = '', sub] = path.split('/');
  if (!data.profile && section !== 'setup') return <Welcome />;
  let screen;
  switch (section) {
    case 'setup':
      screen = <Setup tab={sub} />;
      break;
    case 'timetable':
      screen = <Timetable />;
      break;
    case 'progress':
      screen = <Progress />;
      break;
    case 'mock-test':
      screen = <MockTest />;
      break;
    case 'settings':
      screen = <Settings />;
      break;
    default:
      screen = <Dashboard />;
  }
  return <Layout section={section || 'dashboard'}>{screen}</Layout>;
}
