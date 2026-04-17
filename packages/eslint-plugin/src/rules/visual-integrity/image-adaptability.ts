import { createRule } from '../../utils/rule-helpers';
import { getJSXElementName, getStyleProperty } from '../../utils/jsx-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'image-adaptability',
  meta: {
    type: 'suggestion',
    fixable: 'code',
    docs: { description: 'Require responsive styles on img/Image elements' },
    schema: [],
    messages: {
      missingAdaptability: '<{{element}}> 缺少自适应样式，可能导致图片变形或溢出容器。请添加 objectFit 和 maxWidth: \'100%\' 样式。',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const name = getJSXElementName(node);
        if (name !== 'img' && name !== 'Image') return;

        const hasObjectFit = !!getStyleProperty(node, 'objectFit');
        const hasMaxWidth100 = checkMaxWidth100(node);
        const hasWidth100 = checkWidth100(node);

        if (hasObjectFit && (hasMaxWidth100 || hasWidth100)) return;

        context.report({ node, messageId: 'missingAdaptability', data: { element: name } });
      },
    };
  },
});

function checkMaxWidth100(node: TSESTree.JSXOpeningElement): boolean {
  const prop = getStyleProperty(node, 'maxWidth');
  if (!prop) return false;
  return prop.value.type === 'Literal' && prop.value.value === '100%';
}

function checkWidth100(node: TSESTree.JSXOpeningElement): boolean {
  const prop = getStyleProperty(node, 'width');
  if (!prop) return false;
  return prop.value.type === 'Literal' && prop.value.value === '100%';
}
