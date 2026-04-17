import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/extended/require-env-fallback';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
});

ruleTester.run('require-env-fallback', rule, {
  valid: [
    // Has ?? fallback
    {
      code: `const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';`,
    },
    // Has || fallback
    {
      code: `const API_URL = import.meta.env.VITE_API_URL || '/api';`,
    },
    // Inside if check
    {
      code: `
        if (!import.meta.env.VITE_API_URL) {
          throw new Error('Missing env');
        }
      `,
    },
    // Ternary
    {
      code: `const url = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : '/default';`,
    },
    // Not an env access
    {
      code: `const x = someObj.env.VALUE;`,
    },
    // process.env with fallback
    {
      code: `const KEY = process.env.API_KEY ?? 'default';`,
    },
  ],
  invalid: [
    {
      code: `const API_URL = import.meta.env.VITE_API_URL;`,
      errors: [{ messageId: 'missingFallback' }],
    },
    {
      code: `fetch(import.meta.env.VITE_API_URL + '/users');`,
      errors: [{ messageId: 'missingFallback' }],
    },
    {
      code: `const KEY = process.env.REACT_APP_API_KEY;`,
      errors: [{ messageId: 'missingFallback' }],
    },
  ],
});
