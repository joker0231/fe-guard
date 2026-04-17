import { createRule } from '../../utils/rule-helpers';
import { getStyleProperty } from '../../utils/jsx-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const WIDTH_PROPS = ['width', 'minWidth', 'maxWidth'] as const;
const THRESHOLD = 400;

export default createRule({
  name: 'no-hardcoded-pixel-width',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow hardcoded pixel widths > 400px in JSX style attributes' },
    schema: [],
    messages: {
      hardcodedWidth: '硬编码宽度 {{value}}px 可能导致移动端内容溢出。请使用百分比、maxWidth 约束或响应式方案。',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        for (const prop of WIDTH_PROPS) {
          const styleProp = getStyleProperty(node, prop);
          if (!styleProp) continue;
          const value = styleProp.value;
          if (value.type === 'Literal' && typeof value.value === 'number' && value.value > THRESHOLD) {
            context.report({ node: styleProp, messageId: 'hardcodedWidth', data: { value: String(value.value) } });
          }
          if (value.type === 'Literal' && typeof value.value === 'string') {
            const match = /^(\d+)px$/.exec(value.value);
            if (match && Number(match[1]) > THRESHOLD) {
              context.report({ node: styleProp, messageId: 'hardcodedWidth', data: { value: match[1] } });
            }
          }
        }
      },
    };
  },
});
