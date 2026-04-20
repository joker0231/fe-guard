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
    // Handler reference (can't analyze, skip)
    {
      code: '<input onChange={handleTitleChange} />',
    },
    // Debounced call inside block
    {
      code: '<input onChange={(e) => { debouncedUpdate(e.target.value); }} />',
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
  ],
});