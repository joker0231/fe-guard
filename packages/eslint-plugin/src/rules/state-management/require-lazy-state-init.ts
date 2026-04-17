import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

/**
 * Check if a callee is useState or React.useState.
 */
function isUseStateCall(callee: TSESTree.CallExpression['callee']): boolean {
  // useState(...)
  if (callee.type === 'Identifier' && callee.name === 'useState') {
    return true;
  }

  // React.useState(...)
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'React' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'useState'
  ) {
    return true;
  }

  return false;
}

/**
 * Get a readable name for the called function.
 */
function getCalleeName(call: TSESTree.CallExpression): string {
  const callee = call.callee;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    if (callee.object.type === 'Identifier') {
      return `${callee.object.name}.${callee.property.name}`;
    }
    return callee.property.name;
  }
  return 'fn';
}

export default createRule({
  name: 'require-lazy-state-init',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require lazy initializer for useState when initial value is a function call',
    },
    schema: [],
    messages: {
      needsLazyInit:
        'useState的初始值是函数调用 "{{fnName}}()"，每次渲染都会执行一次。\n' +
        '请改为lazy initializer：useState(() => {{fnName}}())',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isUseStateCall(node.callee)) return;
        if (node.arguments.length === 0) return;

        const arg = node.arguments[0];

        // 只针对CallExpression（函数调用）做检测
        if (arg.type !== 'CallExpression') return;

        const fnName = getCalleeName(arg);

        context.report({
          node: arg,
          messageId: 'needsLazyInit',
          data: { fnName },
        });
      },
    };
  },
});