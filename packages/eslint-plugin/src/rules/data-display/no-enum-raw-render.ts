import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const ENUM_KEYWORDS = new Set([
  'status', 'type', 'level', 'state', 'role', 'category',
  'kind', 'mode', 'priority', 'gender', 'grade', 'phase',
]);

export default createRule({
  name: 'no-enum-raw-render',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow rendering enum fields without mapping to readable text' },
    schema: [],
    messages: {
      enumRawRender: "枚举字段 '{{expression}}' 直接渲染会显示原始值（如数字或编码），用户无法理解。请使用映射对象或格式化函数转换为可读文本：statusMap[{{expression}}] 或 getLabel({{expression}})。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      // Case 1: Direct enum field in JSX - e.g. {task.status}
      'JSXExpressionContainer > MemberExpression'(node: TSESTree.MemberExpression) {
        if (node.computed) return;
        if (node.property.type !== 'Identifier') return;
        if (!ENUM_KEYWORDS.has(node.property.name.toLowerCase())) return;

        const expression = context.sourceCode.getText(node);
        context.report({ node, messageId: 'enumRawRender', data: { expression } });
      },

      // Case 2: Enum field inside template literal in JSX
      // e.g. {`Status: ${task.status}`}
      'JSXExpressionContainer > TemplateLiteral'(node: TSESTree.TemplateLiteral) {
        for (const expr of node.expressions) {
          if (
            expr.type === 'MemberExpression' &&
            !expr.computed &&
            expr.property.type === 'Identifier' &&
            ENUM_KEYWORDS.has(expr.property.name.toLowerCase())
          ) {
            const expression = context.sourceCode.getText(expr);
            context.report({ node: expr, messageId: 'enumRawRender', data: { expression } });
          }
        }
      },
    };
  },
});
