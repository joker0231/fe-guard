import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

/** Call expressions that produce unstable values */
const UNSTABLE_CALLS = new Set([
  'Math.random',
  'Date.now',
  'performance.now',
  'Symbol',
]);

/** Get a string representation of the unstable expression for the error message */
function getUnstableDescription(expr: TSESTree.Expression): string | null {
  // new Date() / new Date().getTime()
  if (expr.type === 'NewExpression') {
    if (expr.callee.type === 'Identifier' && expr.callee.name === 'Date') {
      return 'new Date()';
    }
  }

  // xxx.getTime() on a new Date()
  if (
    expr.type === 'CallExpression' &&
    expr.callee.type === 'MemberExpression' &&
    expr.callee.object.type === 'NewExpression' &&
    expr.callee.object.callee.type === 'Identifier' &&
    expr.callee.object.callee.name === 'Date'
  ) {
    return 'new Date().getTime()';
  }

  if (expr.type !== 'CallExpression') return null;

  const callee = expr.callee;

  // Math.random() / Date.now() / performance.now()
  if (callee.type === 'MemberExpression') {
    if (
      callee.object.type === 'Identifier' &&
      callee.property.type === 'Identifier'
    ) {
      const full = `${callee.object.name}.${callee.property.name}`;
      if (UNSTABLE_CALLS.has(full)) {
        return `${full}()`;
      }
    }
  }

  // Symbol()
  if (callee.type === 'Identifier' && callee.name === 'Symbol') {
    return 'Symbol()';
  }

  return null;
}

export default createRule({
  name: 'no-unstable-key',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow unstable values in JSX key attribute',
    },
    schema: [],
    messages: {
      unstableKey:
        'key 属性不能使用不稳定的值 "{{value}}"。每次渲染都会生成新key，导致React无法复用DOM节点，性能低下且可能引入状态bug。\n' +
        '请使用稳定的唯一标识符（如item.id）。',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        // 只检查 key 属性
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'key') {
          return;
        }

        if (!node.value || node.value.type !== 'JSXExpressionContainer') {
          return;
        }

        const expr = node.value.expression;
        if (expr.type === 'JSXEmptyExpression') return;

        const description = getUnstableDescription(expr);
        if (description) {
          context.report({
            node,
            messageId: 'unstableKey',
            data: { value: description },
          });
        }
      },
    };
  },
});