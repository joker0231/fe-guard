import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireFormValidation } from '../../../src/rules/api-safety/require-form-validation';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
      ecmaVersion: 2020,
      sourceType: 'module',
    },
  },
});

ruleTester.run('require-form-validation', requireFormValidation, {
  valid: [
    // React Hook Form: handleSubmit pattern
    {
      code: `
        function RegisterForm() {
          const { handleSubmit } = useForm();
          return <form onSubmit={handleSubmit(onSubmit)}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
    },
    // React Hook Form: form.handleSubmit pattern
    {
      code: `
        function RegisterForm() {
          const form = useForm();
          return <form onSubmit={form.handleSubmit(onSubmit)}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
    },
    // Inline arrow with validateForm call
    {
      code: `
        function RegisterForm() {
          return <form onSubmit={(e) => {
            e.preventDefault();
            const result = validateForm(schema, formData);
            if (result.success) {
              submitData(result.data);
            }
          }}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
    },
    // Inline arrow with schema.safeParse
    {
      code: `
        function RegisterForm() {
          return <form onSubmit={(e) => {
            e.preventDefault();
            const result = schema.safeParse(formData);
            if (result.success) {
              api.register(result.data);
            }
          }}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
    },
    // Inline arrow with schema.parse (throws on failure)
    {
      code: `
        function RegisterForm() {
          return <form onSubmit={(e) => {
            e.preventDefault();
            const data = schema.parse(formData);
            api.register(data);
          }}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
    },
    // Function reference with validateForm in body
    {
      code: `
        function RegisterForm() {
          const handleRegister = (e) => {
            e.preventDefault();
            const result = validateForm(registerSchema, { email, password });
            if (!result.success) return;
            api.register(result.data);
          };
          return <form onSubmit={handleRegister}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
    },
    // Function declaration with safeParse
    {
      code: `
        function RegisterForm() {
          function handleRegister(e) {
            e.preventDefault();
            const result = registerSchema.safeParse({ email, password });
            if (!result.success) return;
            api.register(result.data);
          }
          return <form onSubmit={handleRegister}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
    },
    // Validation inside try-catch
    {
      code: `
        function RegisterForm() {
          return <form onSubmit={(e) => {
            e.preventDefault();
            try {
              const data = schema.parse(formData);
              api.register(data);
            } catch (err) {
              setError(err.message);
            }
          }}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
    },
    // Validation inside if-statement
    {
      code: `
        function RegisterForm() {
          return <form onSubmit={(e) => {
            e.preventDefault();
            if (validateForm(schema, data).success) {
              api.register(data);
            }
          }}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
    },
    // form.trigger() - React Hook Form manual trigger
    {
      code: `
        function RegisterForm() {
          return <form onSubmit={async (e) => {
            e.preventDefault();
            const valid = await form.trigger();
            if (valid) submitData();
          }}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
    },
    // Imported handler function - can't resolve, should not report
    {
      code: `
        import { handleRegister } from './handlers';
        function RegisterForm() {
          return <form onSubmit={handleRegister}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
    },
    // Object method - can't analyze, should not report
    {
      code: `
        function RegisterForm() {
          return <form onSubmit={formHandlers.onRegister}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
    },
  ],
  invalid: [
    // Inline arrow with NO validation - direct API call
    {
      code: `
        function RegisterForm() {
          return <form onSubmit={(e) => {
            e.preventDefault();
            api.register({ email, password });
          }}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
      errors: [{ messageId: 'missingFormValidation' }],
    },
    // Inline arrow with NO validation - direct fetch
    {
      code: `
        function RegisterForm() {
          return <form onSubmit={async (e) => {
            e.preventDefault();
            await apiClient.post('/register', { email, password });
          }}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
      errors: [{ messageId: 'missingFormValidation' }],
    },
    // Function reference with NO validation
    {
      code: `
        function RegisterForm() {
          const handleRegister = (e) => {
            e.preventDefault();
            api.register({ email, password });
          };
          return <form onSubmit={handleRegister}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
      errors: [{ messageId: 'missingFormValidation' }],
    },
    // Function declaration with NO validation
    {
      code: `
        function RegisterForm() {
          function handleRegister(e) {
            e.preventDefault();
            api.register({ email, password });
          }
          return <form onSubmit={handleRegister}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
      errors: [{ messageId: 'missingFormValidation' }],
    },
    // Inline arrow with only console.log, no validation
    {
      code: `
        function RegisterForm() {
          return <form onSubmit={(e) => {
            e.preventDefault();
            console.log('submitting');
            mutate({ email, password });
          }}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
      errors: [{ messageId: 'missingFormValidation' }],
    },
    // Async function with await but no validation
    {
      code: `
        function RegisterForm() {
          const handleRegister = async (e) => {
            e.preventDefault();
            const result = await registerMutation.mutateAsync({ email, password });
            navigate('/dashboard');
          };
          return <form onSubmit={handleRegister}>
            <button type="submit">Submit</button>
          </form>;
        }
      `,
      errors: [{ messageId: 'missingFormValidation' }],
    },
  ],
});