import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/extended/list-pagination-or-virtual';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
});

ruleTester.run('list-pagination-or-virtual', rule, {
  valid: [
    // Has Pagination component
    {
      code: `
        function List({ items }) {
          return (
            <div>
              <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>
              <Pagination total={100} />
            </div>
          );
        }
      `,
    },
    // Has .slice() before .map()
    {
      code: `
        function List({ items }) {
          return <ul>{items.slice(0, 10).map(i => <li key={i.id}>{i.name}</li>)}</ul>;
        }
      `,
    },
    // Has virtual scroll import
    {
      code: `
        import { useVirtualizer } from '@tanstack/react-virtual';
        function List({ items }) {
          return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
        }
      `,
    },
    // No .map() call in JSX
    {
      code: `
        function List() {
          return <div>Static content</div>;
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        function List({ items }) {
          return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
        }
      `,
      errors: [{ messageId: 'missingPagination' }],
    },
    {
      code: `
        function List({ allItems }) {
          return (
            <div>
              {allItems.map(item => <Card key={item.id} data={item} />)}
            </div>
          );
        }
      `,
      errors: [{ messageId: 'missingPagination' }],
    },
  ],
});
