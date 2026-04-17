import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const NUMBER_KEYWORDS = new Set([
  'price', 'amount', 'total', 'count', 'balance', 'salary',
  'cost', 'fee', 'revenue', 'profit', 'quantity', 'score',
  'rate', 'percentage', 'discount',
]);

export default createRule({
  name: 'no-number-unformatted',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow rendering number fields without formatting' },
    schema: [],
    messages: {
      numberUnformatted: "数值字段 '{{expression}}' 直接渲染缺少格式化。大数字缺少千分位、金额缺少货币符号和小数。请使用 .toLocaleString() 或格式化函数处理。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      'JSXExpressionContainer > MemberExpression'(node: TSESTree.MemberExpression) {
        if (node.computed) return;
        if (node.property.type !== 'Identifier') return;
        if (!NUMBER_KEYWORDS.has(node.property.name.toLowerCase())) return;

        const expression = context.sourceCode.getText(node);
        context.report({ node, messageId: 'numberUnformatted', data: { expression } });
      },
    };
  },
});
