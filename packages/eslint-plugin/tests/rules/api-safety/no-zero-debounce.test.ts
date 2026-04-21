import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/api-safety/no-zero-debounce';

const tester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaVersion: 2020, sourceType: 'module', ecmaFeatures: { jsx: true } },
  },
});

tester.run('no-zero-debounce', rule, {
  valid: [
    // Normal debounce with reasonable delay
    { code: `const debouncedSearch = debounce(search, 300);` },
    { code: `const debouncedResize = debounce(handler, 200);` },
    { code: `const throttled = throttle(scroll, 100);` },
    // Lodash style
    { code: `const fn = _.debounce(handler, 500);` },
    { code: `const fn = lodash.throttle(handler, 150);` },
    // Hook style
    { code: `const fn = useDebouncedCallback(handler, 300);` },
    // Exactly at threshold (50ms)
    { code: `const fn = debounce(handler, 50);` },
    // Not a debounce call
    { code: `const result = fetch('/api/data');` },
    { code: `const result = someFunction(handler, 0);` },
    // Names containing "debounce" but not exact matches — should NOT trigger
    { code: `setDebouncedValue(value);` },
    { code: `debouncedSearch(query);` },
    { code: `const fn = createDebouncedHandler(handler, 0);` },
    // useDebounce/useThrottle hooks with valid delay
    { code: `const val = useDebounce(keyword, 300);` },
    { code: `const val = useThrottle(scroll, 150);` },
  ],
  invalid: [
    // Zero delay
    {
      code: `const fn = debounce(handler, 0);`,
      errors: [{ messageId: 'zeroDebounce' }],
    },
    // Very small delay
    {
      code: `const fn = debounce(handler, 10);`,
      errors: [{ messageId: 'zeroDebounce' }],
    },
    {
      code: `const fn = debounce(handler, 49);`,
      errors: [{ messageId: 'zeroDebounce' }],
    },
    // Throttle with zero
    {
      code: `const fn = throttle(handler, 0);`,
      errors: [{ messageId: 'zeroDebounce' }],
    },
    // Lodash style with zero
    {
      code: `const fn = _.debounce(handler, 0);`,
      errors: [{ messageId: 'zeroDebounce' }],
    },
    // Missing delay argument
    {
      code: `const fn = debounce(handler);`,
      errors: [{ messageId: 'missingDelay' }],
    },
    {
      code: `const fn = throttle(handler);`,
      errors: [{ messageId: 'missingDelay' }],
    },
    // Hook style with zero
    {
      code: `const fn = useDebouncedCallback(handler, 0);`,
      errors: [{ messageId: 'zeroDebounce' }],
    },
    // Lodash throttle missing delay
    {
      code: `const fn = _.throttle(handler);`,
      errors: [{ messageId: 'missingDelay' }],
    },
    // useDebounce hook with zero delay
    {
      code: `const val = useDebounce(keyword, 0);`,
      errors: [{ messageId: 'zeroDebounce' }],
    },
    // useDebounce hook with small delay
    {
      code: `const val = useDebounce(keyword, 10);`,
      errors: [{ messageId: 'zeroDebounce' }],
    },
    // useThrottle hook with zero delay
    {
      code: `const val = useThrottle(scroll, 0);`,
      errors: [{ messageId: 'zeroDebounce' }],
    },
    // useDebounce missing delay
    {
      code: `const val = useDebounce(keyword);`,
      errors: [{ messageId: 'missingDelay' }],
    },
  ],
});