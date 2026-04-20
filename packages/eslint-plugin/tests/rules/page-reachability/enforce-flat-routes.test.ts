import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/page-reachability/enforce-flat-routes';

const ruleTester = new RuleTester();

ruleTester.run('enforce-flat-routes', rule, {
  valid: [
    // rootRoute as parent - arrow expression
    {
      code: `
        const Route = createRoute({
          getParentRoute: () => rootRoute,
          path: '/workspaces',
          component: WorkspacesPage,
        });
      `,
    },
    // rootRoute as parent - block body
    {
      code: `
        const Route = createRoute({
          getParentRoute: () => { return rootRoute; },
          path: '/login',
          component: LoginPage,
        });
      `,
    },
    // RootRoute as parent
    {
      code: `
        const Route = createRoute({
          getParentRoute: () => RootRoute,
          path: '/settings',
          component: SettingsPage,
        });
      `,
    },
    // createFileRoute variant
    {
      code: `
        const Route = createFileRoute({
          getParentRoute: () => rootRoute,
          path: '/dashboard',
          component: DashboardPage,
        });
      `,
    },
    // No getParentRoute (skip)
    {
      code: `
        const Route = createRoute({
          path: '/about',
          component: AboutPage,
        });
      `,
    },
    // Non-createRoute call (skip)
    {
      code: `
        const result = someOtherFunction({
          getParentRoute: () => workspacesRoute,
        });
      `,
    },
    // Route tree generated file (skip by filename)
    {
      code: `
        const WorkspacesNewRoute = WorkspacesNewImport.update({
          path: '/new',
          getParentRoute: () => WorkspacesRoute,
        });
      `,
      filename: 'src/routeTree.gen.ts',
    },
    // root as parent
    {
      code: `
        const Route = createRoute({
          getParentRoute: () => root,
          path: '/home',
          component: HomePage,
        });
      `,
    },
  ],
  invalid: [
    // Nested under WorkspacesRoute
    {
      code: `
        const Route = createRoute({
          getParentRoute: () => WorkspacesRoute,
          path: '/new',
          component: CreateWorkspacePage,
        });
      `,
      errors: [{ messageId: 'noNestedRoutes' }],
    },
    // Nested under tasksRoute
    {
      code: `
        const Route = createRoute({
          getParentRoute: () => tasksRoute,
          path: '/$taskId',
          component: TaskDetailPage,
        });
      `,
      errors: [{ messageId: 'noNestedRoutes' }],
    },
    // Nested with block body
    {
      code: `
        const Route = createRoute({
          getParentRoute: () => { return parentRoute; },
          path: '/edit',
          component: EditPage,
        });
      `,
      errors: [{ messageId: 'noNestedRoutes' }],
    },
    // createFileRoute with nested parent
    {
      code: `
        const Route = createFileRoute({
          getParentRoute: () => dashboardRoute,
          path: '/analytics',
          component: AnalyticsPage,
        });
      `,
      errors: [{ messageId: 'noNestedRoutes' }],
    },
  ],
});
