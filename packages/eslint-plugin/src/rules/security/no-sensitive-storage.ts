import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

/**
 * Sensitive keywords that should never be stored in browser storage.
 * Intentionally excludes "token" — persist stores legitimately store auth tokens.
 */
const SENSITIVE_KEY_PATTERNS = [
  'password', 'passwd', 'pwd',
  'secret', 'credential',
  'private_key', 'privatekey', 'private-key',
  'api_key', 'apikey', 'api-key',
  'access_key', 'accesskey', 'access-key',
  'secret_key', 'secretkey', 'secret-key',
];

const SENSITIVE_VALUE_PATTERNS = [
  'password', 'passwd', 'pwd',
  'secret', 'credential',
  'privateKey', 'apiKey', 'accessKey', 'secretKey',
];

function containsSensitiveWord(str: string, patterns: string[]): string | null {
  const lower = str.toLowerCase();
  for (const pattern of patterns) {
    if (lower.includes(pattern.toLowerCase())) {
      return pattern;
    }
  }
  return null;
}

function getValueName(node: TSESTree.Node): string | null {
  if (node.type === 'Identifier') {
    return node.name;
  }
  if (node.type === 'MemberExpression' && node.property.type === 'Identifier') {
    return node.property.name;
  }
  // Handle chained access like formData.user.password
  if (node.type === 'MemberExpression' && node.property.type === 'Literal' && typeof node.property.value === 'string') {
    return node.property.value;
  }
  return null;
}

export default createRule({
  name: 'no-sensitive-storage',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow storing sensitive data (passwords, secrets, credentials) in localStorage/sessionStorage',
    },
    schema: [],
    messages: {
      sensitiveKey:
        '禁止在浏览器存储中使用包含敏感词 "{{word}}" 的 key "{{key}}"。密码、密钥等敏感数据不应存储在 localStorage/sessionStorage 中，存在 XSS 窃取风险。',
      sensitiveValue:
        '禁止将敏感数据 "{{name}}" 存储到浏览器存储。密码、密钥等敏感数据不应存储在 localStorage/sessionStorage 中，存在 XSS 窃取风险。',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Match: localStorage.setItem(...) or sessionStorage.setItem(...)
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.property.type !== 'Identifier' ||
          node.callee.property.name !== 'setItem'
        ) {
          return;
        }

        const obj = node.callee.object;
        if (
          obj.type !== 'Identifier' ||
          (obj.name !== 'localStorage' && obj.name !== 'sessionStorage')
        ) {
          return;
        }

        const args = node.arguments;

        // Check key (first argument)
        if (args.length >= 1) {
          const keyArg = args[0];
          let keyStr: string | null = null;

          if (keyArg.type === 'Literal' && typeof keyArg.value === 'string') {
            keyStr = keyArg.value;
          } else if (keyArg.type === 'TemplateLiteral' && keyArg.quasis.length === 1) {
            keyStr = keyArg.quasis[0].value.raw;
          }

          if (keyStr) {
            const match = containsSensitiveWord(keyStr, SENSITIVE_KEY_PATTERNS);
            if (match) {
              context.report({
                node,
                messageId: 'sensitiveKey',
                data: { word: match, key: keyStr },
              });
              return; // Don't double-report
            }
          }
        }

        // Check value (second argument)
        if (args.length >= 2) {
          const valueArg = args[1];
          const valueName = getValueName(valueArg);
          if (valueName) {
            const match = containsSensitiveWord(valueName, SENSITIVE_VALUE_PATTERNS);
            if (match) {
              context.report({
                node,
                messageId: 'sensitiveValue',
                data: { name: valueName },
              });
            }
          }
        }
      },
    };
  },
});
