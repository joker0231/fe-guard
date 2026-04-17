import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/extended/safe-optional-render';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

// Note: This rule requires type info. Without type info, it should skip (return {}).
// These tests run without type info, so all cases should pass (rule is inactive).
// We test the parsing/export is correct.

ruleTester.run('safe-optional-render', rule, {
  valid: [
    // Rule skips without type info - all valid
    { code: `<ul>{data?.items?.map(item => <li key={item.id}>{item.name}</li>)}</ul>` },
    { code: `<div>{value ?? <Empty />}</div>` },
    { code: `<div>{list?.length ? list.map(x => <span key={x}>{x}</span>) : null}</div>` },
  ],
  invalid: [
    // Without type info, rule is inactive - no invalid cases
  ],
});
