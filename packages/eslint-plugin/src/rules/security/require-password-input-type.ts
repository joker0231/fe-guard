import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

/**
 * require-password-input-type
 *
 * AI 容易犯的错误：复制 input 模式时忘记把 type 改为 "password"，
 * 导致密码字段以明文形式显示。
 *
 * 检测逻辑：
 * - JSX 元素是 Input 或 input
 * - 如果 id / name 属性值包含 "password"
 * - 或者 spread 中有 form.register('password') / register('password')
 * - 则 type 属性必须是 "password"
 */

const PASSWORD_INDICATORS = ['password', 'passwd', 'pwd'];

function containsPasswordWord(value: string): boolean {
  const lower = value.toLowerCase();
  return PASSWORD_INDICATORS.some((p) => lower.includes(p));
}

function getJSXAttributeStringValue(attr: TSESTree.JSXAttribute): string | null {
  if (attr.value?.type === 'Literal' && typeof attr.value.value === 'string') {
    return attr.value.value;
  }
  return null;
}

function isInputElement(node: TSESTree.JSXOpeningElement): boolean {
  if (node.name.type === 'JSXIdentifier') {
    const name = node.name.name;
    return name === 'input' || name === 'Input';
  }
  return false;
}

export default createRule({
  name: 'require-password-input-type',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require password-related input fields to have type="password" to prevent plaintext display',
    },
    schema: [],
    messages: {
      missingPasswordType:
        '密码输入框的 type 不是 "password"（当前为 "{{actualType}}"）。密码字段必须使用 type="password" 防止明文显示。',
      missingTypeAttribute:
        '密码输入框缺少 type 属性。密码字段必须使用 type="password" 防止明文显示。',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (!isInputElement(node)) return;

        const attrs = node.attributes;
        let isPasswordField = false;
        let typeValue: string | null = null;
        let hasTypeAttr = false;

        for (const attr of attrs) {
          if (attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier') {
            const attrName = attr.name.name;

            // Check id/name for password indicators
            if (attrName === 'id' || attrName === 'name') {
              const val = getJSXAttributeStringValue(attr);
              if (val && containsPasswordWord(val)) {
                isPasswordField = true;
              }
            }

            // Check type attribute
            if (attrName === 'type') {
              hasTypeAttr = true;
              typeValue = getJSXAttributeStringValue(attr);
            }
          }

          // Check spread attributes for register('password'...) patterns
          if (attr.type === 'JSXSpreadAttribute') {
            const expr = attr.argument;
            // Pattern: {...form.register('password')} or {...register('password')}
            if (expr.type === 'CallExpression') {
              let calleeName = '';
              if (
                expr.callee.type === 'MemberExpression' &&
                expr.callee.property.type === 'Identifier'
              ) {
                calleeName = expr.callee.property.name;
              } else if (expr.callee.type === 'Identifier') {
                calleeName = expr.callee.name;
              }

              if (calleeName === 'register' && expr.arguments.length > 0) {
                const firstArg = expr.arguments[0];
                if (
                  firstArg.type === 'Literal' &&
                  typeof firstArg.value === 'string' &&
                  containsPasswordWord(firstArg.value)
                ) {
                  isPasswordField = true;
                }
              }
            }
          }
        }

        if (!isPasswordField) return;

        if (!hasTypeAttr) {
          context.report({
            node,
            messageId: 'missingTypeAttribute',
          });
          return;
        }

        if (typeValue !== 'password') {
          context.report({
            node,
            messageId: 'missingPasswordType',
            data: { actualType: typeValue ?? 'unknown' },
          });
        }
      },
    };
  },
});