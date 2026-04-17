import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/extended/form-prevent-default';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('form-prevent-default', rule, {
  valid: [
    // Inline with preventDefault
    {
      code: `<form onSubmit={(e) => { e.preventDefault(); saveData(); }}>content</form>`,
    },
    // Using event parameter
    {
      code: `<form onSubmit={(event) => { event.preventDefault(); submit(); }}>content</form>`,
    },
    // No onSubmit at all
    {
      code: `<form>content</form>`,
    },
    // Not a form element
    {
      code: `<div onSubmit={() => {}}>content</div>`,
    },
    // Reference to function (can't check, should not report)
    {
      code: `<form onSubmit={handleSubmit}>content</form>`,
    },
  ],
  invalid: [
    {
      code: `<form onSubmit={(e) => { saveData(); }}>content</form>`,
      errors: [{ messageId: 'missingPreventDefault' }],
    },
    {
      code: `<form onSubmit={() => { fetch('/api'); }}>content</form>`,
      errors: [{ messageId: 'missingPreventDefault' }],
    },
    {
      code: `<form onSubmit={(e) => { doSomething(e); }}>content</form>`,
      errors: [{ messageId: 'missingPreventDefault' }],
    },
  ],
});
