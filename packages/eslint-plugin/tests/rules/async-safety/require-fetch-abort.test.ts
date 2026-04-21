import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/async-safety/require-fetch-abort';

const tester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

tester.run('require-fetch-abort', rule, {
  valid: [
    // ✅ useEffect with fetch + AbortController + cleanup
    {
      code: `
        useEffect(() => {
          const controller = new AbortController();
          fetch('/api/data', { signal: controller.signal })
            .then(res => res.json())
            .then(data => setData(data));
          return () => controller.abort();
        }, [id]);
      `,
    },
    // ✅ useEffect with async IIFE + AbortController + cleanup
    {
      code: `
        useEffect(() => {
          const controller = new AbortController();
          const fetchData = async () => {
            const res = await fetch('/api/data', { signal: controller.signal });
            const data = await res.json();
            setData(data);
          };
          fetchData();
          return () => controller.abort();
        }, [id]);
      `,
    },
    // ✅ useEffect with apiClient + AbortController + cleanup
    {
      code: `
        useEffect(() => {
          const controller = new AbortController();
          apiClient.GET('/api/data', { signal: controller.signal })
            .then(({ data }) => setResults(data));
          return () => controller.abort();
        }, [query]);
      `,
    },
    // ✅ useEffect without fetch — no need for AbortController
    {
      code: `
        useEffect(() => {
          document.title = 'Hello';
        }, []);
      `,
    },
    // ✅ useEffect with setTimeout — not a fetch
    {
      code: `
        useEffect(() => {
          const timer = setTimeout(() => setVisible(true), 300);
          return () => clearTimeout(timer);
        }, []);
      `,
    },
    // ✅ Not a useEffect — no check
    {
      code: `
        function loadData() {
          fetch('/api/data').then(res => setData(res));
        }
      `,
    },
    // ✅ useEffect with httpClient + AbortController + cleanup
    {
      code: `
        useEffect(() => {
          const ac = new AbortController();
          httpClient.get('/api/items', { signal: ac.signal });
          return () => ac.abort();
        }, []);
      `,
    },
  ],
  invalid: [
    // ❌ useEffect with fetch but no AbortController
    {
      code: `
        useEffect(() => {
          fetch('/api/data')
            .then(res => res.json())
            .then(data => setData(data));
        }, [id]);
      `,
      errors: [{ messageId: 'missingAbortController' }],
    },
    // ❌ useEffect with async IIFE fetch but no AbortController
    {
      code: `
        useEffect(() => {
          const loadData = async () => {
            const res = await fetch('/api/items');
            setItems(await res.json());
          };
          loadData();
        }, [category]);
      `,
      errors: [{ messageId: 'missingAbortController' }],
    },
    // ❌ useEffect with apiClient.GET but no AbortController
    {
      code: `
        useEffect(() => {
          const performSearch = async () => {
            const { data } = await apiClient.GET('/api/search?q=' + query);
            setResults(data);
          };
          performSearch();
        }, [query]);
      `,
      errors: [{ messageId: 'missingAbortController' }],
    },
    // ❌ useEffect with axios.get but no AbortController
    {
      code: `
        useEffect(() => {
          axios.get('/api/data').then(({ data }) => setData(data));
        }, [id]);
      `,
      errors: [{ messageId: 'missingAbortController' }],
    },
    // ❌ useEffect with httpClient.post but no AbortController
    {
      code: `
        useEffect(() => {
          httpClient.post('/api/track', { event: 'page_view' });
        }, []);
      `,
      errors: [{ messageId: 'missingAbortController' }],
    },
    // ❌ Has AbortController but no cleanup return
    {
      code: `
        useEffect(() => {
          const controller = new AbortController();
          fetch('/api/data', { signal: controller.signal })
            .then(res => setData(res));
        }, [id]);
      `,
      errors: [{ messageId: 'missingCleanupWithAbort' }],
    },
    // ❌ useEffect with client.fetch but no AbortController
    {
      code: `
        useEffect(() => {
          client.fetch('/api/data').then(d => setData(d));
        }, [id]);
      `,
      errors: [{ messageId: 'missingAbortController' }],
    },
  ],
});