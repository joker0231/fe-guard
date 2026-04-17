import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const DATE_EXACT = new Set([
  'createdAt', 'updatedAt', 'deletedAt', 'startDate', 'endDate',
  'publishDate', 'dueDate', 'deadline', 'birthday', 'birthDate',
  'expireAt', 'timestamp',
]);

const DATE_SUFFIX = /(At|Date|Time)$/;

export default createRule({
  name: 'no-date-raw-render',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow rendering date fields without formatting' },
    schema: [],
    messages: {
      dateRawRender: "日期字段 '{{expression}}' 直接渲染会显示 ISO 字符串或时间戳，用户无法阅读。请使用 dayjs().format()、toLocaleString() 等格式化后再渲染。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      'JSXExpressionContainer > MemberExpression'(node: TSESTree.MemberExpression) {
        if (node.computed) return;
        if (node.property.type !== 'Identifier') return;
        const name = node.property.name;
        if (!DATE_EXACT.has(name) && !DATE_SUFFIX.test(name)) return;

        const expression = context.sourceCode.getText(node);
        context.report({ node, messageId: 'dateRawRender', data: { expression } });
      },
    };
  },
});
