import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/data-display/no-enum-raw-render';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-enum-raw-render', rule, {
  valid: [
    // Mapped via object lookup
    { code: `<span>{statusMap[order.status]}</span>` },
    // Formatted via function call
    { code: `<Tag>{getRoleLabel(user.role)}</Tag>` },
    // Non-enum property name
    { code: `<span>{item.name}</span>` },
    // Conditional rendering
    { code: `<span>{order.status === 1 ? '已完成' : '进行中'}</span>` },
  ],
  invalid: [
    {
      code: `<span>{order.status}</span>`,
      errors: [{ messageId: 'enumRawRender' }],
    },
    {
      code: `<Tag>{user.role}</Tag>`,
      errors: [{ messageId: 'enumRawRender' }],
    },
    {
      code: `<div>{item.type}</div>`,
      errors: [{ messageId: 'enumRawRender' }],
    },
  ],
});
