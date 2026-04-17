import { createRule } from '../../utils/rule-helpers';
import { getTypeServices, isObjectType, getNodeType } from '../../utils/type-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'no-object-in-jsx',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent rendering objects directly in JSX' },
    schema: [],
    messages: {
      objectInJsx:
        "'{{expression}}' 类型为 `{{typeName}}`，直接渲染对象会显示 `[object Object]`。请渲染对象的具体属性，或使用 `.map()` 将数组转为JSX列表。",
    },
  },
  defaultOptions: [],
  create(context) {
    const services = getTypeServices(context);
    if (!services) return {};

    return {
      JSXExpressionContainer(node: TSESTree.JSXExpressionContainer) {
        const expr = node.expression;
        if (expr.type === 'JSXEmptyExpression') return;

        // Skip common patterns that produce JSX or strings
        if (expr.type === 'CallExpression') return; // function calls might return JSX
        if (expr.type === 'ConditionalExpression') return;
        if (expr.type === 'LogicalExpression') return;
        if (expr.type === 'TemplateLiteral') return;
        if (expr.type === 'Literal') return;
        if (expr.type === 'JSXElement' || expr.type === 'JSXFragment') return;

        // Only check identifiers and member expressions
        if (expr.type !== 'Identifier' && expr.type !== 'MemberExpression') return;

        // Check it's a direct text child (parent is JSX element)
        const parent = node.parent;
        if (parent?.type !== 'JSXElement' && parent?.type !== 'JSXFragment') return;

        const type = getNodeType(expr, services);
        const checker = services.program.getTypeChecker();

        if (isObjectType(type, checker)) {
          const typeName = checker.typeToString(type);
          const exprText = context.sourceCode.getText(expr);
          const data = {
            expression: exprText.length > 40 ? exprText.slice(0, 37) + '...' : exprText,
            typeName: typeName.length > 30 ? typeName.slice(0, 27) + '...' : typeName,
          };
          context.report({
            node: expr,
            messageId: 'objectInJsx',
            data,
          });
        }
      },
    };
  },
});
