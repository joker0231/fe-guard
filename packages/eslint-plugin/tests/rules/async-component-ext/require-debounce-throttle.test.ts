import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/async-component-ext/require-debounce-throttle';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-debounce-throttle', rule, {
  valid: [
    // Reference to external debounced handler — not an inline function, skip
    {
      code: `<input onChange={debouncedSearch} />`,
    },
    // Inline handler with loading guard
    {
      code: `
        <button onClick={async () => {
          if (loading) return;
          setLoading(true);
          await fetch('/api/save');
          setLoading(false);
        }}>Save</button>
      `,
    },
    // Loading guard not on first line
    {
      code: `
        <button onClick={async () => {
          const data = prepareData();
          if (isSubmitting) return;
          await fetch('/api/save', { method: 'POST', body: data });
        }}>Save</button>
      `,
    },
    // No fetch call — just a normal handler
    {
      code: `<button onClick={() => console.log('no fetch')}>Log</button>`,
    },
    // Debounce wrapper as the value
    {
      code: `<input onChange={debounce(() => fetch('/api/search'), 300)} />`,
    },
  ],
  invalid: [
    // Inline handler calling fetch directly without protection
    {
      code: `<input onChange={(e) => fetch('/api/search?q=' + e.target.value)} />`,
      errors: [{ messageId: 'missingProtection' }],
    },
    // Async inline handler calling fetch without loading guard
    {
      code: `
        <button onClick={async () => {
          await fetch('/api/save', { method: 'POST', body });
        }}>Save</button>
      `,
      errors: [{ messageId: 'missingProtection' }],
    },
  ],
});
