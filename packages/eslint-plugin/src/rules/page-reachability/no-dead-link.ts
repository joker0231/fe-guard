import { createRule } from '../../utils/rule-helpers';
import { getJSXElementName, findJSXAttribute } from '../../utils/jsx-helpers';
import { getStaticStringValue } from '../../utils/ast-helpers';

export default createRule({
  name: 'no-dead-link',
  meta: {
    type: 'problem',
    docs: { description: 'Detect navigation to potentially dead routes (L1: format validation)' },
    schema: [],
    messages: {
      deadLink:
        "跳转目标路径 '{{targetPath}}' 可能不存在。请检查路径拼写，或在路由配置中注册该路径。",
    },
  },
  defaultOptions: [],
  create(context) {
    // L1: Collect all navigation target paths for reporting
    // Full cross-file validation is done at L2 (Vite plugin)
    // At L1, we just make sure Link/NavLink targets are string literals
    return {
      JSXOpeningElement(node) {
        const name = getJSXElementName(node);
        if (name !== 'Link' && name !== 'NavLink') return;

        const toAttr = findJSXAttribute(node, 'to');
        if (!toAttr || !toAttr.value) return;

        // If 'to' is a JSXExpressionContainer with a template literal or variable, skip
        // We only warn if it's empty or malformed
        if (toAttr.value.type === 'Literal' && toAttr.value.value === '') {
          context.report({
            node: toAttr,
            messageId: 'deadLink',
            data: { targetPath: '' },
          });
        }
        if (toAttr.value.type === 'JSXExpressionContainer') {
          const expr = toAttr.value.expression;
          if (expr.type === 'Literal' && expr.value === '') {
            context.report({
              node: toAttr,
              messageId: 'deadLink',
              data: { targetPath: '' },
            });
          }
        }
      },
    };
  },
});
