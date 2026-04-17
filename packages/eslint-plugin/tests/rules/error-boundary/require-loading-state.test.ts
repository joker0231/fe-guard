import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/error-boundary/require-loading-state';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-loading-state', rule, {
  valid: [
    // Component with loading state
    {
      code: `
        function UserList() {
          const [users, setUsers] = useState([]);
          const [loading, setLoading] = useState(true);
          useEffect(() => { fetch('/api').then(r => r.json()).then(setUsers); }, []);
          if (loading) return <div>Loading...</div>;
          return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
        }
      `,
    },
    // Using useQuery with isLoading
    {
      code: `
        function UserList() {
          const { data, isLoading } = useQuery(['users'], fetchUsers);
          if (isLoading) return <div>Loading</div>;
          return <div>{data}</div>;
        }
      `,
    },
    // No async fetch — no problem
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
          return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
        }
      `,
      errors: [{ messageId: 'missingLoadingState' }],
    },
  ],
});
