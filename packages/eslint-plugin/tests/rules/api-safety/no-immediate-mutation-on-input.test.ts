import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/api-safety/no-immediate-mutation-on-input';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-immediate-mutation-on-input', rule, {
  valid: [
    // Using debounced function
    {
      code: '<input onChange={(e) => debouncedUpdate(e.target.value)} />',
    },
    // Using throttled function
    {
      code: '<input onChange={(e) => throttledSave(e.target.value)} />',
    },
    // Debounced reference
    {
      code: '<input onChange={debouncedHandler} />',
    },
    // onBlur with API call (not onChange)
    {
      code: '<input onBlur={(e) => api.patch("/tasks", { title: e.target.value })} />',
    },
    // onChange without API call
    {
      code: '<input onChange={(e) => setTitle(e.target.value)} />',
    },
    // onChange with local state only
    {
      code: '<input onChange={(e) => { setFormData({ ...form, title: e.target.value }); }} />',
    },
    // Handler reference to non-mutation function (can't find body outside component, skip)
    {
      code: '<input onChange={handleTitleChange} />',
    },
    // Debounced call inside block
    {
      code: '<input onChange={(e) => { debouncedUpdate(e.target.value); }} />',
    },
    // Handler reference inside component — function does NOT have mutation
    {
      code: `
        function MyComponent() {
          const handleChange = (e) => {
            setTitle(e.target.value);
          };
          return <input onChange={handleChange} />;
        }
      `,
    },
    // Handler reference inside component — function calls debounced
    {
      code: `
        function MyComponent() {
          const handleChange = (e) => {
            debouncedUpdate(e.target.value);
          };
          return <input onChange={handleChange} />;
        }
      `,
    },
    // useMutation but handler uses debounce wrapper
    {
      code: `
        function MyComponent() {
          const updateTitle = useMutation({ mutationFn: (v) => api.patch(v) });
          const handleChange = (e) => {
            debouncedMutate(e.target.value);
          };
          return <input onChange={handleChange} />;
        }
      `,
    },
  ],
  invalid: [
    // Direct fetch in onChange
    {
      code: '<input onChange={(e) => { fetch("/api/update", { method: "PATCH", body: e.target.value }); }} />',
      errors: [{ messageId: 'immediateMutation' }],
    },
    // Direct api.patch in onChange
    {
      code: '<input onChange={(e) => { api.patch("/tasks", { title: e.target.value }); }} />',
      errors: [{ messageId: 'immediateMutation' }],
    },
    // Direct mutate in onChange
    {
      code: '<input onChange={(e) => { mutate({ title: e.target.value }); }} />',
      errors: [{ messageId: 'immediateMutation' }],
    },
    // httpClient.put in onChange
    {
      code: '<input onChange={(e) => { httpClient.put("/tasks/1", { title: e.target.value }); }} />',
      errors: [{ messageId: 'immediateMutation' }],
    },
    // Arrow shorthand with api call
    {
      code: '<input onChange={(e) => api.patch("/tasks", { title: e.target.value })} />',
      errors: [{ messageId: 'immediateMutation' }],
    },
    // mutation.mutate in onChange
    {
      code: '<input onChange={(e) => { mutation.mutate({ title: e.target.value }); }} />',
      errors: [{ messageId: 'immediateMutation' }],
    },
    // ReturnStatement with mutation
    {
      code: '<input onChange={(e) => { return fetch("/api/update", { body: e.target.value }); }} />',
      errors: [{ messageId: 'immediateMutation' }],
    },
    // if-wrapped mutation (one level deep)
    {
      code: '<input onChange={(e) => { if (e.target.value) { api.patch("/tasks", { title: e.target.value }); } }} />',
      errors: [{ messageId: 'immediateMutation' }],
    },
    // property.name matching (client.fetch)
    {
      code: '<input onChange={(e) => { client.fetch("/api/update", { body: e.target.value }); }} />',
      errors: [{ messageId: 'immediateMutation' }],
    },
    // onInput with API call
    {
      code: '<input onInput={(e) => { fetch("/api/update", { body: e.target.value }); }} />',
      errors: [{ messageId: 'immediateMutation' }],
    },
    // ★ NEW: Handler reference inside component — function calls useMutation.mutate()
    {
      code: `
        function MyComponent() {
          const updateTitle = useMutation({ mutationFn: (v) => api.patch(v) });
          const handleTitleChange = (e) => {
            updateTitle.mutate(e.target.value);
          };
          return <input onChange={handleTitleChange} />;
        }
      `,
      errors: [{ messageId: 'immediateMutation' }],
    },
    // ★ NEW: Handler reference — useMutation.mutateAsync()
    {
      code: `
        function MyComponent() {
          const updateTask = useMutation({ mutationFn: (v) => api.patch(v) });
          const handleChange = async (e) => {
            await updateTask.mutateAsync(e.target.value);
          };
          return <input onChange={handleChange} />;
        }
      `,
      errors: [{ messageId: 'immediateMutation' }],
    },
    // ★ NEW: Inline arrow with useMutation.mutate()
    {
      code: `
        function MyComponent() {
          const updateTitle = useMutation({ mutationFn: (v) => api.patch(v) });
          return <input onChange={(e) => { updateTitle.mutate(e.target.value); }} />;
        }
      `,
      errors: [{ messageId: 'immediateMutation' }],
    },
    // ★ NEW: Arrow shorthand with useMutation.mutate()
    {
      code: `
        function MyComponent() {
          const updateTitle = useMutation({ mutationFn: (v) => api.patch(v) });
          return <input onChange={(e) => updateTitle.mutate(e.target.value)} />;
        }
      `,
      errors: [{ messageId: 'immediateMutation' }],
    },
    // ★ NEW: useCallback wrapped handler with useMutation.mutate()
    {
      code: `
        function MyComponent() {
          const updateTitle = useMutation({ mutationFn: (v) => api.patch(v) });
          const handleChange = useCallback((e) => {
            updateTitle.mutate(e.target.value);
          }, [updateTitle]);
          return <input onChange={handleChange} />;
        }
      `,
      errors: [{ messageId: 'immediateMutation' }],
    },
    // ★ NEW: function declaration handler with useMutation.mutate()
    {
      code: `
        function MyComponent() {
          const updateTitle = useMutation({ mutationFn: (v) => api.patch(v) });
          function handleChange(e) {
            updateTitle.mutate(e.target.value);
          }
          return <input onChange={handleChange} />;
        }
      `,
      errors: [{ messageId: 'immediateMutation' }],
    },
  ],
});