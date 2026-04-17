import { createRule } from '../../utils/rule-helpers';
import { hasTypeInfo } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'safe-optional-render',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require fallback for optional chaining in JSX rendering',
      requiresTypeChecking: true,
    },
    schema: [],
    messages: {
      missingFallback:
        "`{{expression}}` 使用可选链但缺少undefined的fallback处理。数据未加载时用户看到空白区域。请添加空数据的fallback UI：`{{expression}} ?? <Empty />`。",
    },
  },
  defaultOptions: [],
  create(context) {
    // Skip if no type info available
    if (!hasTypeInfo(context)) return {};

    return {
      JSXExpressionContainer(node) {
        const expr = node.expression;
        if (expr.type === 'JSXEmptyExpression') return;

        // Look for optional call expressions like obj?.list?.map(...)
        if (!containsOptionalChain(expr)) return;

        // Check if wrapped with fallback: ?? or || or ternary
        if (hasFallback(expr)) return;

        const exprText = context.sourceCode.getText(expr);
        context.report({
          node: expr,
          messageId: 'missingFallback',
          data: { expression: exprText },
        });
      },
    };
  },
});

function containsOptionalChain(node: TSESTree.Node): boolean {
  // Check for ?. call: obj?.map(...) or obj?.list?.map(...)
  if (node.type === 'ChainExpression') return true;

  if (node.type === 'CallExpression') {
    if (node.optional) return true;
    if (node.callee.type === 'MemberExpression' && containsOptionalChain(node.callee)) return true;
  }

  if (node.type === 'MemberExpression') {
    if (node.optional) return true;
    if (containsOptionalChain(node.object)) return true;
  }

  return false;
}

function hasFallback(node: TSESTree.Node): boolean {
  const parent = node.parent;
  if (!parent) return false;

  // Wrapped in LogicalExpression with ?? or ||
  if (
    parent.type === 'LogicalExpression' &&
    (parent.operator === '??' || parent.operator === '||') &&
    parent.left === node
  ) {
    return true;
  }

  // Wrapped in ConditionalExpression (ternary)
  if (parent.type === 'ConditionalExpression') {
    return true;
  }

  // Check grandparent for ?? wrapping
  if (parent.type === 'JSXExpressionContainer') return false;

  // The expression itself is a logical expression with ??
  if (
    node.type === 'LogicalExpression' &&
    (node.operator === '??' || node.operator === '||')
  ) {
    return true;
  }

  return false;
}
