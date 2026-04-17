import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const URL_PATTERN = /^https?:\/\//;
const API_PATH_PATTERN = /^\/api\//;
const WHITELIST_NUMBERS = new Set([0, 1, -1, 2, 100]);

export default createRule({
  name: 'no-scattered-constants',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow hardcoded constants in component files (use constants/ directory)' },
    schema: [],
    messages: {
      scatteredUrl:
        "硬编码的 URL '{{value}}' 应提取到 constants/ 目录集中管理。分散的常量难以维护且容易在环境切换时遗漏。",
      magicNumber:
        "魔法数字 {{value}} 出现在 '{{context}}' 中，应提取为命名常量到 constants/ 目录。",
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename || '';
    if (/constants?[\/\\]|config[\/\\]|\.d\.ts$|\.config\./i.test(filename)) return {};

    return {
      Literal(node: TSESTree.Literal) {
        // Check URL strings
        if (typeof node.value === 'string') {
          // Skip imports
          if (node.parent?.type === 'ImportDeclaration') return;
          if (node.parent?.type === 'CallExpression' &&
              node.parent.callee.type === 'Identifier' &&
              node.parent.callee.name === 'require') return;

          if (URL_PATTERN.test(node.value) || API_PATH_PATTERN.test(node.value)) {
            context.report({ node, messageId: 'scatteredUrl', data: { value: node.value } });
          }
          return;
        }

        // Check magic numbers in setTimeout/setInterval
        if (typeof node.value === 'number' && !WHITELIST_NUMBERS.has(node.value) && node.value >= 10) {
          const parent = node.parent;
          if (parent?.type === 'CallExpression') {
            const callee = parent.callee;
            if (callee.type === 'Identifier' && (callee.name === 'setTimeout' || callee.name === 'setInterval')) {
              if (parent.arguments[1] === node) {
                context.report({
                  node,
                  messageId: 'magicNumber',
                  data: { value: String(node.value), context: callee.name },
                });
              }
            }
          }
        }
      },
    };
  },
});
