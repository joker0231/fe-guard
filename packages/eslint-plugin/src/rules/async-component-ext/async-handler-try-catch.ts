import { createRule } from '../../utils/rule-helpers';
import { isEventHandlerProp } from '../../utils/jsx-helpers';
import { isInsideTryCatch } from '../../utils/ast-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

function collectAwaits(node: TSESTree.Node, result: TSESTree.AwaitExpression[]): void {
  if (node.type === 'AwaitExpression') result.push(node);
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') return;
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) collectAwaits(item as TSESTree.Node, result);
        }
      } else if ('type' in child) {
        collectAwaits(child as TSESTree.Node, result);
      }
    }
  }
}

export default createRule({
  name: 'async-handler-try-catch',
  meta: {
    type: 'problem',
    docs: { description: 'Require try-catch around await in async event handlers' },
    schema: [],
    messages: {
      missingTryCatch: "事件处理器 '{{handlerName}}' 是异步函数且包含 await，但缺少 try-catch 包裹。请求失败时会静默失败，用户无法得到反馈。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier' || !isEventHandlerProp(node.name.name)) return;
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return;

        const expr = node.value.expression;
        if (expr.type !== 'ArrowFunctionExpression' && expr.type !== 'FunctionExpression') return;
        if (!expr.async) return;
        if (expr.body.type !== 'BlockStatement') return;

        const awaits: TSESTree.AwaitExpression[] = [];
        for (const stmt of expr.body.body) { collectAwaits(stmt, awaits); }
        if (awaits.length === 0) return;

        if (awaits.some((aw) => !isInsideTryCatch(aw))) {
          context.report({ node, messageId: 'missingTryCatch', data: { handlerName: node.name.name } });
        }
      },
    };
  },
});
