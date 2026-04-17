import { createRule, hasTypeInfo } from '../../utils/rule-helpers';
import { getTypeServices, isNumberType, isStringType, getNodeType } from '../../utils/type-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'no-falsy-render',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent falsy values (0, "") from being rendered in JSX' },
    schema: [],
    messages: {
      falsyRender:
        "'{{expression}}' 中 '{{variable}}' 可能为 `0`、`\"\"`、`NaN`，这些falsy值会被React直接渲染到页面上。请使用 `!!{{variable}} && ...` 或 `{{variable}} > 0 && ...`。",
    },
  },
  defaultOptions: [],
  create(context) {
    const services = getTypeServices(context);

    return {
      'JSXExpressionContainer > LogicalExpression[operator="&&"]'(
        node: TSESTree.LogicalExpression,
      ) {
        // Right side should be JSX
        if (
          node.right.type !== 'JSXElement' &&
          node.right.type !== 'JSXFragment'
        ) return;

        const left = node.left;

        // If we have type info, check type precisely
        if (services) {
          const type = getNodeType(left, services);
          const checker = services.program.getTypeChecker();
          if (isNumberType(type, checker) || isStringType(type, checker)) {
            const variable = context.sourceCode.getText(left);
            const data = {
              expression: context.sourceCode.getText(node).slice(0, 50),
              variable: variable.length > 30 ? variable.slice(0, 27) + '...' : variable,
            };
            context.report({
              node,
              messageId: 'falsyRender',
              data,
            });
          }
          return;
        }

        // Without type info: heuristic check for count/length/size/index/num patterns
        if (left.type === 'Identifier' && /^(count|length|size|index|num|total|amount|qty|quantity|page|offset|limit)/i.test(left.name)) {
          const variable = left.name;
          const data = {
            expression: context.sourceCode.getText(node).slice(0, 50),
            variable,
          };
          context.report({
            node,
            messageId: 'falsyRender',
            data,
          });
        }
        if (left.type === 'MemberExpression' && left.property.type === 'Identifier' && /^(count|length|size|total|amount)/i.test(left.property.name)) {
          const variable = context.sourceCode.getText(left);
          const data = {
            expression: context.sourceCode.getText(node).slice(0, 50),
            variable: variable.length > 30 ? variable.slice(0, 27) + '...' : variable,
          };
          context.report({
            node,
            messageId: 'falsyRender',
            data,
          });
        }
      },
    };
  },
});
