import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/page-reachability/no-location-href-navigate';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-location-href-navigate', rule, {
  valid: [
    // External URLs are OK
    { code: "window.location.href = 'https://docs.example.com';" },
    { code: "window.location.assign('https://example.com');" },
    { code: "window.location.replace('https://example.com');" },
    // React router usage
    { code: '<Link to="/settings">设置</Link>' },
    // External <a> links
    { code: '<a href="https://docs.example.com">文档</a>' },
    // Relative or hash links (not starting with /)
    { code: '<a href="#section">锚点</a>' },
    { code: '<a href="mailto:test@test.com">邮件</a>' },
  ],
  invalid: [
    {
      code: "window.location.href = '/dashboard';",
      errors: [{ messageId: 'noLocationNavigate' }],
    },
    {
      code: "window.location.assign('/settings');",
      errors: [{ messageId: 'noLocationNavigate' }],
    },
    {
      code: "window.location.replace('/login');",
      errors: [{ messageId: 'noLocationNavigate' }],
    },
    {
      code: '<a href="/about">关于</a>',
      errors: [{ messageId: 'noAnchorHref' }],
    },
    {
      code: '<a href="/settings/profile">设置</a>',
      errors: [{ messageId: 'noAnchorHref' }],
    },
  ],
});
