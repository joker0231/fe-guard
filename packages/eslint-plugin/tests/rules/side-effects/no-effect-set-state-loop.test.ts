import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/side-effects/no-effect-set-state-loop';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-effect-set-state-loop', rule, {
  valid: [
    // Functional update, count not in deps
    {
      code: `
        const [count, setCount] = useState(0);
        useEffect(() => {
          setCount(prev => prev + 1);
        }, []);
      `,
    },
    // No setState in effect, just reading state
    {
      code: `
        const [count, setCount] = useState(0);
        useEffect(() => {
          console.log(count);
        }, [count]);
      `,
    },
    // setState but empty deps array
    {
      code: `
        const [count, setCount] = useState(0);
        useEffect(() => {
          setCount(5);
        }, []);
      `,
    },
    // setState on a different state variable than what's in deps
    {
      code: `
        const [count, setCount] = useState(0);
        const [label, setLabel] = useState('');
        useEffect(() => {
          setLabel(String(count));
        }, [count]);
      `,
    },
  ],
  invalid: [
    // count in deps + setCount called referencing count
    {
      code: `
        const [count, setCount] = useState(0);
        useEffect(() => {
          setCount(count + 1);
        }, [count]);
      `,
      errors: [{ messageId: 'setStateLoop' }],
    },
    // Multiple state pairs, one creates a loop
    {
      code: `
        const [items, setItems] = useState([]);
        const [total, setTotal] = useState(0);
        useEffect(() => {
          setItems([...items, 'new']);
        }, [items]);
      `,
      errors: [{ messageId: 'setStateLoop' }],
    },
  ],
});
