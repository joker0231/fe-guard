import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/async-safety/await-in-try';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('await-in-try', rule, {
  valid: [
    // await in try-catch
    {
      code: `
        async function load() {
          try {
            const data = await fetch('/api');
          } catch (e) {
            console.error(e);
          }
        }
      `,
    },
    // await fetch without try-catch is skipped (covered by fetch-must-catch)
    {
      code: `
        async function load() {
          const data = await fetch('/api');
        }
      `,
    },
    // await axios.get without try-catch is skipped (covered by fetch-must-catch)
    {
      code: `
        async function load() {
          const data = await axios.get('/api');
        }
      `,
    },
  ],
  invalid: [
    // await non-fetch call without try-catch
    {
      code: `
        async function load() {
          const data = await processData(input);
        }
      `,
      errors: [{ messageId: 'awaitNotInTry' }],
    },
    // await res.json() is not a fetch call, should still report
    {
      code: `
        async function loadUser() {
          const res = await fetch('/api/user');
          const data = await res.json();
          return data;
        }
      `,
      errors: [
        { messageId: 'awaitNotInTry' },
      ],
    },
  ],
});
