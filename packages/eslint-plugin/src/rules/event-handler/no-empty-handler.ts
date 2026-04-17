import { createRule } from '../../utils/rule-helpers';
import { isEventHandlerProp } from '../../utils/jsx-helpers';

export default createRule({
  name: 'no-empty-handler',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow empty event handler functions in JSX' },
    schema: [],
    messages: {
      emptyHandler:
        "'{{eventName}}' 事件处理函数为空，用户交互将无任何响应。请实现事件处理逻辑，或移除该事件绑定。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXAttribute(node) {
        if (
          node.name.type !== 'JSXIdentifier' ||
          !isEventHandlerProp(node.name.name)
        ) return;

        const value = node.value;
        if (!value || value.type !== 'JSXExpressionContainer') return;

        const expr = value.expression;
        if (
          (expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression') &&
          expr.body.type === 'BlockStatement' &&
          expr.body.body.length === 0
        ) {
          context.report({
            node: expr,
            messageId: 'emptyHandler',
            data: { eventName: node.name.name },
          });
        }
      },
    };
  },
});
