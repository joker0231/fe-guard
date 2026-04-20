import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/page-reachability/enforce-route-export-convention';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('enforce-route-export-convention', rule, {
  valid: [
    // ✅ 正确导出 Route
    {
      code: `
        import { createFileRoute } from '@tanstack/react-router';
        export const Route = createFileRoute('/dashboard')({
          component: Dashboard,
        });
        function Dashboard() { return <div>Dashboard</div>; }
      `,
      filename: '/project/src/routes/dashboard.tsx',
    },
    // ✅ export { Route } from
    {
      code: `export { Route } from './dashboard.generated';`,
      filename: '/project/src/routes/dashboard.tsx',
    },
    // ✅ 非 routes 目录的文件不检查
    {
      code: `export default function App() { return <div/>; }`,
      filename: '/project/src/components/App.tsx',
    },
    // ✅ __root 文件排除
    {
      code: `export const rootRoute = createRootRoute({ component: Root });`,
      filename: '/project/src/routes/__root.tsx',
    },
    // ✅ route-tree 文件排除
    {
      code: `export const routeTree = createRouteTree();`,
      filename: '/project/src/routes/route-tree.gen.ts',
    },
    // ✅ 测试文件排除
    {
      code: `describe('route', () => { it('works', () => {}); });`,
      filename: '/project/src/routes/dashboard.test.tsx',
    },
  ],
  invalid: [
    // ❌ 缺少 Route 导出
    {
      code: `
        function Dashboard() { return <div>Dashboard</div>; }
        export default Dashboard;
      `,
      filename: '/project/src/routes/dashboard.tsx',
      errors: [{ messageId: 'missingRouteExport' }],
    },
    // ❌ export default Route（不是 export const）
    {
      code: `
        const Route = createFileRoute('/dashboard')({ component: Dashboard });
        function Dashboard() { return <div/>; }
        export default Route;
      `,
      filename: '/project/src/routes/dashboard.tsx',
      errors: [{ messageId: 'wrongRouteExportType' }],
    },
    // ❌ 导出了别的名字
    {
      code: `
        export const DashboardRoute = createFileRoute('/dashboard')({ component: Dashboard });
        function Dashboard() { return <div/>; }
      `,
      filename: '/project/src/routes/dashboard.tsx',
      errors: [{ messageId: 'missingRouteExport' }],
    },
    // ❌ 用 let 而不是 const (P1-5: should report wrongRouteExportType)
    {
      code: `
        export let Route = createFileRoute('/dashboard')({ component: Dashboard });
        function Dashboard() { return <div/>; }
      `,
      filename: '/project/src/routes/dashboard.tsx',
      errors: [{ messageId: 'wrongRouteExportType' }],
    },
    // ❌ 用 var 而不是 const
    {
      code: `
        export var Route = createFileRoute('/dashboard')({ component: Dashboard });
        function Dashboard() { return <div/>; }
      `,
      filename: '/project/src/routes/dashboard.tsx',
      errors: [{ messageId: 'wrongRouteExportType' }],
    },
  ],
});