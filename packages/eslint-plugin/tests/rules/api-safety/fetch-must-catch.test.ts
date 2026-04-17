import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/api-safety/fetch-must-catch';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('fetch-must-catch', rule, {
  valid: [
    // In try-catch with await
    {
      code: `
        async function load() {
          try {
            const res = await fetch('/api');
          } catch (e) {}
        }
      `,
    },
    // With .catch() chain
    {
      code: "fetch('/api').then(r => r.json()).catch(handleError);",
    },
    // axios in try-catch
    {
      code: `
        async function load() {
          try {
            await axios.get('/api');
          } catch (e) {}
        }
      `,
    },
  ],
  invalid: [
    {
      code: "fetch('/api/users').then(r => r.json()).then(setData);",
      errors: [{ messageId: 'missingCatch' }],
    },
    {
      code: "fetch('/api/users');",
      errors: [{ messageId: 'missingCatch' }],
    },
  ],
});
