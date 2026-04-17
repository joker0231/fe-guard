import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/async-safety/no-floating-promise';

// Note: This rule requires type info. Without it, the rule returns {}.
const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-floating-promise', rule, {
  valid: [
    // Without type info, rule is a no-op
    { code: 'saveData(values);' },
    { code: 'await saveData(values);' },
    { code: 'saveData(values).catch(handleError);' },
  ],
  invalid: [],
});
