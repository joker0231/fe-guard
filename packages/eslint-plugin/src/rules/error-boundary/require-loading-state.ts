import { createRule } from '../../utils/rule-helpers';
import { isAsyncFetchCall, isLoadingVariable, extractUseStatePair } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'require-loading-state',
  meta: {
    type: 'problem',
    docs: { description: 'Require loading state for async data fetching' },
    schema: [],
    messages: {
      missingLoadingState:
        "组件有异步数据获取但缺少loading状态处理。数据加载期间用户看到空白。请添加loading状态：1) `const [loading, setLoading] = useState(true)` + 条件渲染；2) 或使用 `useQuery` 的 `isLoading`；3) 或用 `<Suspense fallback={<Loading />}>` 包裹。",
    },
  },
  defaultOptions: [],
  create(context) {
    // Track state per function component scope
    const componentStack: Array<{
      hasAsyncFetch: boolean;
      hasLoadingState: boolean;
      node: TSESTree.Node;
    }> = [];

    function enterComponent(node: TSESTree.Node) {
      // Only track top-level function components (name starts with uppercase)
      let name: string | null = null;
      if (node.type === 'FunctionDeclaration' && node.id) {
        name = node.id.name;
      } else if (
        node.parent?.type === 'VariableDeclarator' &&
        node.parent.id.type === 'Identifier'
      ) {
        name = node.parent.id.name;
      }
      if (name && /^[A-Z]/.test(name)) {
        componentStack.push({ hasAsyncFetch: false, hasLoadingState: false, node });
      }
    }

    function exitComponent(node: TSESTree.Node) {
      if (componentStack.length === 0) return;
      const top = componentStack[componentStack.length - 1];
      // Check if this is the same node
      let matchNode = node;
      if (top.node === matchNode) {
        componentStack.pop();
        if (top.hasAsyncFetch && !top.hasLoadingState) {
          context.report({ node, messageId: 'missingLoadingState' });
        }
      }
    }

    return {
      'FunctionDeclaration'(node: TSESTree.FunctionDeclaration) { enterComponent(node); },
      'FunctionDeclaration:exit'(node: TSESTree.FunctionDeclaration) { exitComponent(node); },
      'ArrowFunctionExpression'(node: TSESTree.ArrowFunctionExpression) { enterComponent(node); },
      'ArrowFunctionExpression:exit'(node: TSESTree.ArrowFunctionExpression) { exitComponent(node); },
      'FunctionExpression'(node: TSESTree.FunctionExpression) { enterComponent(node); },
      'FunctionExpression:exit'(node: TSESTree.FunctionExpression) { exitComponent(node); },

      CallExpression(node: TSESTree.CallExpression) {
        if (componentStack.length === 0) return;
        const current = componentStack[componentStack.length - 1];

        // Check for async fetch calls
        if (isAsyncFetchCall(node)) {
          current.hasAsyncFetch = true;
        }

        // Check for useQuery/useSWR destructured loading
        if (
          node.callee.type === 'Identifier' &&
          (node.callee.name === 'useQuery' || node.callee.name === 'useSWR' || node.callee.name === 'useInfiniteQuery')
        ) {
          current.hasAsyncFetch = true;
          // Check if destructured with loading variable
          if (
            node.parent?.type === 'VariableDeclarator' &&
            node.parent.id.type === 'ObjectPattern'
          ) {
            for (const prop of node.parent.id.properties) {
              if (
                prop.type === 'Property' &&
                prop.key.type === 'Identifier' &&
                isLoadingVariable(prop.key.name)
              ) {
                current.hasLoadingState = true;
              }
            }
          }
        }
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (componentStack.length === 0) return;
        const current = componentStack[componentStack.length - 1];

        const pair = extractUseStatePair(node);
        if (pair && isLoadingVariable(pair.state)) {
          current.hasLoadingState = true;
        }
      },
    };
  },
});
