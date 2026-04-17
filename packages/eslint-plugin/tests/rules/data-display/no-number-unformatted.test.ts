import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/data-display/no-number-unformatted';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-number-unformatted', rule, {
  valid: [
    // Formatted via method call
    { code: `<span>{product.price.toLocaleString()}</span>` },
    // Formatted via function call
    { code: `<span>{formatCurrency(item.amount)}</span>` },
    // Non-number property name
    { code: `<span>{item.name}</span>` },
    // Computed inside expression
    { code: `<span>{item.total + ' 元'}</span>` },
  ],
  invalid: [
    {
      code: `<span>{product.price}</span>`,
      errors: [{ messageId: 'numberUnformatted' }],
    },
    {
      code: `<span>{stats.count}</span>`,
      errors: [{ messageId: 'numberUnformatted' }],
    },
  ],
});
