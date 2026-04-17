import { createRule } from '../../utils/rule-helpers';
import { getJSXElementName, findJSXAttribute, hasJSXAttribute } from '../../utils/jsx-helpers';
import { getStaticStringValue } from '../../utils/ast-helpers';

const PROTECTED_PATTERNS = [/^\/admin/i, /^\/dashboard/i, /^\/settings/i, /^\/account/i];
const AUTH_COMPONENTS = ['AuthGuard', 'ProtectedRoute', 'RequireAuth', 'PrivateRoute'];

export default createRule({
  name: 'require-auth-guard',
  meta: {
    type: 'problem',
    docs: { description: 'Require auth guard for protected routes' },
    schema: [],
    messages: {
      missingAuthGuard:
        "路由 '{{routePath}}' 看起来是受保护路由，但缺少鉴权守卫。请使用 `<AuthGuard>` 或 `<ProtectedRoute>` 包裹该路由，防止未登录用户访问。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = getJSXElementName(node);
        if (name !== 'Route') return;

        const pathAttr = findJSXAttribute(node, 'path');
        if (!pathAttr?.value) return;

        let pathValue: string | null = null;
        if (pathAttr.value.type === 'Literal' && typeof pathAttr.value.value === 'string') {
          pathValue = pathAttr.value.value;
        } else if (pathAttr.value.type === 'JSXExpressionContainer') {
          const expr = pathAttr.value.expression;
          if (expr.type === 'Literal' && typeof expr.value === 'string') {
            pathValue = expr.value;
          } else if (expr.type === 'TemplateLiteral' && expr.quasis.length > 0) {
            // Extract static prefix from template literal: `/admin/${id}` → `/admin/`
            pathValue = expr.quasis[0].value.cooked ?? null;
          }
        }
        if (!pathValue) return;

        const isProtected = PROTECTED_PATTERNS.some((p) => p.test(pathValue!));
        if (!isProtected) return;

        // Check if parent is an auth guard component
        let current = node.parent;
        while (current) {
          if (
            current.type === 'JSXElement' &&
            current.openingElement.name.type === 'JSXIdentifier' &&
            AUTH_COMPONENTS.includes(current.openingElement.name.name)
          ) {
            return; // Wrapped in auth guard
          }
          current = current.parent;
        }

        // Check if element prop contains auth guard
        const elementAttr = findJSXAttribute(node, 'element');
        if (elementAttr?.value?.type === 'JSXExpressionContainer') {
          const expr = elementAttr.value.expression;
          if (
            expr.type === 'JSXElement' &&
            expr.openingElement.name.type === 'JSXIdentifier' &&
            AUTH_COMPONENTS.includes(expr.openingElement.name.name)
          ) {
            return; // element wraps with auth guard
          }
        }

        // Check for errorElement (if route has its own error handling, also skip)
        if (hasJSXAttribute(node, 'errorElement')) return;

        context.report({
          node,
          messageId: 'missingAuthGuard',
          data: { routePath: pathValue },
        });
      },
    };
  },
});
