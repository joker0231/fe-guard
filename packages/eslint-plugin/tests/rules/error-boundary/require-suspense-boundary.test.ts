import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/error-boundary/require-suspense-boundary';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-suspense-boundary', rule, {
  valid: [
    // Lazy component wrapped in Suspense
    {
      code: `
        const Dashboard = React.lazy(() => import('./Dashboard'));
        function App() {
          return (
            <Suspense fallback={<Loading />}>
              <Dashboard />
            </Suspense>
          );
        }
      `,
    },
    // Using lazy() import (not React.lazy)
    {
      code: `
        const Page = lazy(() => import('./Page'));
        function App() {
          return (
            <Suspense fallback={<div>Loading...</div>}>
              <Page />
            </Suspense>
          );
        }
      `,
    },
    // Non-lazy component (no issue)
    {
      code: `
        function App() {
          return <Dashboard />;
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        const Dashboard = React.lazy(() => import('./Dashboard'));
        function App() {
          return <Dashboard />;
        }
      `,
      errors: [{ messageId: 'missingSuspense', data: { componentName: 'Dashboard' } }],
    },
    {
      code: `
        const Page = lazy(() => import('./Page'));
        function App() {
          return <Page />;
        }
      `,
      errors: [{ messageId: 'missingSuspense', data: { componentName: 'Page' } }],
    },
  ],
});
