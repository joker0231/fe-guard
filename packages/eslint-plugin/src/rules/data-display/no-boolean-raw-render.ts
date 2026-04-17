import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const BOOL_PREFIX = /^(is|has|can)[A-Z]/;
const BOOL_EXACT = new Set([
  'enabled', 'disabled', 'active', 'visible', 'deleted',
  'verified', 'locked', 'checked', 'selected', 'required',
]);

export default createRule({
  name: 'no-boolean-raw-render',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow rendering boolean fields as "true"/"false" strings' },
    schema: [],
    messages: {
      booleanRawRender: "布尔字段 '{{expression}}' 直接渲染会显示 \"true\"/\"false\" 文本。请使用条件表达式转换为可读内容：{{expression}} ? '是' : '否' 或 {{expression}} && <Icon />。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      'JSXExpressionContainer > MemberExpression'(node: TSESTree.MemberExpression) {
        if (node.computed) return;
        if (node.property.type !== 'Identifier') return;
        const name = node.property.name;
        if (!BOOL_PREFIX.test(name) && !BOOL_EXACT.has(name)) return;

        const expression = context.sourceCode.getText(node);
        context.report({ node, messageId: 'booleanRawRender', data: { expression } });
      },
    };
  },
});
