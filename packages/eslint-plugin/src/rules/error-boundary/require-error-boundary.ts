import { createRule } from '../../utils/rule-helpers';
import { getJSXElementName, findJSXAttribute, hasJSXAttribute } from '../../utils/jsx-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const ERROR_BOUNDARY_NAMES = ['ErrorBoundary', 'GuardErrorBoundary'];

function isWrappedByErrorBoundary(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (
      current.type === 'JSXElement' &&
      current.openingElement.name.type === 'JSXIdentifier' &&
      ERROR_BOUNDARY_NAMES.includes(current.openingElement.name.name)
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

export default createRule({
  name: 'require-error-boundary',
  meta: {
    type: 'problem',
    docs: { description: 'Require ErrorBoundary for route components' },
    schema: [],
    messages: {
      missingErrorBoundary:
        "路由组件缺少 ErrorBoundary 保护。组件render出错时会导致整个应用白屏。请添加 `errorElement={<ErrorPage />}` 或用 `<ErrorBoundary>` 包裹。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = getJSXElementName(node);
        if (name !== 'Route') return;

        // Has errorElement prop — OK
        if (hasJSXAttribute(node, 'errorElement')) return;

        // No element prop — not a leaf route, skip
        if (!hasJSXAttribute(node, 'element')) return;

        // Check if wrapped by ErrorBoundary ancestor
        if (isWrappedByErrorBoundary(node)) return;

        // Check if element prop value itself is wrapped in ErrorBoundary
        const elementAttr = findJSXAttribute(node, 'element');
        if (elementAttr?.value?.type === 'JSXExpressionContainer') {
          const expr = elementAttr.value.expression;
          if (
            expr.type === 'JSXElement' &&
            expr.openingElement.name.type === 'JSXIdentifier' &&
            ERROR_BOUNDARY_NAMES.includes(expr.openingElement.name.name)
          ) {
            return;
          }
        }

        context.report({
          node,
          messageId: 'missingErrorBoundary',
        });
      },
    };
  },
});
