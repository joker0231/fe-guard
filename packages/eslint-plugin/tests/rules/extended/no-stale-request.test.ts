import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/extended/no-stale-request';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-stale-request', rule, {
  valid: [
    // Has AbortController
    {
      code: `
        useEffect(() => {
          const controller = new AbortController();
          fetch('/api/search?q=' + query, { signal: controller.signal })
            .then(r => r.json())
            .then(setResults);
          return () => controller.abort();
        }, [query]);
      `,
    },
    // No deps array (runs once, no stale issue)
    {
      code: `
        useEffect(() => {
          fetch('/api/data').then(r => r.json()).then(setData);
        });
      `,
    },
    // Empty deps array (runs once)
    {
      code: `
        useEffect(() => {
          fetch('/api/data').then(r => r.json()).then(setData);
        }, []);
      `,
    },
    // No fetch call
    {
      code: `
        useEffect(() => {
          document.title = query;
        }, [query]);
      `,
    },
    // Not useEffect
    {
      code: `
        function loadData() {
          fetch('/api/data').then(r => r.json());
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        useEffect(() => {
          fetch('/api/search?q=' + query).then(r => r.json()).then(setResults);
        }, [query]);
      `,
      errors: [{ messageId: 'missingAbort' }],
    },
    {
      code: `
        useEffect(() => {
          const load = async () => {
            const res = await fetch('/api/items?page=' + page);
            const data = await res.json();
            setItems(data);
          };
          load();
        }, [page]);
      `,
      errors: [{ messageId: 'missingAbort' }],
    },
  ],
});
