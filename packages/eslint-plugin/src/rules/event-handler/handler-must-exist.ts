import { createRule } from '../../utils/rule-helpers';
import { isEventHandlerProp } from '../../utils/jsx-helpers';

export default createRule({
  name: 'handler-must-exist',
  meta: {
    type: 'problem',
    docs: { description: 'Ensure event handler references exist in scope' },
    schema: [],
    messages: {
      handlerNotFound:
        "事件处理函数 '{{handlerName}}' 在当前作用域中未定义。请在组件中声明该函数，或检查函数名拼写。",
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
        if (expr.type !== 'Identifier') return;

        const scope = context.sourceCode.getScope(node);
        let found = false;
        let currentScope: typeof scope | null = scope;
        while (currentScope) {
          for (const variable of currentScope.variables) {
            if (variable.name === expr.name) {
              found = true;
              break;
            }
          }
          if (found) break;
          currentScope = currentScope.upper;
        }

        if (!found) {
          context.report({
            node: expr,
            messageId: 'handlerNotFound',
            data: { handlerName: expr.name },
          });
        }
      },
    };
  },
});
