import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/component/no-state-in-render';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-state-in-render', rule, {
  valid: [
    // setState in event handler
    {
      code: `
        function Counter() {
          const [count, setCount] = useState(0);
          return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
        }
      `,
    },
    // setState in useEffect
    {
      code: `
        function Counter() {
          const [count, setCount] = useState(0);
          useEffect(() => { setCount(1); }, []);
          return <div>{count}</div>;
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        function Counter() {
          const [count, setCount] = useState(0);
          setCount(count + 1);
          return <div>{count}</div>;
        }
      `,
      errors: [{ messageId: 'stateInRender' }],
    },
  ],
});
