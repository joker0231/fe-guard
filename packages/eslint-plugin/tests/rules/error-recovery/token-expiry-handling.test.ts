import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/error-recovery/token-expiry-handling';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('token-expiry-handling', rule, {
  valid: [
    // Has 401 handling in interceptor
    {
      code: `
        axios.interceptors.response.use(
          response => response,
          error => {
            if (error.response?.status === 401) {
              logout();
            }
            return Promise.reject(error);
          }
        );
      `,
    },
    // No interceptor at all (nothing to check)
    {
      code: `
        const data = await axios.get('/api/data');
      `,
    },
    // Has 401 in success handler
    {
      code: `
        axios.interceptors.response.use(
          response => {
            if (response.status === 401) {
              redirect('/login');
            }
            return response;
          },
          error => Promise.reject(error)
        );
      `,
    },
    // Switch case with 401
    {
      code: `
        axios.interceptors.response.use(
          response => response,
          error => {
            switch (error.response?.status) {
              case 401:
                logout();
                break;
            }
            return Promise.reject(error);
          }
        );
      `,
    },
  ],
  invalid: [
    // Interceptor without 401 handling
    {
      code: `
        axios.interceptors.response.use(
          response => response,
          error => Promise.reject(error)
        );
      `,
      errors: [{ messageId: 'missing401' }],
    },
    // Interceptor with other status codes but no 401
    {
      code: `
        axios.interceptors.response.use(
          response => response,
          error => {
            if (error.response?.status === 500) {
              showError('Server error');
            }
            return Promise.reject(error);
          }
        );
      `,
      errors: [{ messageId: 'missing401' }],
    },
  ],
});
