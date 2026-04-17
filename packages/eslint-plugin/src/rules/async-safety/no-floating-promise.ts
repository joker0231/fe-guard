import { createRule } from '../../utils/rule-helpers';
import { getTypeServices, isPromiseType, getNodeType } from '../../utils/type-helpers';
import { isPromiseHandled } from '../../utils/ast-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'no-floating-promise',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow floating (unhandled) Promises' },
    schema: [],
    messages: {
      floatingPromise:
        "'{{expression}}' 返回Promise但未处理。请添加 `await`、`.then()/.catch()`，或使用 `void` 显式忽略。",
    },
  },
  defaultOptions: [],
  create(context) {
    const services = getTypeServices(context);
    if (!services) return {};

    return {
      ExpressionStatement(node: TSESTree.ExpressionStatement) {
        const expr = node.expression;
        if (expr.type !== 'CallExpression') return;

        // Skip if already handled
        if (isPromiseHandled(expr)) return;

        const type = getNodeType(expr, services);
        const checker = services.program.getTypeChecker();

        if (isPromiseType(type, checker)) {
          const calleeText = context.sourceCode.getText(expr.callee);
          const data = {
            expression: calleeText.length > 40 ? calleeText.slice(0, 37) + '...' : calleeText,
          };
          context.report({
            node: expr,
            messageId: 'floatingPromise',
            data,
          });
        }
      },
    };
  },
});
