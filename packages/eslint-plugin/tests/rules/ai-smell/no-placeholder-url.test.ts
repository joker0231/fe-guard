import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/ai-smell/no-placeholder-url';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-placeholder-url', rule, {
  valid: [
    // Environment variable usage
    {
      code: `const url = import.meta.env.VITE_API_URL;`,
    },
    // Relative path is OK
    {
      code: `const url = '/api/users';`,
    },
    // Real URL with no placeholder pattern
    {
      code: `const url = 'https://my-real-api.com/v1';`,
    },
    // Test files should be skipped
    {
      code: `const url = 'https://api.example.com/v1';`,
      filename: 'src/utils/api.test.ts',
    },
    // Mock files should be skipped
    {
      code: `const url = 'https://api.example.com/v1';`,
      filename: 'src/__mocks__/api.ts',
    },
  ],
  invalid: [
    // example.com
    {
      code: `const url = 'https://api.example.com/v1';`,
      errors: [{ messageId: 'placeholderUrl' }],
    },
    // your-api pattern
    {
      code: `const url = 'https://your-api-server.com/data';`,
      errors: [{ messageId: 'placeholderUrl' }],
    },
    // placeholder.com
    {
      code: `fetch('https://placeholder.com/150');`,
      errors: [{ messageId: 'placeholderUrl' }],
    },
    // jsonplaceholder
    {
      code: `const url = 'https://jsonplaceholder.typicode.com/todos';`,
      errors: [{ messageId: 'placeholderUrl' }],
    },
  ],
});
