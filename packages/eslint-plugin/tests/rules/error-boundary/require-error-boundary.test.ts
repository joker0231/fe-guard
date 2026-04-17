import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/error-boundary/require-error-boundary';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-error-boundary', rule, {
  valid: [
    // Route with errorElement
    { code: '<Route path="/home" element={<Home />} errorElement={<Error />} />' },
    // Route wrapped in ErrorBoundary
    {
      code: `
        <ErrorBoundary fallback={<Error />}>
          <Route path="/home" element={<Home />} />
        </ErrorBoundary>
      `,
    },
    // Element prop wraps with ErrorBoundary
    {
      code: '<Route path="/home" element={<ErrorBoundary><Home /></ErrorBoundary>} />',
    },
    // No element prop (layout route)
    { code: '<Route path="/admin"></Route>' },
  ],
  invalid: [
    {
      code: '<Route path="/dashboard" element={<Dashboard />} />',
      errors: [{ messageId: 'missingErrorBoundary' }],
    },
    {
      code: '<Route path="/" element={<Home />} />',
      errors: [{ messageId: 'missingErrorBoundary' }],
    },
  ],
});
