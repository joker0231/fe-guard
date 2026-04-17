import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/render-safety/no-undefined-render';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-undefined-render', rule, {
  valid: [
    // Optional chaining
    { code: '<h1>{user?.name}</h1>' },
    // Nullish coalescing
    { code: "<h1>{user?.name ?? '匿名'}</h1>" },
    // Simple identifier (not property access)
    { code: '<h1>{title}</h1>' },
    // Safe objects
    { code: '<h1>{Math.PI}</h1>' },
    { code: '<h1>{props.name}</h1>' },
  ],
  invalid: [
    {
      code: '<h1>{user.name}</h1>',
      errors: [{ messageId: 'undefinedRender' }],
    },
    {
      code: '<p>{data.description}</p>',
      errors: [{ messageId: 'undefinedRender' }],
    },
    // Multi-level props chain (props.user may be undefined)
    {
      code: '<h1>{props.user.name}</h1>',
      errors: [{ messageId: 'undefinedRender' }],
    },
    {
      code: '<p>{props.config.theme.color}</p>',
      errors: [{ messageId: 'undefinedRender' }],
    },
  ],
});
