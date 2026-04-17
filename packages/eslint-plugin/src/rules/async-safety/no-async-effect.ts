import { createRule } from '../../utils/rule-helpers';
import { isUseEffect } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'no-async-effect',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow async function as useEffect callback' },
    schema: [],
    messages: {
      asyncEffect:
        "`useEffect` 回调不能是async函数。async函数返回Promise，会导致cleanup机制失效。请在effect内部定义async函数并调用：`useEffect(() => { const load = async () => {...}; load(); }, [])`。",
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
          (callback.type === 'ArrowFunctionExpression' ||
            callback.type === 'FunctionExpression') &&
          callback.async
        ) {
          context.report({ node: callback, messageId: 'asyncEffect' });
        }
      },
    };
  },
});
