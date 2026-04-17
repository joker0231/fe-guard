import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'response-null-check',
  meta: {
    type: 'problem',
    docs: { description: 'Require null checks on API response data' },
    schema: [],
    messages: {
      missingNullCheck:
        "API响应 '{{variable}}' 未做空值检查就访问属性 '{{property}}'。后端可能返回null/undefined。请使用可选链：`{{variable}}?.{{property}}`，或添加空值判断。",
    },
  },
  defaultOptions: [],
  create(context) {
    // Track variables assigned from fetch/json/axios responses
    const apiResponseVars = new Set<string>();

    return {
      VariableDeclarator(node) {
        if (node.id.type !== 'Identifier') return;
        const init = node.init;
        if (!init) return;

        // const data = await res.json()
        if (
          init.type === 'AwaitExpression' &&
          init.argument.type === 'CallExpression' &&
          init.argument.callee.type === 'MemberExpression' &&
          init.argument.callee.property.type === 'Identifier' &&
          init.argument.callee.property.name === 'json'
        ) {
          apiResponseVars.add(node.id.name);
        }

        // const { data } = await axios.get(...)
        if (
          init.type === 'AwaitExpression' &&
          init.argument.type === 'CallExpression' &&
          init.argument.callee.type === 'MemberExpression' &&
          init.argument.callee.object.type === 'Identifier' &&
          init.argument.callee.object.name === 'axios'
        ) {
          if (node.id.type === 'ObjectPattern') {
            for (const prop of node.id.properties) {
              if (prop.type === 'Property' && prop.value.type === 'Identifier') {
                apiResponseVars.add(prop.value.name);
              }
            }
          } else {
            apiResponseVars.add(node.id.name);
          }
        }
      },

      MemberExpression(node) {
        // Only check in JSX context or when chaining .map/.forEach etc
        if (node.object.type !== 'Identifier') return;
        if (!apiResponseVars.has(node.object.name)) return;

        // Skip if using optional chaining
        if (node.optional) return;

        // Skip if parent is optional chain continuation
        if (node.parent?.type === 'ChainExpression') return;

        // Skip if in a conditional check (if, ternary, &&)
        let current: TSESTree.Node | undefined = node.parent;
        while (current) {
          if (current.type === 'IfStatement' && current.test === node) return;
          if (current.type === 'ConditionalExpression' && current.test === node) return;
          if (current.type === 'LogicalExpression' && current.left === node) return;
          if (
            current.type === 'FunctionDeclaration' ||
            current.type === 'ArrowFunctionExpression' ||
            current.type === 'FunctionExpression'
          ) break;
          current = current.parent;
        }

        const property = node.property.type === 'Identifier' ? node.property.name : '';

        context.report({
          node,
          messageId: 'missingNullCheck',
          data: { variable: node.object.name, property },
        });
      },
    };
  },
});
