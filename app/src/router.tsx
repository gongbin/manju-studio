import { createRootRoute, createRoute, createRouter, redirect, Outlet } from '@tanstack/react-router';
import { ShellLayout } from './app/Shell';
import { Login } from './routes/Login';
import { Projects } from './routes/Projects';
import { Project } from './routes/Project';
import { Script } from './routes/Script';
import { Storyboard } from './routes/Storyboard';
import { Tasks } from './routes/Tasks';
import { Settings } from './routes/Settings';
import { Characters, Assets, Billing, Members, Audit } from './routes/Management';

const rootRoute = createRootRoute({ component: () => <Outlet /> });

const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: '/login', component: Login });

const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  component: ShellLayout,
  beforeLoad: () => {
    if (typeof localStorage !== 'undefined' && !localStorage.getItem('ms.auth')) {
      throw redirect({ to: '/login' });
    }
  },
});

const parent = () => shellRoute;
const projectsRoute = createRoute({ getParentRoute: parent, path: '/', component: Projects });
const projectRoute = createRoute({ getParentRoute: parent, path: '/project/$projectId', component: Project });
const scriptRoute = createRoute({ getParentRoute: parent, path: '/project/$projectId/$episodeId/script', component: Script });
const storyboardRoute = createRoute({ getParentRoute: parent, path: '/project/$projectId/$episodeId/storyboard', component: Storyboard });
const tasksRoute = createRoute({ getParentRoute: parent, path: '/tasks', component: Tasks });
const charactersRoute = createRoute({ getParentRoute: parent, path: '/characters', component: Characters });
const assetsRoute = createRoute({ getParentRoute: parent, path: '/assets', component: Assets });
const billingRoute = createRoute({ getParentRoute: parent, path: '/billing', component: Billing });
const membersRoute = createRoute({ getParentRoute: parent, path: '/members', component: Members });
const auditRoute = createRoute({ getParentRoute: parent, path: '/audit', component: Audit });
const settingsRoute = createRoute({ getParentRoute: parent, path: '/settings', component: Settings });

const routeTree = rootRoute.addChildren([
  loginRoute,
  shellRoute.addChildren([
    projectsRoute, projectRoute, scriptRoute, storyboardRoute, tasksRoute,
    charactersRoute, assetsRoute, billingRoute, membersRoute, auditRoute, settingsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
