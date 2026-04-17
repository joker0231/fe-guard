import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/render-safety/no-falsy-render';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-falsy-render', rule, {
  valid: [
    // Boolean condition
    { code: '<div>{isVisible && <Modal />}</div>' },
    // Explicit check
    { code: '<div>{count > 0 && <Badge count={count} />}</div>' },
    // Double bang
    { code: '<div>{!!count && <Badge />}</div>' },
    // Ternary
    { code: '<div>{count ? <Badge /> : null}</div>' },
    // Non-JSX right side
    { code: '<div>{count && "text"}</div>' },
  ],
  invalid: [
    // Heuristic: count looks like a number
    {
      code: '<div>{count && <Badge count={count} />}</div>',
      errors: [{ messageId: 'falsyRender' }],
    },
    // Heuristic: .length looks like a number
    {
      code: '<div>{items.length && <List />}</div>',
      errors: [{ messageId: 'falsyRender' }],
    },
  ],
});
