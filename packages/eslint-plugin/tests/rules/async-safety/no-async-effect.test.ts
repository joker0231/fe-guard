import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/async-safety/no-async-effect';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-async-effect', rule, {
  valid: [
    // Correct pattern: async inside effect
    {
      code: `
        useEffect(() => {
          const load = async () => { await fetchData(); };
          load();
        }, []);
      `,
    },
    // Synchronous effect
    {
      code: `
        useEffect(() => {
          document.title = 'Hello';
        }, []);
      `,
    },
    // useLayoutEffect non-async
    {
      code: `
        useLayoutEffect(() => {
          measureElement();
        }, []);
      `,
    },
  ],
  invalid: [
    {
      code: `
        useEffect(async () => {
          const data = await fetchData();
          setData(data);
        }, []);
      `,
      errors: [{ messageId: 'asyncEffect' }],
    },
    {
      code: `
        useLayoutEffect(async () => {
          await measure();
        }, []);
      `,
      errors: [{ messageId: 'asyncEffect' }],
    },
  ],
});
