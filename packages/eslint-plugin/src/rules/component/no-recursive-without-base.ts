import { createRule } from '../../utils/rule-helpers';
import { getJSXElementName } from '../../utils/jsx-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'no-recursive-without-base',
  meta: {
    type: 'problem',
    docs: { description: 'Require base case for recursive components' },
    schema: [],
    messages: {
      missingBaseCase:
        "组件 '{{componentName}}' 递归引用自身但缺少终止条件。没有终止条件的递归会导致栈溢出崩溃。请添加条件判断确保递归有终止。",
    },
  },
  defaultOptions: [],
  create(context) {
    const componentStack: string[] = [];

    function enterFunction(node: TSESTree.FunctionDeclaration | TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression) {
      let name: string | null = null;
      if (node.type === 'FunctionDeclaration' && node.id) {
        name = node.id.name;
      } else if (node.parent?.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier') {
        name = node.parent.id.name;
      }
      if (name && /^[A-Z]/.test(name)) {
        componentStack.push(name);
      }
    }

    function exitFunction() {
      if (componentStack.length > 0) {
        componentStack.pop();
      }
    }

    return {
      FunctionDeclaration(node) { enterFunction(node); },
      'FunctionDeclaration:exit'() { exitFunction(); },
      ArrowFunctionExpression(node) { enterFunction(node); },
      'ArrowFunctionExpression:exit'() { exitFunction(); },
      FunctionExpression(node) { enterFunction(node); },
      'FunctionExpression:exit'() { exitFunction(); },

      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (componentStack.length === 0) return;
        const currentComponent = componentStack[componentStack.length - 1];
        const elementName = getJSXElementName(node);

        if (elementName !== currentComponent) return;

        // Check if inside a conditional (&&, ternary, if) within the component
        let current: TSESTree.Node | undefined = node.parent;
        while (current) {
          if (
            current.type === 'LogicalExpression' ||
            current.type === 'ConditionalExpression' ||
            current.type === 'IfStatement'
          ) {
            return; // Has conditional wrapping
          }
          // Stop at the component function boundary (uppercase name)
          if (
            current.type === 'FunctionDeclaration' && current.id &&
            /^[A-Z]/.test(current.id.name)
          ) break;
          if (
            (current.type === 'ArrowFunctionExpression' || current.type === 'FunctionExpression') &&
            current.parent?.type === 'VariableDeclarator' &&
            current.parent.id.type === 'Identifier' &&
            /^[A-Z]/.test(current.parent.id.name)
          ) break;
          current = current.parent;
        }

        context.report({
          node,
          messageId: 'missingBaseCase',
          data: { componentName: currentComponent },
        });
      },
    };
  },
});
