import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/data-display/no-date-raw-render';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-date-raw-render', rule, {
  valid: [
    // Formatted via dayjs
    { code: `<span>{dayjs(article.createdAt).format('YYYY-MM-DD')}</span>` },
    // Formatted via function call
    { code: `<td>{formatDate(order.updatedAt)}</td>` },
    // Non-date property name
    { code: `<span>{item.name}</span>` },
    // Date used in conditional
    { code: `<span>{item.createdAt ? item.createdAt : '-'}</span>` },
  ],
  invalid: [
    {
      code: `<span>{article.createdAt}</span>`,
      errors: [{ messageId: 'dateRawRender' }],
    },
    {
      code: `<td>{order.updatedAt}</td>`,
      errors: [{ messageId: 'dateRawRender' }],
    },
    {
      code: `<span>{event.startDate}</span>`,
      errors: [{ messageId: 'dateRawRender' }],
    },
  ],
});
