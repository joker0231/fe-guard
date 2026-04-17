import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/ai-smell/no-scattered-constants';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-scattered-constants', rule, {
  valid: [
    // Import statement (should be skipped)
    {
      code: `import { API_URL } from '../constants/api';`,
    },
    // Whitelisted number (0)
    {
      code: `const x = items.length > 0;`,
    },
    // Variable in setTimeout (not a literal)
    {
      code: `setTimeout(fn, delay);`,
    },
    // File in constants directory should be skipped
    {
      code: `const API = 'https://api.myapp.com/v2';`,
      filename: 'src/constants/api.ts',
    },
    // File in config directory should be skipped
    {
      code: `const API = 'https://api.myapp.com/v2';`,
      filename: 'src/config/endpoints.ts',
    },
    // Small number in setTimeout (whitelisted: 1)
    {
      code: `setTimeout(fn, 1);`,
    },
  ],
  invalid: [
    // Hardcoded URL
    {
      code: `const API = 'https://api.myapp.com/v2';`,
      errors: [{ messageId: 'scatteredUrl' }],
    },
    // API path
    {
      code: `fetch('/api/users');`,
      errors: [{ messageId: 'scatteredUrl' }],
    },
    // Magic number in setTimeout
    {
      code: `setTimeout(retry, 5000);`,
      errors: [{ messageId: 'magicNumber' }],
    },
  ],
});
