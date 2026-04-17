import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/render-safety/no-object-in-jsx';

// Note: This rule requires type info. Without it, the rule returns {}.
// These tests run without type info, so they just verify no crashes.
const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-object-in-jsx', rule, {
  valid: [
    // Without type info, rule is a no-op
    { code: '<p>{user}</p>' },
    { code: '<p>{data.name}</p>' },
    { code: '<p>{"string"}</p>' },
  ],
  invalid: [],
});
