import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

/** Direct global functions that are forbidden */
const FORBIDDEN_GLOBALS = new Set(['alert', 'confirm', 'prompt', 'eval']);

/** window.xxx methods that are forbidden */
const FORBIDDEN_WINDOW_METHODS = new Set(['alert', 'confirm', 'prompt', 'eval']);

/** DOM properties whose assignment is forbidden */
const FORBIDDEN_DOM_PROPERTIES = new Set(['innerHTML', 'outerHTML']);

const FEEDBACK_MESSAGE =
  '禁止使用原生 {{name}}。请使用封装替代方案：\n' +
  'alert → feedback.info(), confirm → feedback.confirm(), \n' +
  'prompt → <Input>组件, eval → 完全禁止, \n' +
  'document.write → 完全禁止, innerHTML/outerHTML → 使用React渲染, \n' +
  'insertAdjacentHTML → 使用React渲染';

export default createRule({
  name: 'no-native-feedback',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow native feedback APIs (alert/confirm/prompt) and dangerous global functions (eval/document.write/innerHTML)' },
    schema: [],
    messages: {
      forbidden: FEEDBACK_MESSAGE,
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Direct calls: alert(), confirm(), prompt(), eval()
        if (callee.type === 'Identifier' && FORBIDDEN_GLOBALS.has(callee.name)) {
          context.report({
            node,
            messageId: 'forbidden',
            data: { name: `${callee.name}()` },
          });
          return;
        }

        // Member expression calls
        if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
          const prop = callee.property.name;
          const obj = callee.object;

          // window.alert(), window.confirm(), window.prompt()
          if (obj.type === 'Identifier' && obj.name === 'window' && FORBIDDEN_WINDOW_METHODS.has(prop)) {
            context.report({
              node,
              messageId: 'forbidden',
              data: { name: `window.${prop}()` },
            });
            return;
          }

          // document.write() / document.writeln()
          if (obj.type === 'Identifier' && obj.name === 'document' && (prop === 'write' || prop === 'writeln')) {
            context.report({
              node,
              messageId: 'forbidden',
              data: { name: 'document.write()' },
            });
            return;
          }

          // xxx.insertAdjacentHTML()
          if (prop === 'insertAdjacentHTML') {
            context.report({
              node,
              messageId: 'forbidden',
              data: { name: 'insertAdjacentHTML()' },
            });
            return;
          }
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // element.innerHTML = ... / element.outerHTML = ...
        const left = node.left;
        if (
          left.type === 'MemberExpression' &&
          left.property.type === 'Identifier' &&
          FORBIDDEN_DOM_PROPERTIES.has(left.property.name)
        ) {
          context.report({
            node,
            messageId: 'forbidden',
            data: { name: left.property.name },
          });
        }
      },
    };
  },
});