import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

/** Props that are allowed to have inline values */
const ALLOWED_PROPS = new Set(['key', 'ref']);

/** Check if a JSX element is a native HTML element (lowercase tag name) */
function isNativeElement(node: TSESTree.JSXOpeningElement): boolean {
  return node.name.type === 'JSXIdentifier' && /^[a-z]/.test(node.name.name);
}

function getInlineType(expr: TSESTree.Expression): string | null {
  switch (expr.type) {
    case 'ObjectExpression':
      return '对象字面量';
    case 'ArrayExpression':
      return '数组字面量';
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      return '函数';
    default:
      return null;
  }
}

export default createRule({
  name: 'no-unstable-jsx-props',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow inline object/array/function literals in JSX props that cause unnecessary re-renders',
    },
    schema: [],
    messages: {
      unstableProp:
        'JSX属性 "{{propName}}" 中使用了内联{{type}}，每次渲染都会创建新引用，可能导致子组件无限重渲染。\n' +
        '请将值提取到组件外部的常量，或使用 useMemo/useCallback。',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        // Only check named attributes with expression values
        if (
          node.name.type !== 'JSXIdentifier' ||
          !node.value ||
          node.value.type !== 'JSXExpressionContainer'
        ) {
          return;
        }

        const propName = node.name.name;

        // Skip allowed props (key, ref)
        if (ALLOWED_PROPS.has(propName)) return;

        // Skip style on native HTML elements (rare with Tailwind)
        if (propName === 'style') {
          const parent = node.parent;
          if (parent && parent.type === 'JSXOpeningElement' && isNativeElement(parent)) {
            return;
          }
        }

        const expr = node.value.expression;
        if (expr.type === 'JSXEmptyExpression') return;

        const inlineType = getInlineType(expr);
        if (inlineType) {
          context.report({
            node,
            messageId: 'unstableProp',
            data: { propName, type: inlineType },
          });
        }
      },
    };
  },
});