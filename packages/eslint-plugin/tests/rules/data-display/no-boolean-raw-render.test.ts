import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/data-display/no-boolean-raw-render';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-boolean-raw-render', rule, {
  valid: [
    // Conditional expression
    { code: `<td>{user.isActive ? '已激活' : '未激活'}</td>` },
    // Logical AND rendering
    { code: `<span>{item.isVerified && <CheckIcon />}</span>` },
    // Non-boolean property name
    { code: `<span>{item.name}</span>` },
    // Wrapped in function call
    { code: `<span>{formatBool(item.enabled)}</span>` },
  ],
  invalid: [
    {
      code: `<td>{user.isActive}</td>`,
      errors: [{ messageId: 'booleanRawRender' }],
    },
    {
      code: `<span>{item.isVerified}</span>`,
      errors: [{ messageId: 'booleanRawRender' }],
    },
    {
      code: `<span>{item.enabled}</span>`,
      errors: [{ messageId: 'booleanRawRender' }],
    },
  ],
});
