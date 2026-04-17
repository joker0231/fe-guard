import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/side-effects/no-unnecessary-effect';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-unnecessary-effect', rule, {
  valid: [
    // Side effect: fetchData call
    {
      code: `
        const [data, setData] = useState(null);
        useEffect(() => {
          fetchData();
        }, [id]);
      `,
    },
    // Multiple statements in effect body
    {
      code: `
        const [filtered, setFiltered] = useState([]);
        useEffect(() => {
          setFiltered(items.filter(i => i.active));
          doSomethingElse();
        }, [items]);
      `,
    },
    // Has cleanup return (indicates side effect)
    {
      code: `
        const [done, setDone] = useState(false);
        useEffect(() => {
          const timer = setTimeout(() => setDone(true), 1000);
          return () => clearTimeout(timer);
        }, []);
      `,
    },
    // Async effect (indicates real side effect)
    {
      code: `
        const [data, setData] = useState(null);
        useEffect(async () => {
          const res = await fetch('/api');
          setData(res);
        }, []);
      `,
    },
    // No deps array (no second argument)
    {
      code: `
        const [count, setCount] = useState(0);
        useEffect(() => {
          setCount(count + 1);
        });
      `,
    },
  ],
  invalid: [
    // Simple derivation: filtering items
    {
      code: `
        const [items] = useState([]);
        const [filtered, setFiltered] = useState([]);
        useEffect(() => {
          setFiltered(items.filter(i => i.active));
        }, [items]);
      `,
      errors: [{ messageId: 'unnecessaryEffect' }],
    },
    // Simple derivation: computing a value
    {
      code: `
        const [price, setPrice] = useState(0);
        const [tax, setTax] = useState(0);
        useEffect(() => {
          setTax(price * 0.1);
        }, [price]);
      `,
      errors: [{ messageId: 'unnecessaryEffect' }],
    },
  ],
});
