import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const TARGET_EVENTS = new Set(['onClick', 'onSubmit', 'onChange', 'onInput', 'onScroll', 'onResize']);

function containsFetchCall(node: TSESTree.Node): boolean {
  if (node.type === 'CallExpression') {
    if (node.callee.type === 'Identifier' && node.callee.name === 'fetch') return true;
    if (node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier' && node.callee.object.name === 'axios') return true;
    if (node.callee.type === 'Identifier' && /^(request|query|mutate|save|update|create|post|get|put|patch)$/i.test(node.callee.name)) return true;
  }
  if (node.type === 'AwaitExpression') return containsFetchCall(node.argument);
  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration') return false;
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item && containsFetchCall(item as TSESTree.Node)) return true;
        }
      } else if ('type' in child && containsFetchCall(child as TSESTree.Node)) return true;
    }
  }
  return false;
}

const LOADING_PATTERN = /^(loading|submitting|disabled|isLoading|isSubmitting|pending)$/i;

function hasLoadingGuard(body: TSESTree.BlockStatement): boolean {
  for (const stmt of body.body) {
    if (stmt.type !== 'IfStatement') continue;
    const test = stmt.test;
    const cons = stmt.consequent;
    const isReturn = cons.type === 'ReturnStatement' || (cons.type === 'BlockStatement' && cons.body.length === 1 && cons.body[0].type === 'ReturnStatement');
    if (!isReturn) continue;
    if (test.type === 'Identifier' && LOADING_PATTERN.test(test.name)) return true;
  }
  return false;
}

export default createRule({
  name: 'require-debounce-throttle',
  meta: {
    type: 'problem',
    docs: { description: 'Require debounce/throttle for event handlers calling APIs' },
    schema: [],
    messages: {
      missingProtection: "事件处理器 '{{handlerName}}' 直接调用异步请求，缺少防抖/节流保护。快速重复触发会发送大量重复请求。请使用 debounce/throttle 包裹或添加 loading 状态守卫。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (!TARGET_EVENTS.has(node.name.name)) return;
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return;

        const expr = node.value.expression;
        // Skip non-inline handlers (likely already wrapped in debounce)
        if (expr.type !== 'ArrowFunctionExpression' && expr.type !== 'FunctionExpression') return;

        if (expr.body.type === 'BlockStatement' && hasLoadingGuard(expr.body)) return;
        if (!containsFetchCall(expr.body)) return;

        context.report({ node, messageId: 'missingProtection', data: { handlerName: node.name.name } });
      },
    };
  },
});
