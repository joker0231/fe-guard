import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/extended/no-derived-state';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-derived-state', rule, {
  valid: [
    // useMemo is correct
    {
      code: `
        function App() {
          const [items] = useState([]);
          const filtered = useMemo(() => items.filter(i => i.active), [items]);
          return <div />;
        }
      `,
    },
    // useEffect with side effects (fetch)
    {
      code: `
        function App() {
          const [data, setData] = useState(null);
          useEffect(() => {
            fetchData().then(setData);
          }, [id]);
          return <div />;
        }
      `,
    },
    // useEffect with cleanup (not pure derivation)
    {
      code: `
        function App() {
          const [count, setCount] = useState(0);
          useEffect(() => {
            setCount(prev => prev + 1);
            return () => cleanup();
          }, [trigger]);
          return <div />;
        }
      `,
    },
    // No useEffect at all
    {
      code: `
        function App() {
          const [items, setItems] = useState([]);
          return <div />;
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        function App() {
          const [items] = useState([]);
          const [filtered, setFiltered] = useState([]);
          useEffect(() => {
            setFiltered(items.filter(i => i.active));
          }, [items]);
          return <div />;
        }
      `,
      errors: [{ messageId: 'derivedState' }],
    },
    {
      code: `
        function App() {
          const [firstName] = useState('');
          const [lastName] = useState('');
          const [fullName, setFullName] = useState('');
          useEffect(() => {
            setFullName(firstName + ' ' + lastName);
          }, [firstName, lastName]);
          return <div />;
        }
      `,
      errors: [{ messageId: 'derivedState' }],
    },
  ],
});
