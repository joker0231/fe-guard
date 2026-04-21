import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

// API client objects whose method calls represent network requests
const API_CLIENT_OBJECTS = new Set([
  'apiClient', 'httpClient', 'http', 'api',
]);

const API_CLIENT_METHODS = new Set([
  'get', 'post', 'put', 'patch', 'delete', 'head', 'options',
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS',
  'request',
]);

// Standalone fetch calls
const FETCH_CALLEE_NAMES = new Set(['fetch', 'axios']);

// Query/mutation hooks whose callback args are allowed to contain API calls
const QUERY_MUTATION_HOOKS = new Set([
  'useQuery', 'useMutation', 'useInfiniteQuery', 'useSuspenseQuery',
  'useSuspenseInfiniteQuery', 'usePrefetchQuery',
]);

// Property names inside query/mutation options that contain the actual API call
const ALLOWED_CALLBACK_PROPS = new Set([
  'queryFn', 'mutationFn', 'initialPageParam', 'getNextPageParam',
  'getPreviousPageParam', 'prefetchFn',
]);

export default createRule({
  name: 'require-query-mutation-for-requests',
  meta: {
    type: 'problem',
    docs: {
      description: '组件内的 API 请求必须通过 useQuery/useMutation 等 hook 包装',
    },
    messages: {
      directApiCall:
        '组件内直接调用 `{{callText}}` 会导致手动管理 loading/error 状态。请使用 useMutation（写操作）或 useQuery（读操作）包装 API 请求，它们自动管理 isPending、error、数据缓存和请求取消。',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function isApiCall(node: TSESTree.CallExpression): string | null {
      const callee = node.callee;
      // fetch(...) or axios(...)
      if (callee.type === AST_NODE_TYPES.Identifier && FETCH_CALLEE_NAMES.has(callee.name)) {
        return callee.name;
      }
      // apiClient.GET(...) / httpClient.post(...)
      if (
        callee.type === AST_NODE_TYPES.MemberExpression &&
        callee.object.type === AST_NODE_TYPES.Identifier &&
        API_CLIENT_OBJECTS.has(callee.object.name) &&
        callee.property.type === AST_NODE_TYPES.Identifier &&
        API_CLIENT_METHODS.has(callee.property.name)
      ) {
        return `${callee.object.name}.${callee.property.name}`;
      }
      return null;
    }

    function isInsideQueryMutationCallback(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        // Check if current node is a function that is the value of queryFn/mutationFn
        if (
          current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          current.type === AST_NODE_TYPES.FunctionExpression
        ) {
          const parent = current.parent;
          // Property in object: { queryFn: () => ... }
          if (
            parent &&
            parent.type === AST_NODE_TYPES.Property &&
            parent.value === current &&
            parent.key.type === AST_NODE_TYPES.Identifier &&
            ALLOWED_CALLBACK_PROPS.has(parent.key.name)
          ) {
            // Check that the object is argument to useQuery/useMutation
            const obj = parent.parent; // ObjectExpression
            if (obj && obj.type === AST_NODE_TYPES.ObjectExpression) {
              const callExpr = obj.parent; // CallExpression
              if (callExpr && callExpr.type === AST_NODE_TYPES.CallExpression) {
                const hookCallee = callExpr.callee;
                if (
                  hookCallee.type === AST_NODE_TYPES.Identifier &&
                  QUERY_MUTATION_HOOKS.has(hookCallee.name)
                ) {
                  return true;
                }
              }
            }
          }
        }
        current = current.parent;
      }
      return false;
    }

    function isInsideComponentFunction(node: TSESTree.Node): boolean {
      let current: TSESTree.Node | undefined = node.parent;
      while (current) {
        // Function declaration: function MyComponent() { ... }
        if (
          current.type === AST_NODE_TYPES.FunctionDeclaration &&
          current.id &&
          /^[A-Z]/.test(current.id.name)
        ) {
          return true;
        }
        // Arrow function or function expression assigned to PascalCase variable
        // const MyComponent = () => { ... }
        if (
          (current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
           current.type === AST_NODE_TYPES.FunctionExpression) &&
          current.parent
        ) {
          const parent = current.parent;
          if (
            parent.type === AST_NODE_TYPES.VariableDeclarator &&
            parent.id.type === AST_NODE_TYPES.Identifier &&
            /^[A-Z]/.test(parent.id.name)
          ) {
            return true;
          }
        }
        // export default function() with PascalCase filename — heuristic
        // For now, just check named functions
        current = current.parent;
      }
      return false;
    }

    return {
      CallExpression(node) {
        const callText = isApiCall(node);
        if (!callText) return;

        // Only check inside component functions
        if (!isInsideComponentFunction(node)) return;

        // Allow if inside useQuery/useMutation callback
        if (isInsideQueryMutationCallback(node)) return;

        context.report({
          node,
          messageId: 'directApiCall',
          data: { callText },
        });
      },
    };
  },
});
