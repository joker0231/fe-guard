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
    // Ternary with empty state branch
    {
      code: `
        <div>
          {users.length === 0 ? <Empty /> : users.map(u => <li key={u.id}>{u.name}</li>)}
        </div>
      `,
    },
    // Sibling empty state pattern
    {
      code: `
        <div>
          {users.length === 0 && <EmptyState />}
          {users.map(u => <li key={u.id}>{u.name}</li>)}
        </div>
      `,
    },
    // Sibling empty state with && map
    {
      code: `
        <div>
          {users.length === 0 && <EmptyState />}
          {users.length > 0 && users.map(u => <li key={u.id}>{u.name}</li>)}
        </div>
      `,
    },
    // Not in JSX context
    {
      code: 'const items = data.map(x => x.name);',
    },
    // Inside a ternary higher up
    {
      code: `
        <div>
          {loading ? <Spinner /> : items.length > 0 && items.map(i => <span key={i}>{i}</span>)}
        </div>
      `,
    },
  ],
  invalid: [
    // Direct .map() without any empty state handling
    {
      code: `
        <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>
      `,
      errors: [{ messageId: 'missingEmptyState' }],
    },
    // && pattern without sibling empty state - no empty UI when array is empty
    {
      code: `
        <div>
          {users.length > 0 && users.map(u => <li key={u.id}>{u.name}</li>)}
        </div>
      `,
      errors: [{ messageId: 'missingEmptyState' }],
    },
    // && with truthy check - still no empty state
    {
      code: `
        <div>
          {users && users.map(u => <li key={u.id}>{u.name}</li>)}
        </div>
      `,
      errors: [{ messageId: 'missingEmptyState' }],
    },
    // Nested property .map() without empty state
    {
      code: `
        <div>{data.items.map(item => <span key={item.id}>{item.name}</span>)}</div>
      `,
      errors: [{ messageId: 'missingEmptyState' }],
    },
  ],
});