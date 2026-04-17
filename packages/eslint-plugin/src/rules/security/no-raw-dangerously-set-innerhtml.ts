import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'no-raw-dangerously-set-innerhtml',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow dangerouslySetInnerHTML without sanitization' },
    schema: [],
    messages: {
      unsanitized:
        "直接使用 dangerouslySetInnerHTML 渲染未经消毒的内容存在 XSS 风险。请使用 DOMPurify.sanitize() 或其他消毒函数处理后再渲染。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'dangerouslySetInnerHTML') return;
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return;

        const expr = node.value.expression;
        if (expr.type !== 'ObjectExpression') return;

        const htmlProp = expr.properties.find(
          (p): p is TSESTree.Property =>
            p.type === 'Property' &&
            p.key.type === 'Identifier' &&
            p.key.name === '__html',
        );
        if (!htmlProp) return;

        const val = htmlProp.value;
        // Safe: string literal
        if (val.type === 'Literal' && typeof val.value === 'string') return;
        // Safe: template literal with no expressions
        if (val.type === 'TemplateLiteral' && val.expressions.length === 0) return;
        // Safe: known sanitization libraries only
        if (val.type === 'CallExpression') {
          const callee = val.callee;
          // DOMPurify.sanitize(...)
          if (callee.type === 'MemberExpression' &&
              callee.object.type === 'Identifier' && callee.object.name === 'DOMPurify' &&
              callee.property.type === 'Identifier' && callee.property.name === 'sanitize') return;
          // sanitizeHtml(...) / xss(...)
          if (callee.type === 'Identifier' &&
              (callee.name === 'sanitizeHtml' || callee.name === 'xss')) return;
        }

        context.report({ node, messageId: 'unsanitized' });
      },
    };
  },
});
