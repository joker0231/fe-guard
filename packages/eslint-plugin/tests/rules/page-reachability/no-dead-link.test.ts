import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/page-reachability/no-dead-link';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-dead-link', rule, {
  valid: [
    // Normal Link usage
    { code: '<Link to="/settings">设置</Link>' },
    { code: '<NavLink to="/dashboard">仪表盘</NavLink>' },
    // Dynamic to
    { code: '<Link to={`/user/${id}`}>用户</Link>' },
    // Non-Link/NavLink element
    { code: '<a href="/about">关于</a>' },
  ],
  invalid: [
    {
      code: '<Link to="">空链接</Link>',
      errors: [{ messageId: 'deadLink' }],
    },
    {
      code: '<NavLink to="">空链接</NavLink>',
      errors: [{ messageId: 'deadLink' }],
    },
  ],
});
