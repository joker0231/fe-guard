import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'conditional-render-complete',
  meta: {
    type: 'problem',
    docs: { description: 'Require complete conditional rendering with both branches' },
    schema: [],
    messages: {
      incompleteBranch:
        "条件渲染 '{{condition}}' 只有truthy分支，条件为false时用户看到空白。请添加else分支：使用三元表达式 `condition ? <A /> : <B />`。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXExpressionContainer(node: TSESTree.JSXExpressionContainer) {
        const expr = node.expression;
        if (expr.type !== 'LogicalExpression' || expr.operator !== '&&') return;

        // Right side must be JSX
        const right = expr.right;
        if (
          right.type !== 'JSXElement' &&
          right.type !== 'JSXFragment'
        ) return;

        // Check if there's a complementary condition in siblings
        const parent = node.parent;
        if (parent?.type === 'JSXElement' || parent?.type === 'JSXFragment') {
          const siblings = parent.children;
          const leftSource = context.sourceCode.getText(expr.left);

          for (const sibling of siblings) {
            if (sibling === node) continue;
            if (sibling.type === 'JSXExpressionContainer') {
              const sibExpr = sibling.expression;
              if (sibExpr.type === 'LogicalExpression' && sibExpr.operator === '&&') {
                const sibLeft = sibExpr.left;
                const sibLeftSource = context.sourceCode.getText(sibLeft);
                // Check for negation: !condition <-> condition
                if (
                  sibLeft.type === 'UnaryExpression' &&
                  sibLeft.operator === '!' &&
                  context.sourceCode.getText(sibLeft.argument) === leftSource
                ) {
                  return; // Has complementary branch
                }
                // Check reverse: current is !X, sibling is X
                if (
                  expr.left.type === 'UnaryExpression' &&
                  expr.left.operator === '!' &&
                  context.sourceCode.getText(expr.left.argument) === sibLeftSource
                ) {
                  return; // Has complementary branch
                }
              }
            }
          }
        }

        // Skip only temporary UI state variables (loading/modal/tooltip/visibility)
        const left = expr.left;
        if (left.type === 'Identifier' && /^(isLoading|isSubmitting|isFetching|isOpen|showModal|showDialog|showTooltip|isVisible|isExpanded|isCollapsed)/i.test(left.name)) {
          return;
        }

        const conditionText = context.sourceCode.getText(expr.left);
        context.report({
          node: expr,
          messageId: 'incompleteBranch',
          data: { condition: conditionText.length > 40 ? conditionText.slice(0, 37) + '...' : conditionText },
        });
      },
    };
  },
});
