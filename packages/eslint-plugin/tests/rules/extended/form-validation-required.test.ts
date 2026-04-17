import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/extended/form-validation-required';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('form-validation-required', rule, {
  valid: [
    // Has validation guard (if-return)
    {
      code: `
        <form onSubmit={(e) => {
          e.preventDefault();
          if (!email) { setError('Required'); return; }
          fetch('/api/submit');
        }}>
          <input name="email" />
          <button type="submit">Submit</button>
        </form>
      `,
    },
    // Using handleSubmit from react-hook-form
    {
      code: `<form onSubmit={handleSubmit(onSubmit)}><button type="submit">Go</button></form>`,
    },
    // HTML5 required attribute
    {
      code: `
        <form onSubmit={(e) => { e.preventDefault(); fetch('/api'); }}>
          <input required />
          <button type="submit">Go</button>
        </form>
      `,
    },
    // No onSubmit
    {
      code: `<form><input /></form>`,
    },
  ],
  invalid: [
    {
      code: `
        <form onSubmit={(e) => { e.preventDefault(); fetch('/api/submit', { body }); }}>
          <input name="email" />
          <button type="submit">Submit</button>
        </form>
      `,
      errors: [{ messageId: 'missingValidation' }],
    },
    {
      code: `
        <form onSubmit={(e) => {
          e.preventDefault();
          saveData(formValues);
        }}>
          <input />
          <button>Go</button>
        </form>
      `,
      errors: [{ messageId: 'missingValidation' }],
    },
  ],
});
