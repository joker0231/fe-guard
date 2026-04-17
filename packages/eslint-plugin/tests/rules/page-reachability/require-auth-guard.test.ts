import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/page-reachability/require-auth-guard';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-auth-guard', rule, {
  valid: [
    // Non-protected route
    { code: '<Route path="/" element={<Home />} />' },
    { code: '<Route path="/about" element={<About />} />' },
    // Protected route with errorElement
    { code: '<Route path="/admin" element={<Admin />} errorElement={<Error />} />' },
    // Protected route wrapped in AuthGuard
    {
      code: `
        <AuthGuard>
          <Route path="/admin/users" element={<AdminUsers />} />
        </AuthGuard>
      `,
    },
    // Protected route with AuthGuard in element prop
    {
      code: '<Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />',
    },
    // Non-protected route without element
    { code: '<Route path="/public"></Route>' },
  ],
  invalid: [
    {
      code: '<Route path="/admin" element={<Admin />} />',
      errors: [{ messageId: 'missingAuthGuard' }],
    },
    {
      code: '<Route path="/dashboard/stats" element={<Stats />} />',
      errors: [{ messageId: 'missingAuthGuard' }],
    },
    {
      code: '<Route path="/settings/profile" element={<Profile />} />',
      errors: [{ messageId: 'missingAuthGuard' }],
    },
  ],
});
