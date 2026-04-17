import { createRule } from '../../utils/rule-helpers';
import { isAsyncFetchCall, isErrorVariable, extractUseStatePair } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'require-error-state',
  meta: {
    type: 'problem',
    docs: { description: 'Require error state for async data fetching' },
    schema: [],
    messages: {
      missingErrorState:
        "组件有异步数据获取但缺少错误状态处理。网络出错时用户看到空白或过期数据。请添加错误状态：1) `const [error, setError] = useState(null)` + `.catch(setError)` + 条件渲染；2) 或使用 `useQuery` 的 `error` 字段。",
    },
  },
  defaultOptions: [],
  create(context) {
    const componentStack: Array<{
      hasAsyncFetch: boolean;
      hasErrorState: boolean;
      node: TSESTree.Node;
    }> = [];

    function enterComponent(node: TSESTree.Node) {
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
        componentStack.push({ hasAsyncFetch: false, hasErrorState: false, node });
      }
    }

    function exitComponent(node: TSESTree.Node) {
      if (componentStack.length === 0) return;
      const top = componentStack[componentStack.length - 1];
      if (top.node === node) {
        componentStack.pop();
        if (top.hasAsyncFetch && !top.hasErrorState) {
          context.report({ node, messageId: 'missingErrorState' });
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

        if (isAsyncFetchCall(node)) {
          current.hasAsyncFetch = true;
        }

        if (
          node.callee.type === 'Identifier' &&
          (node.callee.name === 'useQuery' || node.callee.name === 'useSWR' || node.callee.name === 'useInfiniteQuery')
        ) {
          current.hasAsyncFetch = true;
          if (
            node.parent?.type === 'VariableDeclarator' &&
            node.parent.id.type === 'ObjectPattern'
          ) {
            for (const prop of node.parent.id.properties) {
              if (
                prop.type === 'Property' &&
                prop.key.type === 'Identifier' &&
                isErrorVariable(prop.key.name)
              ) {
                current.hasErrorState = true;
              }
            }
          }
        }
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (componentStack.length === 0) return;
        const current = componentStack[componentStack.length - 1];

        const pair = extractUseStatePair(node);
        if (pair && isErrorVariable(pair.state)) {
          current.hasErrorState = true;
        }
      },
    };
  },
});
