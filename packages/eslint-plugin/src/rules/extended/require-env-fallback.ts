import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'require-env-fallback',
  meta: {
    type: 'suggestion',
    docs: { description: 'Require fallback values for environment variables' },
    schema: [],
    messages: {
      missingFallback:
        "环境变量 `{{envVar}}` 没有fallback值。未设置时变成undefined，可能导致API请求发往错误地址。请添加fallback：`{{envVar}} ?? '默认值'`，或在启动时检查环境变量是否存在。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      MemberExpression(node) {
        if (!isEnvAccess(node)) return;

        // Check if parent provides a fallback
        if (hasFallback(node)) return;

        // Check if inside an if-check or throw
        if (isInsideEnvCheck(node)) return;

        const envVar = context.sourceCode.getText(node);
        context.report({
          node,
          messageId: 'missingFallback',
          data: { envVar },
        });
      },
    };
  },
});

/**
 * Check if node is import.meta.env.* or process.env.*
 */
function isEnvAccess(node: TSESTree.MemberExpression): boolean {
  // import.meta.env.VITE_*
  if (
    node.object.type === 'MemberExpression' &&
    node.object.property.type === 'Identifier' &&
    node.object.property.name === 'env'
  ) {
    const envParent = node.object.object;
    // import.meta.env
    if (
      envParent.type === 'MetaProperty' &&
      envParent.meta.name === 'import' &&
      envParent.property.name === 'meta'
    ) {
      return true;
    }
    // process.env
    if (
      envParent.type === 'Identifier' &&
      envParent.name === 'process'
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Check if parent provides a fallback (??, ||, ternary, or inside if)
 */
function hasFallback(node: TSESTree.Node): boolean {
  const parent = node.parent;
  if (!parent) return false;

  // ?? fallback
  if (
    parent.type === 'LogicalExpression' &&
    (parent.operator === '??' || parent.operator === '||') &&
    parent.left === node
  ) {
    return true;
  }

  // Ternary condition or value
  if (parent.type === 'ConditionalExpression') {
    return true;
  }

  // Unary ! (negation check like if (!import.meta.env.X))
  if (parent.type === 'UnaryExpression' && parent.operator === '!') {
    return true;
  }

  // Binary comparison (===, !==, ==, !=) — not concatenation (+)
  if (
    parent.type === 'BinaryExpression' &&
    (parent.operator === '===' || parent.operator === '!==' ||
     parent.operator === '==' || parent.operator === '!=')
  ) {
    return true;
  }

  // Inside template literal with other expressions is okay
  // (they typically add a prefix/suffix)

  return false;
}

/**
 * Check if node is inside an if statement that checks the env var
 */
function isInsideEnvCheck(node: TSESTree.Node): boolean {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (current.type === 'IfStatement') {
      // If the env var is used in the test condition, it's being checked
      return true;
    }
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression'
    ) {
      break;
    }
    current = current.parent;
  }
  return false;
}
