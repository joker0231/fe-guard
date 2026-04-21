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
    // Template literal without enum field
    { code: '<span>{`Hello ${user.name}`}</span>' },
    // Template literal with mapped enum
    { code: '<span>{`Status: ${statusMap[task.status]}`}</span>' },
    // String() wrapping with non-enum field
    { code: '<span>{String(item.name)}</span>' },
    // toString() on non-enum field
    { code: '<span>{item.name.toString()}</span>' },
    // String() wrapping with mapped enum
    { code: '<span>{String(statusMap[task.status])}</span>' },
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
    // Template literal with raw enum field
    {
      code: '<span>{`Status: ${task.status}`}</span>',
      errors: [{ messageId: 'enumRawRender' }],
    },
    // Template literal with multiple enum fields
    {
      code: '<span>{`${item.type} - ${item.priority}`}</span>',
      errors: [{ messageId: 'enumRawRender' }, { messageId: 'enumRawRender' }],
    },
    // Template literal with enum in div
    {
      code: '<div>{`Role: ${user.role}`}</div>',
      errors: [{ messageId: 'enumRawRender' }],
    },
    // String() wrapping enum field
    {
      code: '<span>{String(task.status)}</span>',
      errors: [{ messageId: 'enumRawRender' }],
    },
    // toString() on enum field
    {
      code: '<span>{task.status.toString()}</span>',
      errors: [{ messageId: 'enumRawRender' }],
    },
    // String() wrapping in template literal context
    {
      code: '<div>{String(order.priority)}</div>',
      errors: [{ messageId: 'enumRawRender' }],
    },
  ],
});