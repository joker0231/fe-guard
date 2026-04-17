import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/component/no-recursive-without-base';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-recursive-without-base', rule, {
  valid: [
    // Recursive with condition
    {
      code: `
        function TreeNode({ node }) {
          return (
            <div>
              {node.name}
              {node.children?.length > 0 && node.children.map(c => <TreeNode key={c.id} node={c} />)}
            </div>
          );
        }
      `,
    },
    // Non-recursive component
    {
      code: `
        function Card({ title }) {
          return <div>{title}</div>;
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        function TreeNode({ node }) {
          return (
            <div>
              {node.name}
              {node.children.map(c => <TreeNode key={c.id} node={c} />)}
            </div>
          );
        }
      `,
      errors: [{ messageId: 'missingBaseCase' }],
    },
  ],
});
