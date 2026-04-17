import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/error-boundary/require-error-state';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-error-state', rule, {
  valid: [
    // Component with error state
    {
      code: `
        function UserList() {
          const [users, setUsers] = useState([]);
          const [error, setError] = useState(null);
          useEffect(() => { fetch('/api').then(r => r.json()).then(setUsers).catch(setError); }, []);
          if (error) return <div>Error</div>;
          return <div>{users}</div>;
        }
      `,
    },
    // useQuery with error
    {
      code: `
        function UserList() {
          const { data, error } = useQuery(['users'], fetchUsers);
          if (error) return <div>Error</div>;
          return <div>{data}</div>;
        }
      `,
    },
    // No async fetch
    {
      code: `
        function StaticComponent() {
          return <div>Hello</div>;
        }
      `,
    },
  ],
  invalid: [
    {
      code: `
        function UserList() {
          const [users, setUsers] = useState([]);
          useEffect(() => { fetch('/api').then(r => r.json()).then(setUsers); }, []);
          return <div>{users}</div>;
        }
      `,
      errors: [{ messageId: 'missingErrorState' }],
    },
  ],
});
