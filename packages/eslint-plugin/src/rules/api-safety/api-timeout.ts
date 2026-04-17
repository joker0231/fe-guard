import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'api-timeout',
  meta: {
    type: 'problem',
    docs: { description: 'Require timeout for fetch calls' },
    schema: [],
    messages: {
      missingTimeout:
        "`fetch()` 调用缺少超时机制。网络异常时请求会永远pending。请添加 `AbortController` + `setTimeout` 设置超时，或使用支持timeout配置的请求库。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'fetch') return;

        const options = node.arguments[1];

        // No options at all
        if (!options) {
          context.report({ node, messageId: 'missingTimeout' });
          return;
        }

        // Options is an object expression — check for signal
        if (options.type === 'ObjectExpression') {
          const hasSignal = options.properties.some(
            (prop) =>
              prop.type === 'Property' &&
              prop.key.type === 'Identifier' &&
              prop.key.name === 'signal',
          );
          if (!hasSignal) {
            context.report({ node, messageId: 'missingTimeout' });
          }
          return;
        }

        // Options is a variable — check if it has signal in spread or is a known config object
        // For simplicity, if options is a variable reference, don't flag (could be a wrapped fetch)
      },
    };
  },
});
