import { createRule } from '../../utils/rule-helpers';
import { getJSXElementName, findJSXAttribute } from '../../utils/jsx-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

function isLocationMember(node: TSESTree.MemberExpression, prop: string): boolean {
  // window.location.prop or document.location.prop
  if (
    node.object.type === 'MemberExpression' &&
    node.object.property.type === 'Identifier' &&
    node.object.property.name === 'location' &&
    node.property.type === 'Identifier' &&
    node.property.name === prop
  ) {
    const obj = node.object.object;
    if (obj.type === 'Identifier' && (obj.name === 'window' || obj.name === 'document')) {
      return true;
    }
  }
  return false;
}

function isLocationAssign(node: TSESTree.MemberExpression): boolean {
  // window.location or document.location (direct assignment)
  if (
    node.object.type === 'Identifier' &&
    (node.object.name === 'window' || node.object.name === 'document') &&
    node.property.type === 'Identifier' &&
    node.property.name === 'location'
  ) {
    return true;
  }
  return false;
}

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//.test(value) || value.startsWith('//');
}

export default createRule({
  name: 'no-location-href-navigate',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow using window.location for internal navigation' },
    schema: [],
    messages: {
      noLocationNavigate:
        "禁止使用 '{{expression}}' 进行页面内跳转，这会触发全页刷新并丢失React状态。请使用 `<Link to=\"{{path}}\">` 或 `navigate(\"{{path}}\")` 进行路由跳转。",
      noAnchorHref:
        "禁止使用 `<a href=\"{{path}}\">` 进行页面内跳转。请使用 `<Link to=\"{{path}}\">` 进行路由跳转。外部链接请使用 `<a href=\"https://...\">` 并添加 `target=\"_blank\" rel=\"noopener\"`。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      // window.location.href = '...' / window.location = '...'
      AssignmentExpression(node) {
        const left = node.left;
        if (left.type !== 'MemberExpression') return;

        let expression = '';
        let path = '';

        if (isLocationMember(left, 'href') || isLocationAssign(left)) {
          expression = context.sourceCode.getText(left);
          if (node.right.type === 'Literal' && typeof node.right.value === 'string') {
            path = node.right.value;
            if (isExternalUrl(path)) return;
          } else if (node.right.type === 'TemplateLiteral' && node.right.quasis.length > 0) {
            const prefix = node.right.quasis[0].value.cooked ?? '';
            if (isExternalUrl(prefix)) return;
            path = prefix;
          }
          context.report({ node, messageId: 'noLocationNavigate', data: { expression, path } });
        }
      },

      // window.location.assign(...) / window.location.replace(...)
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') return;
        const callee = node.callee;

        if (
          callee.object.type === 'MemberExpression' &&
          callee.object.property.type === 'Identifier' &&
          callee.object.property.name === 'location' &&
          callee.property.type === 'Identifier' &&
          (callee.property.name === 'assign' || callee.property.name === 'replace')
        ) {
          const obj = callee.object.object;
          if (obj.type === 'Identifier' && (obj.name === 'window' || obj.name === 'document')) {
            const arg = node.arguments[0];
            if (arg?.type === 'Literal' && typeof arg.value === 'string' && isExternalUrl(arg.value)) {
              return;
            }
            const expression = context.sourceCode.getText(node.callee);
            const path = arg?.type === 'Literal' && typeof arg.value === 'string' ? arg.value : '';
            context.report({ node, messageId: 'noLocationNavigate', data: { expression, path } });
          }
        }
      },

      // <a href="/internal-path">
      JSXOpeningElement(node) {
        const name = getJSXElementName(node);
        if (name !== 'a') return;

        const hrefAttr = findJSXAttribute(node, 'href');
        if (!hrefAttr?.value) return;

        let hrefValue: string | null = null;
        if (hrefAttr.value.type === 'Literal' && typeof hrefAttr.value.value === 'string') {
          hrefValue = hrefAttr.value.value;
        } else if (
          hrefAttr.value.type === 'JSXExpressionContainer' &&
          hrefAttr.value.expression.type === 'Literal' &&
          typeof hrefAttr.value.expression.value === 'string'
        ) {
          hrefValue = hrefAttr.value.expression.value;
        }

        if (!hrefValue) return;
        if (isExternalUrl(hrefValue)) return;
        if (!hrefValue.startsWith('/')) return; // Only flag internal absolute paths

        context.report({
          node: hrefAttr,
          messageId: 'noAnchorHref',
          data: { path: hrefValue },
        });
      },
    };
  },
});
