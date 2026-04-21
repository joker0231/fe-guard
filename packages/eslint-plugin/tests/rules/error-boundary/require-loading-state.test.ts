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
    // Component with loading state via useState
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
    // Using useQuery with isLoading destructured
    {
      code: `
        function UserList() {
          const { data, isLoading } = useQuery(['users'], fetchUsers);
          if (isLoading) return <div>Loading</div>;
          return <div>{data}</div>;
        }
      `,
    },
    // Using useMutation with isPending destructured
    {
      code: `
        function CreateTask() {
          const { mutateAsync, isPending } = useMutation({ mutationFn: createTask });
          return <button disabled={isPending}>Create</button>;
        }
      `,
    },
    // Using useMutation with isPending renamed via destructuring alias
    {
      code: `
        function CreateTask() {
          const { mutateAsync, isPending: isSubmitting } = useMutation({ mutationFn: createTask });
          return <button disabled={isSubmitting}>Create</button>;
        }
      `,
    },
    // Using useMutation with status destructured (alternative)
    {
      code: `
        function CreateTask() {
          const { mutateAsync, status } = useMutation({ mutationFn: createTask });
          return <button disabled={status === 'pending'}>Create</button>;
        }
      `,
    },
    // Using useSWR with isLoading
    {
      code: `
        function UserList() {
          const { data, isLoading } = useSWR('/api/users', fetcher);
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
    // Whole assignment (not destructured) — falls back to useState check
    {
      code: `
        function CreateTask() {
          const mutation = useMutation({ mutationFn: createTask });
          const [loading, setLoading] = useState(false);
          return <button disabled={loading}>Create</button>;
        }
      `,
    },
    // useRef for non-loading purpose (e.g. inputRef, scrollRef) — no error
    {
      code: `
        function SearchBox() {
          const inputRef = useRef(null);
          const { data, isLoading } = useQuery(['search'], fetchSearch);
          return <input ref={inputRef} />;
        }
      `,
    },
  ],

  invalid: [
    // No loading state at all
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
    // useMutation destructured but isPending NOT included — must use hook's loading
    {
      code: `
        function CreateTask() {
          const { mutateAsync } = useMutation({ mutationFn: createTask });
          return <button onClick={() => mutateAsync()}>Create</button>;
        }
      `,
      errors: [{ messageId: 'missingHookLoadingField' }],
    },
    // useMutation destructured without isPending, even with own useState loading — still error
    {
      code: `
        function CreateTask() {
          const { mutateAsync } = useMutation({ mutationFn: createTask });
          const [loading, setLoading] = useState(false);
          return <button disabled={loading} onClick={() => mutateAsync()}>Create</button>;
        }
      `,
      errors: [{ messageId: 'missingHookLoadingField' }],
    },
    // useQuery destructured without isLoading
    {
      code: `
        function UserList() {
          const { data } = useQuery(['users'], fetchUsers);
          return <div>{data}</div>;
        }
      `,
      errors: [{ messageId: 'missingHookLoadingField' }],
    },
    // useMutation destructured with only data, renamed loading in useState won't save it
    {
      code: `
        function CreateTask() {
          const { mutateAsync, data } = useMutation({ mutationFn: createTask });
          const [markProgress, setMarkProgress] = useState(false);
          return <button disabled={markProgress} onClick={() => mutateAsync()}>Create</button>;
        }
      `,
      errors: [{ messageId: 'missingHookLoadingField' }],
    },
    // useRef for loading anti-pattern
    {
      code: `
        function SubmitForm() {
          const loadingRef = useRef(false);
          const handleSubmit = async () => {
            loadingRef.current = true;
            await fetch('/api/submit');
            loadingRef.current = false;
          };
          return <button onClick={handleSubmit}>Submit</button>;
        }
      `,
      errors: [{ messageId: 'missingLoadingState' }, { messageId: 'useRefForLoading' }],
    },
    // useRef with isLoading name
    {
      code: `
        function DataLoader() {
          const isLoadingRef = useRef(false);
          useEffect(() => { fetch('/api/data'); }, []);
          return <div>Content</div>;
        }
      `,
      errors: [{ messageId: 'missingLoadingState' }, { messageId: 'useRefForLoading' }],
    },
    // useRef with submitting name
    {
      code: `
        function CreateTask() {
          const isSubmitting = useRef(false);
          const { mutateAsync } = useMutation({ mutationFn: createTask });
          return <button onClick={() => mutateAsync()}>Create</button>;
        }
      `,
      errors: [{ messageId: 'missingHookLoadingField' }, { messageId: 'useRefForLoading' }],
    },
  ],

});