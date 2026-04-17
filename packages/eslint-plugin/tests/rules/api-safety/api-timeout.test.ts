import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/api-safety/api-timeout';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('api-timeout', rule, {
  valid: [
    // fetch with signal
    {
      code: "fetch('/api', { signal: controller.signal });",
    },
    // fetch with signal among other options
    {
      code: "fetch('/api', { method: 'POST', signal: abortCtrl.signal, body: data });",
    },
    // Not a fetch call
    {
      code: "myFetch('/api');",
    },
  ],
  invalid: [
    {
      code: "fetch('/api');",
      errors: [{ messageId: 'missingTimeout' }],
    },
    {
      code: "fetch('/api', { method: 'GET' });",
      errors: [{ messageId: 'missingTimeout' }],
    },
    {
      code: "fetch('/api', { headers: { 'Content-Type': 'application/json' } });",
      errors: [{ messageId: 'missingTimeout' }],
    },
  ],
});
