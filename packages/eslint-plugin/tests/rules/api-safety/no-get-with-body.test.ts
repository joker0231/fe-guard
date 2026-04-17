import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/api-safety/no-get-with-body';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-get-with-body', rule, {
  valid: [
    // GET without body
    { code: "fetch('/api/data');" },
    { code: "fetch('/api/data', { method: 'GET' });" },
    // POST with body (OK)
    { code: "fetch('/api/data', { method: 'POST', body: JSON.stringify({}) });" },
    // PUT with body (OK)
    { code: "fetch('/api/data', { method: 'PUT', body: JSON.stringify({}) });" },
  ],
  invalid: [
    {
      code: "fetch('/api/search', { method: 'GET', body: JSON.stringify({ query: 'test' }) });",
      errors: [{ messageId: 'getWithBody' }],
    },
    {
      // Default method is GET
      code: "fetch('/api/data', { body: JSON.stringify(params) });",
      errors: [{ messageId: 'getWithBody' }],
    },
  ],
});
