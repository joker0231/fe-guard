import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/api-safety/require-mutation-callbacks';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-mutation-callbacks', rule, {
  valid: [
    // Both onSuccess and onError present (v5 single object)
    {
      code: `
        function Component() {
          const mutation = useMutation({
            mutationFn: (data) => apiClient.POST('/tasks', { body: data }),
            onSuccess: () => { toast.success('Created'); },
            onError: (err) => { toast.error(err.message); },
          });
        }
      `,
    },
    // Both present with invalidateQueries (silent success)
    {
      code: `
        function Component() {
          const mutation = useMutation({
            mutationFn: updateTask,
            onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); },
            onError: (err) => { console.error(err); },
          });
        }
      `,
    },
    // v4 pattern: (mutationFn, { onSuccess, onError })
    {
      code: `
        function Component() {
          const mutation = useMutation(updateTask, {
            onSuccess: () => {},
            onError: () => {},
          });
        }
      `,
    },
    // Member expression: queryClient.useMutation
    {
      code: `
        function Component() {
          const mutation = trpc.tasks.create.useMutation({
            onSuccess: () => { navigate('tasks'); },
            onError: (err) => { setError(err.message); },
          });
        }
      `,
    },
    // No arguments — nothing to check
    {
      code: `
        function Component() {
          const mutation = useMutation();
        }
      `,
    },
    // Non-object argument — can't statically check
    {
      code: `
        function Component() {
          const mutation = useMutation(options);
        }
      `,
    },
    // Not useMutation — different function
    {
      code: `
        function Component() {
          const result = useQuery({
            queryKey: ['tasks'],
            queryFn: fetchTasks,
          });
        }
      `,
    },
    // Both callbacks with spread (still has explicit onSuccess/onError)
    {
      code: `
        function Component() {
          const mutation = useMutation({
            ...baseOptions,
            mutationFn: createTask,
            onSuccess: handleSuccess,
            onError: handleError,
          });
        }
      `,
    },
  ],
  invalid: [
    // Missing both onSuccess and onError
    {
      code: `
        function Component() {
          const mutation = useMutation({
            mutationFn: (data) => apiClient.POST('/tasks', { body: data }),
          });
        }
      `,
      errors: [
        { messageId: 'missingOnSuccess' },
        { messageId: 'missingOnError' },
      ],
    },
    // Missing onError only
    {
      code: `
        function Component() {
          const mutation = useMutation({
            mutationFn: createTask,
            onSuccess: () => { toast.success('Done'); },
          });
        }
      `,
      errors: [{ messageId: 'missingOnError' }],
    },
    // Missing onSuccess only
    {
      code: `
        function Component() {
          const mutation = useMutation({
            mutationFn: createTask,
            onError: (err) => { toast.error(err.message); },
          });
        }
      `,
      errors: [{ messageId: 'missingOnSuccess' }],
    },
    // v4 pattern missing callbacks
    {
      code: `
        function Component() {
          const mutation = useMutation(createTask, {
            retry: 3,
          });
        }
      `,
      errors: [
        { messageId: 'missingOnSuccess' },
        { messageId: 'missingOnError' },
      ],
    },
    // Member expression missing callbacks
    {
      code: `
        function Component() {
          const mutation = trpc.tasks.create.useMutation({
            mutationFn: createTask,
          });
        }
      `,
      errors: [
        { messageId: 'missingOnSuccess' },
        { messageId: 'missingOnError' },
      ],
    },
    // Only mutationFn and other non-callback options
    {
      code: `
        function Component() {
          const mutation = useMutation({
            mutationFn: deleteTask,
            retry: 2,
            retryDelay: 1000,
          });
        }
      `,
      errors: [
        { messageId: 'missingOnSuccess' },
        { messageId: 'missingOnError' },
      ],
    },
    // Has onSettled but missing onSuccess and onError
    {
      code: `
        function Component() {
          const mutation = useMutation({
            mutationFn: createTask,
            onSettled: () => { queryClient.invalidateQueries(); },
          });
        }
      `,
      errors: [
        { messageId: 'missingOnSuccess' },
        { messageId: 'missingOnError' },
      ],
    },
    // Real-world pattern: mutation with only mutationFn in component
    {
      code: `
        function TaskForm() {
          const createTask = useMutation({
            mutationFn: async (data: TaskInput) => {
              const res = await apiClient.POST('/api/tasks', { body: data });
              return res.data;
            },
          });
          return <form onSubmit={() => createTask.mutate(formData)}>...</form>;
        }
      `,
      errors: [
        { messageId: 'missingOnSuccess' },
        { messageId: 'missingOnError' },
      ],
    },
  ],
});