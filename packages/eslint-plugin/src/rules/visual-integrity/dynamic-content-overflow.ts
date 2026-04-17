import { createRule } from '../../utils/rule-helpers';
import { getStyleProperty, childrenHasMapCall } from '../../utils/jsx-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

function hasFixedHeight(element: TSESTree.JSXOpeningElement): boolean {
  const h = getStyleProperty(element, 'height');
  if (!h) return false;
  const val = h.value;
  if (val.type === 'Literal' && typeof val.value === 'number') return true;
  if (val.type === 'Literal' && typeof val.value === 'string') {
    if (['auto', '100%', 'fit-content'].includes(val.value)) return false;
    return /^\d+px$/.test(val.value);
  }
  return false;
}

function hasDynamicContent(element: TSESTree.JSXElement): boolean {
  if (childrenHasMapCall(element)) return true;
  return element.children.some(
    (child) => child.type === 'JSXExpressionContainer' && child.expression.type !== 'JSXEmptyExpression',
  );
}

export default createRule({
  name: 'dynamic-content-overflow',
  meta: {
    type: 'problem',
    docs: { description: 'Require overflow handling for fixed-height containers with dynamic content' },
    schema: [],
    messages: {
      missingOverflow: '固定高度容器中包含动态内容，但缺少 overflow 处理。内容超出时会被截断或溢出。请添加 overflow: \'auto\' 或 overflowY: \'auto\'。',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXElement(node: TSESTree.JSXElement) {
        const opening = node.openingElement;
        if (!hasFixedHeight(opening)) return;
        if (!hasDynamicContent(node)) return;
        if (getStyleProperty(opening, 'overflow')) return;
        if (getStyleProperty(opening, 'overflowY')) return;
        context.report({ node: opening, messageId: 'missingOverflow' });
      },
    };
  },
});
