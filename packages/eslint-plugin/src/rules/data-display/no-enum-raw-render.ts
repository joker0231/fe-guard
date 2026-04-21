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
    function isEnumMemberExpression(node: TSESTree.Node): node is TSESTree.MemberExpression {
      return (
        node.type === 'MemberExpression' &&
        !node.computed &&
        node.property.type === 'Identifier' &&
        ENUM_KEYWORDS.has(node.property.name.toLowerCase())
      );
    }

    return {
      // Case 1: Direct enum field in JSX - e.g. {task.status}
      'JSXExpressionContainer > MemberExpression'(node: TSESTree.MemberExpression) {
        if (!isEnumMemberExpression(node)) return;

        const expression = context.sourceCode.getText(node);
        context.report({ node, messageId: 'enumRawRender', data: { expression } });
      },

      // Case 2: Enum field inside template literal in JSX
      // e.g. {`Status: ${task.status}`}
      'JSXExpressionContainer > TemplateLiteral'(node: TSESTree.TemplateLiteral) {
        for (const expr of node.expressions) {
          if (isEnumMemberExpression(expr)) {
            const expression = context.sourceCode.getText(expr);
            context.report({ node: expr, messageId: 'enumRawRender', data: { expression } });
          }
        }
      },

      // Case 3: String(task.status) wrapping in JSX
      // e.g. {String(task.status)}
      'JSXExpressionContainer > CallExpression'(node: TSESTree.CallExpression) {
        // String(task.status)
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'String' &&
          node.arguments.length === 1 &&
          isEnumMemberExpression(node.arguments[0])
        ) {
          const expression = context.sourceCode.getText(node.arguments[0]);
          context.report({ node, messageId: 'enumRawRender', data: { expression } });
          return;
        }

        // task.status.toString()
        if (
          node.callee.type === 'MemberExpression' &&
          !node.callee.computed &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'toString' &&
          isEnumMemberExpression(node.callee.object)
        ) {
          const expression = context.sourceCode.getText(node.callee.object);
          context.report({ node, messageId: 'enumRawRender', data: { expression } });
        }
      },
    };
  },
});
