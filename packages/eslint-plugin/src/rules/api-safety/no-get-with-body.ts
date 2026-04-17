import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'no-get-with-body',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow body in GET requests' },
    schema: [],
    messages: {
      getWithBody:
        "GET请求不应携带body参数，部分服务器/代理会忽略或拒绝。请改用URL查询参数，或将请求方法改为POST。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'fetch') return;

        const options = node.arguments[1];
        if (!options || options.type !== 'ObjectExpression') return;

        let method: string | null = null;
        let hasBody = false;

        for (const prop of options.properties) {
          if (prop.type !== 'Property') continue;
          if (prop.key.type !== 'Identifier') continue;

          if (prop.key.name === 'method' && prop.value.type === 'Literal') {
            method = String(prop.value.value).toUpperCase();
          }
          if (prop.key.name === 'body') {
            hasBody = true;
          }
        }

        // Default method is GET
        const isGet = method === null || method === 'GET';

        if (isGet && hasBody) {
          context.report({ node, messageId: 'getWithBody' });
        }
      },
    };
  },
});
