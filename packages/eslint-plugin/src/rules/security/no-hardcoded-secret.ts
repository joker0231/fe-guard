import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

/** 敏感变量名模式（变量声明） */
const SENSITIVE_VAR_PATTERN = /^(api[_-]?key|secret|password|token|auth|credential|private[_-]?key)/i;

/** 敏感对象属性名（精确匹配，大小写不敏感） */
const SENSITIVE_PROP_NAMES = new Set([
  'apikey',
  'api_key',
  'api-key',
  'secret',
  'password',
  'passwd',
  'pwd',
  'token',
  'authtoken',
  'auth_token',
  'accesstoken',
  'access_token',
  'authorization',
  'credential',
  'credentials',
  'privatekey',
  'private_key',
]);

/** 敏感字符串值前缀模式 */
interface SecretPattern {
  match: (value: string) => boolean;
  description: string;
}

const VALUE_PATTERNS: SecretPattern[] = [
  { match: (v) => v.startsWith('sk-') && v.length > 10, description: 'OpenAI/Anthropic API key (sk-...)' },
  { match: (v) => v.startsWith('Bearer ') && v.length > 27, description: 'Bearer token (Bearer ...)' },
  { match: (v) => v.startsWith('ghp_') && v.length > 10, description: 'GitHub personal access token (ghp_...)' },
  { match: (v) => v.startsWith('xoxb-') && v.length > 10, description: 'Slack bot token (xoxb-...)' },
  { match: (v) => v.startsWith('AKIA') && v.length >= 20, description: 'AWS access key ID (AKIA...)' },
];

/** 占位符白名单（明显不是真实密钥） */
const PLACEHOLDERS = new Set([
  'your-api-key-here',
  'your-secret-here',
  'your-token-here',
  'replace-me',
  'placeholder',
  'xxxxxxxx',
  'todo',
  'example',
  'test',
  'demo',
]);

function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  if (!value || value.length === 0) return true;
  if (PLACEHOLDERS.has(lower)) return true;
  if (/^(x{4,}|\*{4,}|-{4,}|_{4,})$/.test(value)) return true;
  return false;
}

function isEnvReference(node: TSESTree.Node): boolean {
  // process.env.XXX
  if (
    node.type === 'MemberExpression' &&
    node.object.type === 'MemberExpression' &&
    node.object.object.type === 'Identifier' &&
    node.object.object.name === 'process' &&
    node.object.property.type === 'Identifier' &&
    node.object.property.name === 'env'
  ) {
    return true;
  }
  // import.meta.env.XXX
  if (
    node.type === 'MemberExpression' &&
    node.object.type === 'MemberExpression' &&
    node.object.object.type === 'MetaProperty' &&
    node.object.property.type === 'Identifier' &&
    node.object.property.name === 'env'
  ) {
    return true;
  }
  // process.env['XXX'] 变体
  if (
    node.type === 'MemberExpression' &&
    node.computed &&
    node.object.type === 'MemberExpression' &&
    node.object.object.type === 'Identifier' &&
    node.object.object.name === 'process' &&
    node.object.property.type === 'Identifier' &&
    node.object.property.name === 'env'
  ) {
    return true;
  }
  return false;
}

function getStringValue(node: TSESTree.Node): string | null {
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis.length === 1) {
    return node.quasis[0].value.cooked ?? null;
  }
  return null;
}

function matchValuePattern(value: string): SecretPattern | null {
  for (const p of VALUE_PATTERNS) {
    if (p.match(value)) return p;
  }
  return null;
}

