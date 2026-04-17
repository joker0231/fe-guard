import { createRule } from '../../utils/rule-helpers';
import { isUseEffect } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const FETCH_CALLS = new Set(['fetch']);

function isAxiosCall(node: TSESTree.CallExpression): boolean {
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'axios'
  ) {
    return true;
  }
  return false;
}

function isFetchCall(node: TSESTree.CallExpression): boolean {
  if (node.callee.type === 'Identifier' && FETCH_CALLS.has(node.callee.name)) {
    return true;
  }
  return isAxiosCall(node);
}

export default createRule({
  name: 'no-stale-request',
  meta: {
    type: 'suggestion',
    docs: { description: 'Require AbortController for fetch calls in useEffect' },
    schema: [],
    messages: {
      missingAbort:
        "useEffect中的 `fetch` 调用缺少取消机制。快速切换时旧请求可能覆盖新数据。请使用AbortController：创建 `new AbortController()`，传入 `{ signal }`，在cleanup中 `abort()`。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (!isUseEffect(node)) return;
        if (node.arguments.length < 2) return; // Must have deps array (otherwise runs once)

        const depsArg = node.arguments[1];
        if (depsArg.type !== 'ArrayExpression' || depsArg.elements.length === 0) return;

        const callback = node.arguments[0];
        if (
          callback.type !== 'ArrowFunctionExpression' &&
          callback.type !== 'FunctionExpression'
        ) return;

        const body = callback.body;
        if (body.type !== 'BlockStatement') return;

        // Check if body contains fetch/axios calls
        const hasFetch = containsFetchCall(body);
        if (!hasFetch) return;

        // Check if body has AbortController
        const hasAbortController = containsAbortController(body);
        if (hasAbortController) return;

        // Check if cleanup function calls abort
        const hasCleanupAbort = hasAbortInCleanup(body);
        if (hasCleanupAbort) return;

        context.report({
          node,
          messageId: 'missingAbort',
        });
      },
    };
  },
});

function containsFetchCall(node: TSESTree.Node): boolean {
  if (node.type === 'CallExpression' && isFetchCall(node)) return true;

  const children = getChildNodes(node);
  return children.some(child => containsFetchCall(child));
}

function containsAbortController(node: TSESTree.Node): boolean {
  if (
    node.type === 'NewExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'AbortController'
  ) {
    return true;
  }

  const children = getChildNodes(node);
  return children.some(child => containsAbortController(child));
}

function hasAbortInCleanup(body: TSESTree.BlockStatement): boolean {
  // Look for return statement that returns a function calling .abort()
  for (const stmt of body.body) {
    if (stmt.type === 'ReturnStatement' && stmt.argument) {
      if (
        stmt.argument.type === 'ArrowFunctionExpression' ||
        stmt.argument.type === 'FunctionExpression'
      ) {
        return containsAbortCall(stmt.argument.body);
      }
    }
  }
  return false;
}

function containsAbortCall(node: TSESTree.Node): boolean {
  if (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'abort'
  ) {
    return true;
  }

  const children = getChildNodes(node);
  return children.some(child => containsAbortCall(child));
}

function getChildNodes(node: TSESTree.Node): TSESTree.Node[] {
  const children: TSESTree.Node[] = [];
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const value = (node as any)[key];
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item.type === 'string') {
            children.push(item);
          }
        }
      } else if (typeof value.type === 'string') {
        children.push(value);
      }
    }
  }
  return children;
}
