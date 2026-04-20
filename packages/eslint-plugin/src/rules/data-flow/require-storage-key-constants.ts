import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const STORAGE_OBJECTS = new Set(['localStorage', 'sessionStorage']);
const STORAGE_METHODS = new Set(['getItem', 'setItem', 'removeItem']);

function toConstName(key: string): string {
  return 'STORAGE_KEY_' + key.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
}

export default createRule({
  name: 'require-storage-key-constants',
  meta: {
    type: 'problem',
    docs: { description: 'Require storage keys to be defined as constants, not inline literals' },
    schema: [],
    messages: {
      noMagicKey:
        "Storage key '{{key}}' 是裸字面量，容易跨文件不一致。请定义为常量并从 shared/constants 导入：`export const {{suggestion}} = '{{key}}';`",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Match: localStorage.getItem('key') / sessionStorage.setItem('key', val)
        if (node.callee.type !== 'MemberExpression') return;
        const { object, property } = node.callee;
        if (object.type !== 'Identifier' || !STORAGE_OBJECTS.has(object.name)) return;
        if (property.type !== 'Identifier' || !STORAGE_METHODS.has(property.name)) return;

        const firstArg = node.arguments[0];
        if (!firstArg) return;

        // String literal → report
        if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
          const raw = firstArg.value;
          context.report({
            node: firstArg,
            messageId: 'noMagicKey',
            data: { key: raw, suggestion: toConstName(raw) },
          });
          return;
        }

        // Template literal → report
        if (firstArg.type === 'TemplateLiteral') {
          const raw = firstArg.quasis.map(q => q.value.raw).join('...');
          context.report({
            node: firstArg,
            messageId: 'noMagicKey',
            data: { key: raw, suggestion: 'STORAGE_KEY_DYNAMIC' },
          });
        }
      },
    };
  },
});
