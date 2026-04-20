/**
 * enforce-flat-routes
 * 
 * 禁止嵌套路由。所有路由必须挂载在 rootRoute 下，不允许使用嵌套子路由。
 * 如需共享布局，请使用共享组件包裹而非路由嵌套。
 * 
 * AI容易犯的错：使用文件名中的.表示嵌套关系（TanStack Router约定），
 * 但忘记在父路由组件中添加<Outlet/>导致子路由无法渲染。
 * 直接禁止嵌套路由，从根源消除问题。
 */

import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/joker0231/fe-guard/blob/main/docs/rules/${name}.md`,
);

type MessageIds = 'noNestedRoutes';

const ALLOWED_PARENT_NAMES = new Set([
  'rootRoute',
  'root',
  'Root',
  'RootRoute',
  'rootLayout',
  'RootLayout',
]);

export default createRule<[], MessageIds>({
  name: 'enforce-flat-routes',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow nested routes. All routes must be mounted on rootRoute.',
    },
    messages: {
      noNestedRoutes:
        'Nested routes are not allowed. All routes must use rootRoute as parent. Use shared layout components instead of route nesting.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    // Skip route-tree generated files
    const filename = context.filename || context.getFilename();
    if (
      filename.includes('route-tree') ||
      filename.includes('routeTree') ||
      filename.includes('.gen.')
    ) {
      return {};
    }

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Match createRoute(...) or createFileRoute(...)
        if (node.callee.type !== 'Identifier') return;
        if (
          node.callee.name !== 'createRoute' &&
          node.callee.name !== 'createFileRoute'
        ) {
          return;
        }

        // First argument should be an object
        const arg = node.arguments[0];
        if (!arg || arg.type !== 'ObjectExpression') return;

        // Find getParentRoute property
        const getParentRoute = arg.properties.find(
          (prop): prop is TSESTree.Property =>
            prop.type === 'Property' &&
            prop.key.type === 'Identifier' &&
            prop.key.name === 'getParentRoute',
        );

        if (!getParentRoute) return;

        // Check if the value is an arrow function / function expression
        const value = getParentRoute.value;
        let returnedIdentifier: string | null = null;

        if (
          value.type === 'ArrowFunctionExpression' &&
          value.body.type !== 'BlockStatement'
        ) {
          // () => xxx
          if (value.body.type === 'Identifier') {
            returnedIdentifier = value.body.name;
          }
        } else if (
          value.type === 'ArrowFunctionExpression' &&
          value.body.type === 'BlockStatement'
        ) {
          // () => { return xxx; }
          const returnStmt = value.body.body.find(
            (stmt): stmt is TSESTree.ReturnStatement =>
              stmt.type === 'ReturnStatement',
          );
          if (returnStmt?.argument?.type === 'Identifier') {
            returnedIdentifier = returnStmt.argument.name;
          }
        } else if (value.type === 'FunctionExpression') {
          const returnStmt = value.body.body.find(
            (stmt): stmt is TSESTree.ReturnStatement =>
              stmt.type === 'ReturnStatement',
          );
          if (returnStmt?.argument?.type === 'Identifier') {
            returnedIdentifier = returnStmt.argument.name;
          }
        }

        // If we can't determine the return value, skip (don't report)
        if (returnedIdentifier === null) return;

        // If parent is not rootRoute, report
        if (!ALLOWED_PARENT_NAMES.has(returnedIdentifier)) {
          context.report({
            node: getParentRoute,
            messageId: 'noNestedRoutes',
          });
        }
      },
    };
  },
});
