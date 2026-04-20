import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

function getArrayName(node: TSESTree.CallExpression): string | null {
  if (node.callee.type !== 'MemberExpression') return null;
  const obj = node.callee.object;
  if (obj.type === 'Identifier') return obj.name;
  if (obj.type === 'MemberExpression' && obj.property.type === 'Identifier') {
    return obj.property.name;
  }
  return null;
}

function isMapCall(node: TSESTree.Node): node is TSESTree.CallExpression {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'map'
  );
}

/**
 * Check if the .map() call is wrapped in a ternary (ConditionalExpression).
 * Ternary means there IS an else branch (empty state UI).
 */
function isInTernary(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (current.type === 'ConditionalExpression') return true;
    if (current.type === 'JSXExpressionContainer') break;
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'ArrowFunctionExpression' ||
      current.type === 'FunctionExpression'
    ) break;
    current = current.parent;
  }
  return false;
}

/**
 * Check if the .map() has a sibling empty-state element in the same JSX parent.
 * Pattern:
 *   {arr.length === 0 && <EmptyState />}
 *   {arr.map(...)}
 */
function hasSiblingEmptyState(node: TSESTree.Node, arrayName: string): boolean {
  // Walk up to find the JSXExpressionContainer
  let container: TSESTree.Node | undefined = node;
  while (container && container.type !== 'JSXExpressionContainer') {
    container = container.parent;
  }
  if (!container || !container.parent) return false;

  // Get siblings in the JSX parent
  const parent = container.parent;
  let children: TSESTree.Node[] = [];
  if (parent.type === 'JSXElement') {
    children = parent.children;
  } else if (parent.type === 'JSXFragment') {
    children = parent.children;
  } else {
    return false;
  }

  // Look for a sibling that checks arrayName.length === 0
  for (const child of children) {
    if (child === container) continue;
    if (child.type !== 'JSXExpressionContainer') continue;
    const expr = child.expression;
    if (expr.type === 'LogicalExpression' && expr.operator === '&&') {
      // Check if left side is a zero-length check for the same array
      if (isZeroLengthCheck(expr.left, arrayName)) return true;
    }
    if (expr.type === 'ConditionalExpression') {
      if (isZeroLengthCheck(expr.test, arrayName)) return true;
    }
  }
  return false;
}

function isZeroLengthCheck(node: TSESTree.Node, arrayName: string): boolean {
  // arr.length === 0 or arr.length == 0 or !arr.length
  if (node.type === 'BinaryExpression') {
    if (node.operator === '===' || node.operator === '==') {
      if (isLengthAccess(node.left, arrayName) && isZeroLiteral(node.right)) return true;
      if (isLengthAccess(node.right, arrayName) && isZeroLiteral(node.left)) return true;
    }
  }
  if (node.type === 'UnaryExpression' && node.operator === '!') {
    if (isLengthAccess(node.argument, arrayName)) return true;
  }
  return false;
}

function isLengthAccess(node: TSESTree.Node, arrayName: string): boolean {
  if (
    node.type === 'MemberExpression' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'length'
  ) {
    if (node.object.type === 'Identifier' && node.object.name === arrayName) return true;
  }
  return false;
}

function isZeroLiteral(node: TSESTree.Node): boolean {
  return node.type === 'Literal' && node.value === 0;
}

export default createRule({
  name: 'require-empty-state',
  meta: {
    type: 'problem',
    docs: { description: 'Require empty state handling for list rendering' },
    schema: [],
    messages: {
      missingEmptyState:
        "列表 '{{listVariable}}.map(...)' 缺少空数据状态处理。数组为空时用户看到空白区域。请添加空态判断：`{{listVariable}}.length === 0 ? <Empty /> : {{listVariable}}.map(...)`。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      // Case 1: Direct .map() in JSX without any wrapping
      // e.g. {arr.map(...)}
      'JSXExpressionContainer > CallExpression'(node: TSESTree.CallExpression) {
        if (!isMapCall(node)) return;
        const arrayName = getArrayName(node);
        if (!arrayName) return;

        // If there's a sibling empty state, it's fine
        if (hasSiblingEmptyState(node, arrayName)) return;

        context.report({
          node,
          messageId: 'missingEmptyState',
          data: { listVariable: arrayName },
        });
      },

      // Case 2: .map() inside && pattern
      // e.g. {arr.length > 0 && arr.map(...)}
      // This has NO empty state branch - when array is empty, nothing renders
      'JSXExpressionContainer > LogicalExpression'(node: TSESTree.LogicalExpression) {
        if (node.operator !== '&&') return;

        // Check if right side contains a .map() call
        const right = node.right;
        if (!isMapCall(right)) return;

        const arrayName = getArrayName(right);
        if (!arrayName) return;

        // If wrapped in a ternary higher up, the ternary provides the empty state
        if (isInTernary(node)) return;

        // If there's a sibling empty state element, it's fine
        if (hasSiblingEmptyState(right, arrayName)) return;

        context.report({
          node: right,
          messageId: 'missingEmptyState',
          data: { listVariable: arrayName },
        });
      },
    };
  },
});
