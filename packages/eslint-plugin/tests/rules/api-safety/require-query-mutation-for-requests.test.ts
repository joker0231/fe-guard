import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/api-safety/require-query-mutation-for-requests';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-query-mutation-for-requests', rule, {
  valid: [
    // API call inside useMutation's mutationFn — allowed
    {
      code: `
        function LoginPage() {
          const loginMutation = useMutation({
            mutationFn: (data) => apiClient.POST('/api/auth/login', { body: data }),
          });
          return <form onSubmit={() => loginMutation.mutate(data)}>Login</form>;
        }
      `,
    },
    // API call inside useQuery's queryFn — allowed
    {
      code: `
        function SearchPage() {
          const { data } = useQuery({
            queryFn: () => apiClient.GET('/api/search'),
          });
          return <div>{data}</div>;
        }
      `,
    },
    // API call outside component function — allowed (service/utility file)
    {
      code: `
        async function fetchUser(id) {
          return apiClient.GET('/api/users/' + id);
        }
      `,
    },
    // Non-API call in component — allowed
    {
      code: `
        function MyComponent() {
          const result = someFunction();
          return <div>{result}</div>;
        }
      `,
    },
    // API call inside useInfiniteQuery — allowed
    {
      code: `
        function ListPage() {
          const { data } = useInfiniteQuery({
            queryFn: ({ pageParam }) => apiClient.GET('/api/items?page=' + pageParam),
          });
          return <div>{data}</div>;
        }
      `,
    },
    // Arrow function component with useMutation — allowed
    {
      code: `
        const LoginPage = () => {
          const mutation = useMutation({
            mutationFn: (data) => apiClient.POST('/api/login', { body: data }),
          });
          return <button onClick={() => mutation.mutate()}>Go</button>;
        };
      `,
    },
    // lowercase function (not a component) — allowed
    {
      code: `
        function fetchData() {
          return apiClient.GET('/api/data');
        }
      `,
    },
  ],
  invalid: [
    // Direct apiClient call in event handler inside component
    {
      code: `
        function LoginPage() {
          const [isLoading, setIsLoading] = useState(false);
          const onSubmit = async (data) => {
            setIsLoading(true);
            await apiClient.POST('/api/auth/login', { body: data });
            setIsLoading(false);
          };
          return <form onSubmit={onSubmit}>Login</form>;
        }
      `,
      errors: [{ messageId: 'directApiCall', data: { callText: 'apiClient.POST' } }],
    },
    // Direct fetch in useEffect inside component
    {
      code: `
        function SearchPage() {
          useEffect(() => {
            fetch('/api/search?q=' + query).then(r => r.json());
          }, [query]);
          return <div>Search</div>;
        }
      `,
      errors: [{ messageId: 'directApiCall', data: { callText: 'fetch' } }],
    },
    // Direct apiClient.GET in useEffect
    {
      code: `
        function DataPage() {
          useEffect(() => {
            apiClient.GET('/api/data').then(res => setData(res.data));
          }, []);
          return <div>Data</div>;
        }
      `,
      errors: [{ messageId: 'directApiCall', data: { callText: 'apiClient.GET' } }],
    },
    // Arrow function component with direct API call
    {
      code: `
        const NotificationsPage = () => {
          const markRead = async (id) => {
            await apiClient.PATCH('/api/notifications/' + id);
          };
          return <button onClick={() => markRead(1)}>Mark</button>;
        };
      `,
      errors: [{ messageId: 'directApiCall', data: { callText: 'apiClient.PATCH' } }],
    },
    // Multiple direct API calls in one component
    {
      code: `
        function TaskPage() {
          const save = async () => {
            await apiClient.PUT('/api/tasks/1', { body: {} });
          };
          const remove = async () => {
            await apiClient.DELETE('/api/tasks/1');
          };
          return <div><button onClick={save}>Save</button><button onClick={remove}>Delete</button></div>;
        }
      `,
      errors: [
        { messageId: 'directApiCall', data: { callText: 'apiClient.PUT' } },
        { messageId: 'directApiCall', data: { callText: 'apiClient.DELETE' } },
      ],
    },
    // axios call in component
    {
      code: `
        function ProfilePage() {
          const update = async (data) => {
            await axios('/api/profile', { method: 'POST', data });
          };
          return <form onSubmit={update}>Profile</form>;
        }
      `,
      errors: [{ messageId: 'directApiCall', data: { callText: 'axios' } }],
    },
  ],
});
