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

function hasLengthCheck(node: TSESTree.Node, arrayName: string): boolean {
  // Walk up to find a conditional that checks array length
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (current.type === 'ConditionalExpression' || current.type === 'LogicalExpression') {
      const text = getLengthCheckSource(current);
      if (text && text.includes(arrayName)) return true;
    }
    if (current.type === 'IfStatement') {
      return true; // Simplified: if there's an if wrapping the map, assume it checks
    }
    // Stop at function boundaries
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'ArrowFunctionExpression' ||
      current.type === 'FunctionExpression'
    ) break;
    current = current.parent;
  }
  return false;
}

function getLengthCheckSource(node: TSESTree.Node): string | null {
  if (node.type === 'ConditionalExpression') {
    return extractConditionText(node.test);
  }
  if (node.type === 'LogicalExpression') {
    return extractConditionText(node.left);
  }
  return null;
}

function extractConditionText(node: TSESTree.Node): string {
  // Check for .length patterns
  if (node.type === 'MemberExpression' && node.property.type === 'Identifier' && node.property.name === 'length') {
    if (node.object.type === 'Identifier') return node.object.name;
    if (node.object.type === 'ChainExpression') return 'chain';
  }
  if (node.type === 'BinaryExpression') {
    const left = extractConditionText(node.left);
    if (left) return left;
  }
  if (node.type === 'UnaryExpression') {
    return extractConditionText(node.argument);
  }
  if (node.type === 'ChainExpression') {
    return extractConditionText(node.expression);
  }
  if (node.type === 'Identifier') return node.name;
  return '';
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
      'JSXExpressionContainer > CallExpression'(node: TSESTree.CallExpression) {
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.property.type !== 'Identifier' ||
          node.callee.property.name !== 'map'
        ) return;

        const arrayName = getArrayName(node);
        if (!arrayName) return;

        // Check if there's a length check wrapping this
        if (hasLengthCheck(node, arrayName)) return;

        context.report({
          node,
          messageId: 'missingEmptyState',
          data: { listVariable: arrayName },
        });
      },
    };
  },
});
