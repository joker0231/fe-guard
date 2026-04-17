import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/api-safety/safe-json-parse';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('safe-json-parse', rule, {
  valid: [
    // In try-catch
    {
      code: `
        try {
          const data = JSON.parse(text);
        } catch (e) {
          console.error(e);
        }
      `,
    },
    // Not JSON.parse
    {
      code: "JSON.stringify({ a: 1 });",
    },
  ],
  invalid: [
    {
      code: "const config = JSON.parse(localStorage.getItem('config'));",
      errors: [{ messageId: 'unsafeJsonParse' }],
    },
    {
      code: "const data = JSON.parse(response.body);",
      errors: [{ messageId: 'unsafeJsonParse' }],
    },
  ],
});
