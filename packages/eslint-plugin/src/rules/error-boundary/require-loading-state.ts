import { createRule } from '../../utils/rule-helpers';
import { isAsyncFetchCall, isLoadingVariable, extractUseStatePair } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

// Patterns that indicate a ref is being used for loading state
const LOADING_REF_PATTERNS = /loading|isLoading|isFetching|isPending|submitting|isSubmitting/i;

// Known loading fields from popular hooks
const HOOK_LOADING_FIELDS = new Set([
  'isPending', 'isLoading', 'isFetching', 'isRefetching', 'status',
]);

// Known data-fetching hooks
const DATA_FETCH_HOOKS = new Set([
  'useQuery', 'useSWR', 'useInfiniteQuery', 'useMutation',
]);

export default createRule({
  name: 'require-loading-state',
  meta: {
    type: 'problem',
    docs: { description: 'Require loading state for async data fetching' },
    schema: [],
    messages: {
      missingLoadingState:
        "组件有异步数据获取但缺少loading状态处理。数据加载期间用户看到空白。请添加loading状态：1) `const [loading, setLoading] = useState(true)` + 条件渲染；2) 或使用 `useQuery` 的 `isLoading`；3) 或用 `<Suspense fallback={<Loading />}>` 包裹。",
      missingHookLoadingField:
        "使用了 {{hookName}} 但未解构其内置 loading 状态字段（如 isPending/isLoading）。请直接从 hook 解构中获取 loading 状态，而非自行用 useState 管理。",
      useRefForLoading:
        "使用 useRef 管理 loading 状态（'{{refName}}'）不会触发组件重渲染，用户看不到 loading 状态变化。请改用 useState 或使用 useQuery/useMutation 的内置 isPending。",
    },
  },
  defaultOptions: [],
  create(context) {
    // Track state per function component scope
    const componentStack: Array<{
      hasAsyncFetch: boolean;
      hasLoadingState: boolean;
      // Track hook-specific loading: hook was destructured but loading field missing
      hookFetchWithoutLoading: string | null; // hook name, or null
      // Track useRef for loading anti-pattern
      loadingRefName: string | null;
      loadingRefNode: TSESTree.Node | null;
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
        componentStack.push({
          hasAsyncFetch: false,
          hasLoadingState: false,
          hookFetchWithoutLoading: null,
          loadingRefName: null,
          loadingRefNode: null,
          node,
        });
      }
    }

    function exitComponent(node: TSESTree.Node) {
      if (componentStack.length === 0) return;
      const top = componentStack[componentStack.length - 1];
      if (top.node === node) {
        componentStack.pop();

        // Priority 0: useRef for loading anti-pattern — always report if detected
        if (top.loadingRefName && top.loadingRefNode) {
          context.report({
            node: top.loadingRefNode,
            messageId: 'useRefForLoading',
            data: { refName: top.loadingRefName },
          });
        }

        // Priority 1: Hook was used but loading field not destructured
        if (top.hookFetchWithoutLoading) {
          context.report({
            node,
            messageId: 'missingHookLoadingField',
            data: { hookName: top.hookFetchWithoutLoading },
          });
        }
        // Priority 2: General async fetch without any loading state
        else if (top.hasAsyncFetch && !top.hasLoadingState) {
          context.report({ node, messageId: 'missingLoadingState' });
        }
      }

    }

    function checkHookDestructuring(
      node: TSESTree.CallExpression,
      hookName: string,
      current: { hasAsyncFetch: boolean; hasLoadingState: boolean; hookFetchWithoutLoading: string | null },
    ) {
      current.hasAsyncFetch = true;

      if (
        node.parent?.type === 'VariableDeclarator' &&
        node.parent.id.type === 'ObjectPattern'
      ) {
        let hasLoadingField = false;
        for (const prop of node.parent.id.properties) {
          if (
            prop.type === 'Property' &&
            prop.key.type === 'Identifier'
          ) {
            // Check original key name (before renaming via : alias)
            if (HOOK_LOADING_FIELDS.has(prop.key.name)) {
              hasLoadingField = true;
              current.hasLoadingState = true;
            }
          }
        }
        // Hook was destructured but loading field was NOT included
        if (!hasLoadingField) {
          current.hookFetchWithoutLoading = hookName;
        }
      }
      // Whole assignment: const mutation = useMutation(...)
      // We still mark hasAsyncFetch, rely on useState fallback for now
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

        // Check for async fetch calls (generic: fetch, axios, etc.)
        if (isAsyncFetchCall(node)) {
          current.hasAsyncFetch = true;
        }

        // Check for data-fetching hooks
        if (
          node.callee.type === 'Identifier' &&
          DATA_FETCH_HOOKS.has(node.callee.name)
        ) {
          checkHookDestructuring(node, node.callee.name, current);
        }
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (componentStack.length === 0) return;
        const current = componentStack[componentStack.length - 1];

        // useState loading detection — only counts if no hook loading requirement
        const pair = extractUseStatePair(node);
        if (pair && isLoadingVariable(pair.state)) {
          current.hasLoadingState = true;
        }

        // useRef loading anti-pattern detection
        // e.g. const loadingRef = useRef(false)
        if (
          node.id.type === 'Identifier' &&
          LOADING_REF_PATTERNS.test(node.id.name) &&
          node.init?.type === 'CallExpression' &&
          node.init.callee.type === 'Identifier' &&
          node.init.callee.name === 'useRef'
        ) {
          current.loadingRefName = node.id.name;
          current.loadingRefNode = node;
        }
      },

    };
  },
});