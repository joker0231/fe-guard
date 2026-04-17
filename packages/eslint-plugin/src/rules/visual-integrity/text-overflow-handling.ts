import { createRule } from '../../utils/rule-helpers';
import { getStyleProperty } from '../../utils/jsx-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

function isFixedWidth(element: TSESTree.JSXOpeningElement): boolean {
  const w = getStyleProperty(element, 'width') || getStyleProperty(element, 'maxWidth');
  if (!w) return false;
  const val = w.value;
  if (val.type === 'Literal' && typeof val.value === 'number') return true;
  if (val.type === 'Literal' && typeof val.value === 'string') {
    return /^\d+px$/.test(val.value);
  }
  return false;
}

function hasDynamicTextChild(element: TSESTree.JSXElement): boolean {
  return element.children.some(
    (child) => child.type === 'JSXExpressionContainer' && child.expression.type !== 'JSXEmptyExpression',
  );
}

export default createRule({
  name: 'text-overflow-handling',
  meta: {
    type: 'problem',
    docs: { description: 'Require text overflow handling for fixed-width containers with dynamic content' },
    schema: [],
    messages: {
      missingOverflow: '固定宽度容器中包含动态文本，但缺少文本溢出处理。请添加 overflow: \'hidden\', textOverflow: \'ellipsis\', whiteSpace: \'nowrap\' 样式。',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXElement(node: TSESTree.JSXElement) {
        const opening = node.openingElement;
        if (!isFixedWidth(opening)) return;
        if (!hasDynamicTextChild(node)) return;
        if (getStyleProperty(opening, 'overflow')) return;
        if (getStyleProperty(opening, 'textOverflow')) return;
        if (getStyleProperty(opening, 'whiteSpace')) return;
        context.report({ node: opening, messageId: 'missingOverflow' });
      },
    };
  },
});
