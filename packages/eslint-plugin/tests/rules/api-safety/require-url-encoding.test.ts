import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/api-safety/require-url-encoding';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-url-encoding', rule, {
  valid: [
    // Properly encoded
    {
      code: 'apiClient.GET(`/api/search?q=${encodeURIComponent(query)}&limit=10`)',
    },
    // No query params — just path interpolation
    {
      code: 'apiClient.GET(`/api/users/${userId}`)',
    },
    // Not in URL context
    {
      code: 'const msg = `Hello ${name}?`;',
    },
    // Literal values don't need encoding
    {
      code: 'apiClient.GET(`/api/search?q=${encodeURIComponent(term)}&limit=${50}`)',
    },
    // encodeURI also valid
    {
      code: 'fetch(`/api/search?q=${encodeURI(query)}`)',
    },
    // No expression in query param position
    {
      code: 'apiClient.GET(`/api/search?limit=10`)',
    },
  ],
  invalid: [
    // Basic unencoded query param
    {
      code: 'apiClient.GET(`/api/search?q=${query}&limit=50`)',
      errors: [{ messageId: 'missingEncoding', data: { varName: 'query' } }],
    },
    // Multiple unencoded params
    {
      code: 'apiClient.GET(`/api/search?q=${term}&tag=${tag}`)',
      errors: [
        { messageId: 'missingEncoding', data: { varName: 'term' } },
        { messageId: 'missingEncoding', data: { varName: 'tag' } },
      ],
    },
    // fetch() context
    {
      code: 'fetch(`/api/search?q=${searchTerm}`)',
      errors: [{ messageId: 'missingEncoding', data: { varName: 'searchTerm' } }],
    },
    // Member expression in query param
    {
      code: 'apiClient.GET(`/api/search?q=${input.value}`)',
      errors: [{ messageId: 'missingEncoding', data: { varName: 'input.value' } }],
    },
    // Method call result (not encodeURIComponent)
    {
      code: 'apiClient.GET(`/api/search?q=${query.trim()}`)',
      errors: [{ messageId: 'missingEncoding', data: { varName: 'query.trim()' } }],
    },
    // JSX href attribute
    {
      code: '<a href={`/search?q=${query}`}>Search</a>',
      errors: [{ messageId: 'missingEncoding', data: { varName: 'query' } }],
    },
    // axios context
    {
      code: 'axios.get(`/api/data?filter=${filterValue}`)',
      errors: [{ messageId: 'missingEncoding', data: { varName: 'filterValue' } }],
    },
  ],
});
