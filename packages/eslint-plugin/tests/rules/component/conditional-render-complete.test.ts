import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/component/conditional-render-complete';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('conditional-render-complete', rule, {
  valid: [
    // Ternary with both branches
    { code: '<div>{isAdmin ? <AdminPanel /> : <UserPanel />}</div>' },
    // Temporary UI state variables are still skipped
    { code: '<div>{isLoading && <Spinner />}</div>' },
    { code: '<div>{isSubmitting && <Spinner />}</div>' },
    { code: '<div>{showModal && <Modal />}</div>' },
    { code: '<div>{isVisible && <Tooltip />}</div>' },
    // Complementary conditions
    {
      code: `
        <div>
          {isAdmin && <AdminPanel />}
          {!isAdmin && <UserPanel />}
        </div>
      `,
    },
    // Non-JSX right side
    { code: '<div>{count && "items"}</div>' },
  ],
  invalid: [
    {
      code: `<div>{user.role === 'admin' && <AdminPanel />}</div>`,
      errors: [{ messageId: 'incompleteBranch' }],
    },
    // Business state variables should NOT be skipped after fix
    {
      code: '<div>{isAuthenticated && <Dashboard />}</div>',
      errors: [{ messageId: 'incompleteBranch' }],
    },
    {
      code: '<div>{isAdmin && <AdminPanel />}</div>',
      errors: [{ messageId: 'incompleteBranch' }],
    },
    {
      code: '<div>{hasPermission && <SecretContent />}</div>',
      errors: [{ messageId: 'incompleteBranch' }],
    },
    {
      code: '<div>{canEdit && <EditForm />}</div>',
      errors: [{ messageId: 'incompleteBranch' }],
    },
  ],
});
