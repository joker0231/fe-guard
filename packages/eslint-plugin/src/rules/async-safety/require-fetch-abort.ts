import { createRule } from '../../utils/rule-helpers';
import { isUseEffect } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

/**
 * Network request function/method patterns.
 * Matches direct calls (fetch, axios) and member calls (apiClient.GET, httpClient.post).
 */
const FETCH_PATTERNS = new Set([
  'fetch',
  'axios',
]);

const FETCH_MEMBER_OBJECT_PATTERNS = new Set([
  'apiclient',
  'httpclient',
  'http',
  'api',
  'axios',
  'request',
  'client',
]);

const FETCH_MEMBER_METHOD_PATTERNS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'request',
  'fetch',
]);

/**
 * Check if a call expression is a network request.
 */
function isFetchCall(node: TSESTree.CallExpression): boolean {
  const { callee } = node;

  // Direct call: fetch(), axios()
  if (callee.type === 'Identifier') {
    return FETCH_PATTERNS.has(callee.name.toLowerCase());
  }

  // Member call: apiClient.GET(), httpClient.post(), axios.get()
  if (callee.type === 'MemberExpression') {
    const objName = callee.object.type === 'Identifier' ? callee.object.name.toLowerCase() : '';
    const propName = callee.property.type === 'Identifier' ? callee.property.name.toLowerCase() : '';
    return FETCH_MEMBER_OBJECT_PATTERNS.has(objName) && FETCH_MEMBER_METHOD_PATTERNS.has(propName);
  }

  return false;
}

/**
 * Walk AST nodes, entering one level of nested functions (for async IIFE pattern in useEffect).
 * Does NOT enter functions defined as callbacks to other calls.
 */
function walkEffectBody(
  node: TSESTree.Node,
  cb: (n: TSESTree.Node) => void,
  depth: number = 0,
): void {
  cb(node);

  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            const t = (item as TSESTree.Node).type;
            // Enter one level of nested functions (async IIFE pattern)
            if (
              t === 'ArrowFunctionExpression' ||
              t === 'FunctionExpression' ||
              t === 'FunctionDeclaration'
            ) {
              if (depth < 1) {
                walkEffectBody(item as TSESTree.Node, cb, depth + 1);
              }
              continue;
            }
            walkEffectBody(item as TSESTree.Node, cb, depth);
          }
        }
      } else if ('type' in child) {
        const t = (child as TSESTree.Node).type;
        if (
          t === 'ArrowFunctionExpression' ||
          t === 'FunctionExpression' ||
          t === 'FunctionDeclaration'
        ) {
          if (depth < 1) {
            walkEffectBody(child as TSESTree.Node, cb, depth + 1);
          }
          continue;
        }
        walkEffectBody(child as TSESTree.Node, cb, depth);
      }
    }
  }
}

/**
 * Check if the useEffect callback body contains an AbortController creation.
 */
function hasAbortController(body: TSESTree.BlockStatement): boolean {
  let found = false;
  walkEffectBody(body, (n) => {
    if (found) return;
    if (
      n.type === 'NewExpression' &&
      n.callee.type === 'Identifier' &&
      n.callee.name === 'AbortController'
    ) {
      found = true;
    }
  });
  return found;
}

/**
 * Check if the useEffect callback has a cleanup return function.
 */
function hasCleanupReturn(body: TSESTree.BlockStatement): boolean {
  for (const stmt of body.body) {
    if (
      stmt.type === 'ReturnStatement' &&
      stmt.argument &&
      (stmt.argument.type === 'ArrowFunctionExpression' ||
        stmt.argument.type === 'FunctionExpression')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Find fetch calls in useEffect callback body (including one level of nested async functions).
 */
function findFetchCalls(body: TSESTree.BlockStatement): TSESTree.CallExpression[] {
  const results: TSESTree.CallExpression[] = [];
  walkEffectBody(body, (n) => {
    if (n.type === 'CallExpression' && isFetchCall(n)) {
      results.push(n);
    }
    // Also check await expressions: await fetch(), await apiClient.GET()
    if (
      n.type === 'AwaitExpression' &&
      n.argument.type === 'CallExpression' &&
      isFetchCall(n.argument)
    ) {
      results.push(n.argument);
    }
  });
  return results;
}

export default createRule({
  name: 'require-fetch-abort',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require AbortController for fetch calls inside useEffect to prevent race conditions and memory leaks.',
    },
    schema: [],
    messages: {
      missingAbortController:
        'useEffect 中有网络请求但没有使用 AbortController。当组件卸载或依赖变化时，旧请求仍会继续执行，可能导致竞态条件和内存泄漏。请创建 AbortController 并在 cleanup 函数中调用 abort()。',
      missingCleanupWithAbort:
        'useEffect 中创建了 AbortController 但没有 cleanup 函数。请添加 return () => controller.abort() 以取消未完成的请求。',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isUseEffect(node)) return;

        const callback = node.arguments[0];
        if (!callback) return;
        if (
          callback.type !== 'ArrowFunctionExpression' &&
          callback.type !== 'FunctionExpression'
        ) {
          return;
        }
        if (callback.body.type !== 'BlockStatement') return;

        const body = callback.body;
        const fetchCalls = findFetchCalls(body);
        if (fetchCalls.length === 0) return;

        const hasAbort = hasAbortController(body);
        const hasCleanup = hasCleanupReturn(body);

        if (!hasAbort) {
          // No AbortController at all — report on the useEffect call
          context.report({
            node,
            messageId: 'missingAbortController',
          });
        } else if (!hasCleanup) {
          // Has AbortController but no cleanup return
          context.report({
            node,
            messageId: 'missingCleanupWithAbort',
          });
        }
      },
    };
  },
});