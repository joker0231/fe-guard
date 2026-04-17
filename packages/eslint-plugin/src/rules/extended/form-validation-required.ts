import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const VALIDATION_LIBRARIES = [
  'handleSubmit',     // react-hook-form
  'validateFields',   // antd Form
  'validate',         // formik
  'validationSchema', // formik/yup
];

const HTML5_VALIDATION_ATTRS = new Set([
  'required', 'pattern', 'minLength', 'maxLength', 'min', 'max', 'type',
]);

export default createRule({
  name: 'form-validation-required',
  meta: {
    type: 'suggestion',
    docs: { description: 'Require validation logic in form submit handlers' },
    schema: [],
    messages: {
      missingValidation:
        "表单提交时缺少验证逻辑。无效数据会直接提交到后端。请添加表单验证：1) 使用HTML5属性（`required`、`type=\"email\"`）；2) 或使用验证库（react-hook-form、formik）；3) 或手动验证 `if (!field) return`。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'form') return;

        const onSubmitAttr = node.attributes.find(
          (attr): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'onSubmit'
        );
        if (!onSubmitAttr?.value) return;

        // Check if form children have HTML5 validation attributes
        const formElement = node.parent;
        if (formElement?.type === 'JSXElement' && hasHTML5Validation(formElement)) {
          return;
        }

        const value = onSubmitAttr.value;
        if (value.type !== 'JSXExpressionContainer') return;

        const expr = value.expression;
        if (expr.type === 'JSXEmptyExpression') return;

        // Check inline handler
        if (
          expr.type === 'ArrowFunctionExpression' ||
          expr.type === 'FunctionExpression'
        ) {
          if (hasValidationLogic(expr.body)) return;
          if (hasLibraryValidation(expr)) return;

          context.report({
            node: expr,
            messageId: 'missingValidation',
          });
          return;
        }

        // Check if it's a validation library wrapper: handleSubmit(onSubmit)
        if (
          expr.type === 'CallExpression' &&
          expr.callee.type === 'Identifier' &&
          VALIDATION_LIBRARIES.includes(expr.callee.name)
        ) {
          return;
        }

        // Check referenced function
        if (expr.type === 'Identifier') {
          const scope = context.sourceCode.getScope(node);
          const variable = findVariable(scope, expr.name);
          if (variable) {
            for (const def of variable.defs) {
              const defNode = def.node as TSESTree.Node;
              if (defNode.type === 'VariableDeclarator' && defNode.init) {
                const init = defNode.init;
                if (
                  (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') &&
                  (hasValidationLogic(init.body) || hasLibraryValidation(init))
                ) {
                  return;
                }
                // handleSubmit(fn)
                if (
                  init.type === 'CallExpression' &&
                  init.callee.type === 'Identifier' &&
                  VALIDATION_LIBRARIES.includes(init.callee.name)
                ) {
                  return;
                }
              }
              if (
                defNode.type === 'FunctionDeclaration' &&
                defNode.body &&
                hasValidationLogic(defNode.body)
              ) {
                return;
              }
            }
          }
        }
      },
    };
  },
});

function findVariable(scope: any, name: string): any {
  let current = scope;
  while (current) {
    const found = current.variables?.find((v: any) => v.name === name);
    if (found) return found;
    current = current.upper;
  }
  return null;
}

function hasValidationLogic(body: TSESTree.Node): boolean {
  if (body.type !== 'BlockStatement') return false;

  for (const stmt of body.body) {
    // Check for if-return pattern (validation guard)
    if (stmt.type === 'IfStatement') {
      if (
        stmt.consequent.type === 'ReturnStatement' ||
        (stmt.consequent.type === 'BlockStatement' &&
          stmt.consequent.body.some(s => s.type === 'ReturnStatement'))
      ) {
        return true;
      }
    }
  }
  return false;
}

function hasLibraryValidation(fn: TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression): boolean {
  const src = fn.body;
  if (src.type !== 'BlockStatement') return false;

  return src.body.some(stmt => {
    if (stmt.type !== 'ExpressionStatement') return false;
    const expr = stmt.expression;
    if (expr.type === 'AwaitExpression') {
      return isValidationCall(expr.argument);
    }
    return isValidationCall(expr);
  });
}

function isValidationCall(node: TSESTree.Node): boolean {
  if (node.type !== 'CallExpression') return false;
  if (node.callee.type === 'Identifier') {
    return VALIDATION_LIBRARIES.includes(node.callee.name);
  }
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier'
  ) {
    return VALIDATION_LIBRARIES.includes(node.callee.property.name);
  }
  return false;
}

function hasHTML5Validation(element: TSESTree.JSXElement): boolean {
  for (const child of element.children) {
    if (child.type === 'JSXElement') {
      const opening = child.openingElement;
      for (const attr of opening.attributes) {
        if (
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          HTML5_VALIDATION_ATTRS.has(attr.name.name) &&
          attr.name.name === 'required'
        ) {
          return true;
        }
      }
      // Recurse into children
      if (hasHTML5Validation(child)) return true;
    }
  }
  return false;
}
