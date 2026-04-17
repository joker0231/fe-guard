import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'form-prevent-default',
  meta: {
    type: 'suggestion',
    docs: { description: 'Require preventDefault in form submit handlers' },
    schema: [],
    messages: {
      missingPreventDefault:
        "`<form>` 的 `onSubmit` 未调用 `e.preventDefault()`，提交表单会触发页面刷新。请在处理函数开头添加 `e.preventDefault()`。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node) {
        // Only check <form> elements
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'form') return;

        const onSubmitAttr = node.attributes.find(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'onSubmit'
        );
        if (!onSubmitAttr?.value) return;

        const value = onSubmitAttr.value;
        if (value.type !== 'JSXExpressionContainer') return;

        const expr = value.expression;
        if (expr.type === 'JSXEmptyExpression') return;

        // Check inline arrow/function expressions
        if (
          expr.type === 'ArrowFunctionExpression' ||
          expr.type === 'FunctionExpression'
        ) {
          if (hasPreventDefault(expr)) return;
          context.report({
            node: expr,
            messageId: 'missingPreventDefault',
          });
          return;
        }

        // Check if it references a function that has preventDefault
        if (expr.type === 'Identifier') {
          const scope = context.sourceCode.getScope(node);
          const variable = findVariable(scope, expr.name);
          if (!variable) return; // Can't resolve — avoid false positive

          let foundFunction = false;
          for (const def of variable.defs) {
            const defNode = def.node;
            if (defNode.type === 'VariableDeclarator' && defNode.init) {
              if (
                defNode.init.type === 'ArrowFunctionExpression' ||
                defNode.init.type === 'FunctionExpression'
              ) {
                foundFunction = true;
                if (hasPreventDefault(defNode.init)) return; // OK
              }
            }
            if (defNode.type === 'FunctionDeclaration') {
              foundFunction = true;
              if (defNode.body && hasPreventDefaultInBody(defNode.body)) return; // OK
            }
          }
          if (foundFunction) {
            context.report({ node: onSubmitAttr, messageId: 'missingPreventDefault' });
          }
          return;
        }
      },
    };
  },
});

function findVariable(scope: { variables: { name: string; defs: { node: TSESTree.Node }[] }[]; upper: typeof scope | null }, name: string): { defs: { node: TSESTree.Node }[] } | null {
  let current: typeof scope | null = scope;
  while (current) {
    const found = current.variables.find(v => v.name === name);
    if (found) return found;
    current = current.upper;
  }
  return null;
}

function hasPreventDefault(fn: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression): boolean {
  // Must have at least one parameter (the event)
  if (fn.params.length === 0) return false;

  const paramName = fn.params[0].type === 'Identifier' ? fn.params[0].name : null;
  if (!paramName) return false;

  if (fn.body.type === 'BlockStatement') {
    return hasPreventDefaultInBody(fn.body, paramName);
  }
  // Expression body: e.g. () => e.preventDefault() is unlikely for onSubmit
  return checkExprForPreventDefault(fn.body, paramName);
}

function hasPreventDefaultInBody(body: TSESTree.BlockStatement, paramName?: string): boolean {
  for (const stmt of body.body) {
    if (stmt.type === 'ExpressionStatement') {
      if (checkExprForPreventDefault(stmt.expression, paramName)) return true;
    }
  }
  return false;
}

function checkExprForPreventDefault(expr: TSESTree.Node, paramName?: string): boolean {
  if (expr.type === 'CallExpression') {
    const callee = expr.callee;
    if (
      callee.type === 'MemberExpression' &&
      callee.property.type === 'Identifier' &&
      callee.property.name === 'preventDefault'
    ) {
      if (!paramName) return true;
      if (callee.object.type === 'Identifier' && callee.object.name === paramName) {
        return true;
      }
    }
  }
  return false;
}
