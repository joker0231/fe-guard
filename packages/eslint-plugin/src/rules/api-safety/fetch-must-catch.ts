import { createRule } from '../../utils/rule-helpers';
import { isInsideTryCatch, hasCatchChain } from '../../utils/ast-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

function isFetchOrAxios(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (callee.type === 'Identifier' && callee.name === 'fetch') return true;
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'axios'
  ) return true;
  return false;
}

export default createRule({
  name: 'fetch-must-catch',
  meta: {
    type: 'problem',
    docs: { description: 'Require error handling for fetch/axios calls' },
    schema: [],
    messages: {
      missingCatch:
        "'{{callExpression}}' 缺少错误处理。网络请求失败时会产生未捕获的Promise rejection。请用 `try-catch` 包裹 `await` 调用，或添加 `.catch()` 链。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (!isFetchOrAxios(node)) return;

        // Check if in try-catch
        if (isInsideTryCatch(node)) return;

        // Check if has .catch() chain
        if (hasCatchChain(node)) return;

        // Check if the parent chain has .then().catch()
        let current: TSESTree.Node = node;
        while (current.parent) {
          if (
            current.parent.type === 'MemberExpression' &&
            current.parent.parent?.type === 'CallExpression'
          ) {
            const memberProp = current.parent.property;
            if (memberProp.type === 'Identifier' && memberProp.name === 'catch') {
              return;
            }
            if (memberProp.type === 'Identifier' && memberProp.name === 'then') {
              // Continue walking to see if there's a .catch after .then
              current = current.parent.parent;
              continue;
            }
          }
          break;
        }

        // Check if awaited (the await itself should be in try-catch)
        if (node.parent?.type === 'AwaitExpression') {
          if (isInsideTryCatch(node.parent)) return;
        }

        const callText = node.callee.type === 'Identifier'
          ? node.callee.name
          : context.sourceCode.getText(node.callee);

        context.report({
          node,
          messageId: 'missingCatch',
          data: { callExpression: callText },
        });
      },
    };
  },
});
