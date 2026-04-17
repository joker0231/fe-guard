import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const COLOR_PROPERTIES = new Set([
  'color',
  'backgroundColor',
  'borderColor',
  'background',
  'borderTopColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderRightColor',
  'outlineColor',
  'fill',
  'stroke',
]);

const HEX_COLOR = /#[0-9a-fA-F]{3,8}/;
const RGB_COLOR = /rgba?\s*\(/;
const NAMED_COLORS = new Set([
  'white', 'black', 'red', 'blue', 'green', 'yellow', 'orange', 'purple',
  'pink', 'gray', 'grey', 'brown', 'cyan', 'magenta', 'lime', 'olive',
  'navy', 'teal', 'aqua', 'maroon', 'silver', 'fuchsia',
]);

function isHardcodedColor(value: string): boolean {
  if (HEX_COLOR.test(value)) return true;
  if (RGB_COLOR.test(value)) return true;
  if (NAMED_COLORS.has(value.toLowerCase())) return true;
  return false;
}

function isSafe(value: string): boolean {
  return value.includes('var(--');
}

function isThemeToken(node: TSESTree.Node): boolean {
  if (node.type === 'MemberExpression') {
    const src = getMemberSource(node);
    return src.startsWith('theme.');
  }
  return false;
}

function getMemberSource(node: TSESTree.MemberExpression): string {
  const prop = node.property.type === 'Identifier' ? node.property.name : '';
  if (node.object.type === 'Identifier') {
    return `${node.object.name}.${prop}`;
  }
  if (node.object.type === 'MemberExpression') {
    return `${getMemberSource(node.object)}.${prop}`;
  }
  return prop;
}

export default createRule({
  name: 'no-hardcoded-color',
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow hardcoded color values in JSX style attributes' },
    schema: [],
    messages: {
      hardcodedColor:
        "硬编码颜色值 `{{colorValue}}` 在暗色模式下可能不适配。请使用CSS变量：`var(--{{suggestedToken}})` 或 theme token。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXAttribute(node) {
        if (
          node.name.type !== 'JSXIdentifier' ||
          node.name.name !== 'style'
        ) return;

        const value = node.value;
        if (!value || value.type !== 'JSXExpressionContainer') return;

        const expr = value.expression;
        if (expr.type !== 'ObjectExpression') return;

        for (const prop of expr.properties) {
          if (prop.type !== 'Property') continue;
          if (prop.key.type !== 'Identifier') continue;
          if (!COLOR_PROPERTIES.has(prop.key.name)) continue;

          const propValue = prop.value;

          if (isThemeToken(propValue)) continue;

          if (propValue.type === 'Literal' && typeof propValue.value === 'string') {
            const colorStr = propValue.value;
            if (isSafe(colorStr)) continue;
            if (isHardcodedColor(colorStr)) {
              const suggested = prop.key.name === 'backgroundColor'
                ? 'bg-primary'
                : prop.key.name === 'color'
                  ? 'text-primary'
                  : prop.key.name.replace('Color', '');
              context.report({
                node: propValue,
                messageId: 'hardcodedColor',
                data: { colorValue: colorStr, suggestedToken: suggested },
              });
            }
          }

          if (
            propValue.type === 'TemplateLiteral' &&
            propValue.expressions.length === 0 &&
            propValue.quasis.length === 1
          ) {
            const raw = propValue.quasis[0].value.cooked ?? '';
            if (isSafe(raw)) continue;
            if (isHardcodedColor(raw)) {
              context.report({
                node: propValue,
                messageId: 'hardcodedColor',
                data: { colorValue: raw, suggestedToken: 'color-token' },
              });
            }
          }
        }
      },
    };
  },
});
