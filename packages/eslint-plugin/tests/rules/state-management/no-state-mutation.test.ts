import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/state-management/no-state-mutation';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-state-mutation', rule, {
  valid: [
    // Immutable update
    {
      code: `
        const [items, setItems] = useState([]);
        setItems([...items, newItem]);
      `,
    },
    // Non-state variable mutation is fine
    {
      code: `
        const arr = [];
        arr.push(1);
      `,
    },
  ],
  invalid: [
    {
      code: `
        const [items, setItems] = useState([]);
        items.push(newItem);
      `,
      errors: [{ messageId: 'stateMutation' }],
    },
    {
      code: `
        const [items, setItems] = useState([]);
        items.sort();
      `,
      errors: [{ messageId: 'stateMutation' }],
    },
    {
      code: `
        const [items, setItems] = useState([]);
        items[0] = 'new';
      `,
      errors: [{ messageId: 'stateMutation' }],
    },
    // delete on state variable
    {
      code: `
        const [config, setConfig] = useState({ debug: true });
        delete config.debug;
      `,
      errors: [{ messageId: 'stateMutation' }],
    },
  ],
});
