import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/security/require-password-input-type';

const tester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

tester.run('require-password-input-type', rule, {
  valid: [
    // Correct: password field with type="password"
    { code: `<input id="password" type="password" />` },
    { code: `<Input name="password" type="password" />` },
    { code: `<Input id="user-password" type="password" />` },
    { code: `<input name="confirmPwd" type="password" />` },
    // Not a password field — any type is fine
    { code: `<input id="email" type="text" />` },
    { code: `<Input name="username" type="text" />` },
    { code: `<input type="text" />` },
    // register('password') with correct type
    { code: `<Input type="password" {...form.register('password')} />` },
    { code: `<input type="password" {...register('password')} />` },
    // register non-password field
    { code: `<Input type="text" {...form.register('email')} />` },
    // Not input element
    { code: `<div id="password" type="text" />` },
    { code: `<textarea name="password" />` },
  ],
  invalid: [
    // Password id with type="text"
    {
      code: `<input id="password" type="text" />`,
      errors: [{ messageId: 'missingPasswordType' }],
    },
    // Password name with type="text"
    {
      code: `<Input name="password" type="text" />`,
      errors: [{ messageId: 'missingPasswordType' }],
    },
    // Password id with missing type
    {
      code: `<input id="password" />`,
      errors: [{ messageId: 'missingTypeAttribute' }],
    },
    // Password name with wrong type
    {
      code: `<Input name="user-passwd" type="email" />`,
      errors: [{ messageId: 'missingPasswordType' }],
    },
    // register('password') with type="text"
    {
      code: `<Input type="text" {...form.register('password')} />`,
      errors: [{ messageId: 'missingPasswordType' }],
    },
    // register('password') with missing type
    {
      code: `<Input {...form.register('password')} />`,
      errors: [{ messageId: 'missingTypeAttribute' }],
    },
    // register('confirmPwd') with type="text"
    {
      code: `<input type="text" {...register('confirmPwd')} />`,
      errors: [{ messageId: 'missingPasswordType' }],
    },
    // Partial match: "pwd" in name
    {
      code: `<input name="newPwd" type="text" />`,
      errors: [{ messageId: 'missingPasswordType' }],
    },
  ],
});