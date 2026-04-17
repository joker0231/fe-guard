import { createRule } from '../../utils/rule-helpers';
import { isSpecificDataDisplayField } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'no-undefined-render',
  meta: {
    type: 'problem',
    docs: { description: 'Prevent rendering potentially undefined object properties' },
    schema: [],
    messages: {
      undefinedRender:
        "'{{expression}}' 直接渲染对象属性而未做空值防御。后端返回null/undefined时会显示\"undefined\"或崩溃。请使用可选链 + 空值合并：`{{suggestion}}`。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXExpressionContainer(node: TSESTree.JSXExpressionContainer) {
        const expr = node.expression;
        if (expr.type === 'JSXEmptyExpression') return;

        // Only check MemberExpression (obj.prop) rendered directly
        if (expr.type !== 'MemberExpression') return;

        // Skip if already using optional chaining
        if (expr.optional) return;

        // Skip if parent of the chain has optional
        if (expr.type === 'MemberExpression' && expr.object.type === 'ChainExpression') return;

        // Skip simple identifiers (local vars, built-in objects)
        if (expr.object.type === 'Identifier') {
          const objName = expr.object.name;
          // Always skip built-in globals
          if (['React', 'Math', 'console', 'window', 'document', 'JSON', 'Object', 'Array', 'Date', 'Number', 'String'].includes(objName)) return;
          // props.xxx (one level) is safe; props.xxx.yyy (two+ levels) needs guard
          if (objName === 'props') return;
        }
        // For props.a.b chains: props.a is the object (MemberExpression), .b is the property
        // If the object is itself a MemberExpression starting with props, report it
        if (
          expr.object.type === 'MemberExpression' &&
          expr.object.object.type === 'Identifier' &&
          expr.object.object.name === 'props' &&
          !expr.object.optional
        ) {
          // This is props.xxx.yyy — two+ levels, needs optional chaining
          // Don't return, fall through to report
        } else if (expr.object.type === 'MemberExpression') {
          // Other deep chains are already handled by the general logic below
        }

        // Skip if inside a conditional or logical expression
        if (node.parent?.type === 'ConditionalExpression') return;
        if (node.parent?.type === 'LogicalExpression') return;

        // Skip fields already covered by more specific data-display rules
        if (
          expr.property.type === 'Identifier' &&
          isSpecificDataDisplayField(expr.property.name)
        ) return;

        // Check it's a direct render (parent is JSXElement)
        const parent = node.parent;
        if (parent?.type !== 'JSXElement' && parent?.type !== 'JSXFragment') return;

        const exprText = context.sourceCode.getText(expr);
        // Create suggestion with optional chaining
        const suggestion = exprText.replace(/\./g, '?.') + " ?? '默认值'";

        context.report({
          node: expr,
          messageId: 'undefinedRender',
          data: { expression: exprText, suggestion },
        });
      },
    };
  },
});
