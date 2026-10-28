import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';

import Dashboard from '@/pages/Dashboard';
import Orientations from '@/pages/Orientations';
import OrientationDetail from '@/pages/OrientationDetail';
import Hires from '@/pages/Hires';
import HireDetail from '@/pages/HireDetail';
import CommTemplates from '@/pages/CommTemplates';
import ScheduledComms from '@/pages/ScheduledComms';
import TaskTemplates from '@/pages/TaskTemplates';
import Sync from '@/pages/Sync';
import OverdueActions from '@/pages/OverdueActions';
import OrientationScheduleTemplatesPage from '@/pages/OrientationScheduleTemplatesPage';
import UpcomingOrientationSchedule from '@/pages/UpcomingOrientationSchedule';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/orientations" component={Orientations} />
        <Route path="/orientations/:date" component={OrientationDetail} />
        <Route path="/hires" component={Hires} />
        <Route path="/hires/:id" component={HireDetail} />
        <Route path="/comm-templates" component={CommTemplates} />
        <Route path="/scheduled-comms" component={ScheduledComms} />
        <Route path="/task-templates" component={TaskTemplates} />
        <Route path="/orientation-schedules" component={OrientationScheduleTemplatesPage} />
        <Route path="/upcoming-orientation-schedule" component={UpcomingOrientationSchedule} />
        <Route path="/overdue-actions" component={OverdueActions} />
        <Route path="/sync" component={Sync} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
