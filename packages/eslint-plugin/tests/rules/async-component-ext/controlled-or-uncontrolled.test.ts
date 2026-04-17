import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/async-component-ext/controlled-or-uncontrolled';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('controlled-or-uncontrolled', rule, {
  valid: [
    // Controlled with onChange
    {
      code: `<input value={name} onChange={e => setName(e.target.value)} />`,
    },
    // Uncontrolled with defaultValue only
    {
      code: `<input defaultValue="initial" />`,
    },
    // Controlled with readOnly
    {
      code: `<input value={name} readOnly />`,
    },
    // Custom component controlled with onChange
    {
      code: `<Select value={val} onChange={setVal} />`,
    },
    // Controlled with disabled
    {
      code: `<input value={name} disabled />`,
    },
    // Non-form element is ignored
    {
      code: `<div value={something} />`,
    },
  ],
  invalid: [
    // Mixed value and defaultValue
    {
      code: `<input value={name} defaultValue="initial" />`,
      errors: [
        { messageId: 'mixedMode' },
        { messageId: 'missingOnChange' },
      ],
    },
    // Controlled value without onChange
    {
      code: `<input value={name} />`,
      errors: [{ messageId: 'missingOnChange' }],
    },
    // Mixed checked and defaultChecked
    {
      code: `<Checkbox checked={val} defaultChecked={true} />`,
      errors: [
        { messageId: 'mixedMode' },
        { messageId: 'missingOnChange' },
      ],
    },
  ],
});