export default createRule({
  name: 'no-hardcoded-secret',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded API keys, secrets, tokens and passwords in source code',
    },
    schema: [],
    messages: {
      hardcodedByName:
        "检测到硬编码的敏感信息 '{{name}}'。在源代码中硬编码密钥/令牌会随代码泄漏到版本库。请使用环境变量替代：\n  const {{name}} = process.env.{{envName}};\n或在浏览器端使用：\n  const {{name}} = import.meta.env.VITE_{{envName}};",
      hardcodedByValue:
        "检测到疑似硬编码密钥 (匹配模式: {{pattern}})。在源代码中硬编码密钥/令牌会随代码泄漏到版本库。请使用环境变量替代，例如 process.env.XXX 或 import.meta.env.VITE_XXX。",
    },
  },
  defaultOptions: [],
  create(context) {
    // 测试文件白名单
    const filename = context.filename ?? (context as unknown as { getFilename?: () => string }).getFilename?.() ?? '';
    if (/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filename)) return {};
    if (/(^|\/)(__tests__|__mocks__|tests?|mocks?|fixtures?)\//.test(filename)) return {};
    if (/(^|\/)\.env(\.|$)/.test(filename)) return {};

    function toEnvName(name: string): string {
      return name
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[-\s]/g, '_')
        .toUpperCase();
    }

    function checkValueForPattern(valueNode: TSESTree.Node): void {
      const v = getStringValue(valueNode);
      if (!v || isPlaceholder(v)) return;
      const matched = matchValuePattern(v);
      if (matched) {
        context.report({
          node: valueNode,
          messageId: 'hardcodedByValue',
          data: { pattern: matched.description },
        });
      }
    }

    function checkNameValuePair(
      name: string,
      valueNode: TSESTree.Node,
      reportNode: TSESTree.Node,
    ): void {
      // 值是环境变量引用 → 安全
      if (isEnvReference(valueNode)) return;
      // 值不是字符串字面量 → 跳过
      const v = getStringValue(valueNode);
      if (v === null) return;
      // 占位符或空 → 跳过
      if (isPlaceholder(v)) return;
      // 长度过短 → 跳过（避免误报 "" 或 "x"）
      if (v.length <= 8) {
        // 但如果匹配强模式（如 'sk-xxx' 虽然短但明显是密钥），仍报
        if (matchValuePattern(v)) {
          context.report({
            node: reportNode,
            messageId: 'hardcodedByName',
            data: { name, envName: toEnvName(name) },
          });
        }
        return;
      }
      // 名称匹配 + 值有内容 → 报
      context.report({
        node: reportNode,
        messageId: 'hardcodedByName',
        data: { name, envName: toEnvName(name) },
      });
    }

    return {
      // const apiKey = 'sk-xxx...'
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!node.init) return;
        if (node.id.type === 'Identifier' && SENSITIVE_VAR_PATTERN.test(node.id.name)) {
          checkNameValuePair(node.id.name, node.init, node);
        }
      },

      // { apiKey: 'sk-xxx', Authorization: 'Bearer xxx' }
      Property(node: TSESTree.Property) {
        if (node.computed) return;
        let propName: string | null = null;
        if (node.key.type === 'Identifier') propName = node.key.name;
        else if (node.key.type === 'Literal' && typeof node.key.value === 'string') propName = node.key.value;
        if (!propName) return;

        const lower = propName.toLowerCase();
        const matchesName =
          SENSITIVE_PROP_NAMES.has(lower) || SENSITIVE_VAR_PATTERN.test(propName);
        if (matchesName) {
          checkNameValuePair(propName, node.value as TSESTree.Node, node);
        }
      },

      // 任何字符串字面量：匹配强模式（sk-/Bearer/ghp_/xoxb-/AKIA...）
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'string') return;
        // 避免在属性/变量检查中重复报告：只对没有被上面规则覆盖的字面量报
        // 但由于属性/变量检查有更详细的提示，独立字符串出现在其他位置（如headers: 'Bearer xxx'作为函数参数等）时才会触发
        const parent = (node as unknown as { parent?: TSESTree.Node }).parent;
        // Skip if parent is a Property value (will be covered by Property visitor if name matches)
        if (parent?.type === 'Property' && (parent as TSESTree.Property).value === node) {
          // 但如果parent的key不是敏感名，这里仍然应该检测强模式
          const p = parent as TSESTree.Property;
          let pname: string | null = null;
          if (!p.computed) {
            if (p.key.type === 'Identifier') pname = p.key.name;
            else if (p.key.type === 'Literal' && typeof p.key.value === 'string') pname = p.key.value;
          }
          if (pname) {
            const lower = pname.toLowerCase();
            if (SENSITIVE_PROP_NAMES.has(lower) || SENSITIVE_VAR_PATTERN.test(pname)) {
              return; // 已由Property visitor处理
            }
          }
        }
        // Skip if parent is a VariableDeclarator init and name matches sensitive pattern
        if (parent?.type === 'VariableDeclarator' && (parent as TSESTree.VariableDeclarator).init === node) {
          const vd = parent as TSESTree.VariableDeclarator;
          if (vd.id.type === 'Identifier' && SENSITIVE_VAR_PATTERN.test(vd.id.name)) {
            return; // 已由VariableDeclarator visitor处理
          }
        }
        checkValueForPattern(node);
      },
    };
  },
});