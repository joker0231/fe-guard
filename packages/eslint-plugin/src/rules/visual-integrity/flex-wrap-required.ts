import { createRule } from '../../utils/rule-helpers';
import { getStyleProperty, childrenHasMapCall } from '../../utils/jsx-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'flex-wrap-required',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: { description: 'Require flexWrap on flex containers with dynamic children' },
    schema: [],
    messages: {
      missingFlexWrap: 'Flex 容器包含动态子元素(.map)但缺少 flexWrap 属性。子元素过多时会溢出或压缩。请添加 flexWrap: \'wrap\'。',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXElement(node: TSESTree.JSXElement) {
        const opening = node.openingElement;
        const displayProp = getStyleProperty(opening, 'display');
        if (!displayProp) return;
        if (displayProp.value.type !== 'Literal' || displayProp.value.value !== 'flex') return;

        if (!childrenHasMapCall(node)) return;
        if (getStyleProperty(opening, 'flexWrap')) return;

        context.report({ node: opening, messageId: 'missingFlexWrap' });
      },
    };
  },
});
