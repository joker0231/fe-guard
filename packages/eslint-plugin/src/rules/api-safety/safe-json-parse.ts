import { createRule } from '../../utils/rule-helpers';
import { isInsideTryCatch } from '../../utils/ast-helpers';

export default createRule({
  name: 'safe-json-parse',
  meta: {
    type: 'problem',
    docs: { description: 'Require try-catch around JSON.parse()' },
    schema: [],
    messages: {
      unsafeJsonParse:
        "`JSON.parse()` 未被 `try-catch` 包裹。输入非法JSON字符串时会直接抛出异常导致崩溃。请用 `try { JSON.parse(...) } catch { /* fallback */ }` 处理解析错误。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.object.type !== 'Identifier' ||
          node.callee.object.name !== 'JSON' ||
          node.callee.property.type !== 'Identifier' ||
          node.callee.property.name !== 'parse'
        ) return;

        if (!isInsideTryCatch(node)) {
          context.report({ node, messageId: 'unsafeJsonParse' });
        }
      },
    };
  },
});
