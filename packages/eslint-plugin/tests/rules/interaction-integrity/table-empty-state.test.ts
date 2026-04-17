import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/interaction-integrity/table-empty-state';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('table-empty-state', rule, {
  valid: [
    // Table with locale prop for empty text
    {
      code: '<Table dataSource={users} columns={cols} locale={{ emptyText: <Empty /> }} />',
    },
    // Table with emptyText prop
    {
      code: `<Table dataSource={users} columns={cols} emptyText="暂无数据" />`,
    },
    // Table wrapped in length check
    {
      code: '{users.length > 0 ? <Table dataSource={users} columns={cols} /> : <Empty />}',
    },
    // Table with static data (literal array) is not flagged
    {
      code: '<Table dataSource={[]} columns={cols} />',
    },
  ],
  invalid: [
    // Table with dynamic dataSource but no empty state
    {
      code: '<Table dataSource={users} columns={columns} />',
      errors: [{ messageId: 'missingEmpty' }],
    },
    // DataGrid with dynamic rows but no empty state
    {
      code: '<DataGrid rows={data} columns={columns} />',
      errors: [{ messageId: 'missingEmpty' }],
    },
  ],
});
