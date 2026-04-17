import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/api-safety/response-null-check';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('response-null-check', rule, {
  valid: [
    // Using optional chaining
    {
      code: `
        async function load() {
          const res = await fetch('/api');
          const data = await res.json();
          return data?.users;
        }
      `,
    },
    // Not from API response
    {
      code: `
        const config = { name: 'test' };
        console.log(config.name);
      `,
    },
  ],
  invalid: [
    {
      code: `
        async function load() {
          const res = await fetch('/api');
          const data = await res.json();
          return data.users;
        }
      `,
      errors: [{ messageId: 'missingNullCheck' }],
    },
  ],
});
