import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/error-boundary/require-empty-state';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-empty-state', rule, {
  valid: [
    // Ternary with length check
    {
      code: `
        <div>
          {users.length === 0 ? <Empty /> : users.map(u => <li key={u.id}>{u.name}</li>)}
        </div>
      `,
    },
    // Logical AND with length check
    {
      code: `
        <div>
          {users.length > 0 && users.map(u => <li key={u.id}>{u.name}</li>)}
        </div>
      `,
    },
    // Not in JSX context
    {
      code: 'const items = data.map(x => x.name);',
    },
  ],
  invalid: [
    {
      code: `
        <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
      `,
      errors: [{ messageId: 'missingEmptyState' }],
    },
  ],
});
