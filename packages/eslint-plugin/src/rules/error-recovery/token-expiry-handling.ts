import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'token-expiry-handling',
  meta: {
    type: 'suggestion',
    docs: { description: 'Require 401 status handling in response interceptors' },
    schema: [],
    messages: {
      missing401:
        "响应拦截器未处理401状态码。Token过期后API请求会静默失败。请在拦截器中添加：`if (error.response?.status === 401) { logout(); navigate('/login'); }`。",
    },
  },
  defaultOptions: [],
  create(context) {
    let hasInterceptor = false;
    let has401Handling = false;

    function is401Value(node: TSESTree.Node): boolean {
      return node.type === 'Literal' && node.value === 401;
    }

    function check401InNode(node: TSESTree.Node): boolean {
      if (node.type === 'BinaryExpression') {
        if (node.operator === '===' || node.operator === '==') {
          if (is401Value(node.left) || is401Value(node.right)) return true;
        }
      }
      return false;
    }

    function findIn401(node: TSESTree.Node): boolean {
      if (check401InNode(node)) return true;

      if (node.type === 'BlockStatement') {
        return node.body.some(s => findIn401(s));
      }
      if (node.type === 'ExpressionStatement') {
        return findIn401(node.expression);
      }
      if (node.type === 'IfStatement') {
        if (check401InNode(node.test)) return true;
        if (findIn401(node.consequent)) return true;
        if (node.alternate && findIn401(node.alternate)) return true;
        return false;
      }
      if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
        return node.body.type === 'BlockStatement' ? findIn401(node.body) : findIn401(node.body);
      }
      if (node.type === 'ConditionalExpression') {
        return check401InNode(node.test) || findIn401(node.consequent) || findIn401(node.alternate);
      }
      if (node.type === 'SwitchStatement') {
        return node.cases.some(c => {
          if (c.test && is401Value(c.test)) return true;
          return c.consequent.some(s => findIn401(s));
        });
      }
      return false;
    }

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression') return;
        if (callee.property.type !== 'Identifier') return;
        if (callee.property.name !== 'use') return;

        const obj = callee.object;
        if (
          obj.type === 'MemberExpression' &&
          obj.property.type === 'Identifier' &&
          obj.property.name === 'response'
        ) {
          const interceptors = obj.object;
          if (
            interceptors.type === 'MemberExpression' &&
            interceptors.property.type === 'Identifier' &&
            interceptors.property.name === 'interceptors'
          ) {
            hasInterceptor = true;

            for (const arg of node.arguments) {
              if (findIn401(arg)) {
                has401Handling = true;
              }
            }
          }
        }
      },

      'Program:exit'() {
        if (hasInterceptor && !has401Handling) {
          context.report({
            node: context.sourceCode.ast,
            messageId: 'missing401',
          });
        }
      },
    };
  },
});
