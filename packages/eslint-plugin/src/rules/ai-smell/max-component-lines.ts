import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

type Options = [{ maxLines?: number }];

const DEFAULT_MAX_LINES = 800;

/** Check if a function returns JSX (is a React component) */
function returnsJSX(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression): boolean {
  const { body } = node;

  // Arrow function with direct JSX return: () => <div/>
  if (body.type === 'JSXElement' || body.type === 'JSXFragment') {
    return true;
  }

  // Block body: check for return statements with JSX
  if (body.type === 'BlockStatement') {
    return body.body.some((stmt) => {
      if (stmt.type === 'ReturnStatement' && stmt.argument) {
        const arg = stmt.argument;
        return (
          arg.type === 'JSXElement' ||
          arg.type === 'JSXFragment' ||
          // Parenthesized JSX: return (<div/>)
          (arg.type === 'ConditionalExpression' &&
            (arg.consequent.type === 'JSXElement' || arg.alternate.type === 'JSXElement'))
        );
      }
      return false;
    });
  }

  return false;
}

function getComponentName(
  node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression,
): string {
  // function MyComponent() {}
  if (node.type === 'FunctionDeclaration' && node.id) {
    return node.id.name;
  }

  // const MyComponent = () => {} or const MyComponent = function() {}
  if (node.parent && node.parent.type === 'VariableDeclarator' && node.parent.id.type === 'Identifier') {
    return node.parent.id.name;
  }

  return 'Anonymous';
}

function getBodyLineCount(node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression): number {
  const startLine = node.loc.start.line;
  const endLine = node.loc.end.line;
  return endLine - startLine + 1;
}

export default createRule<Options, 'tooManyLines'>({
  name: 'max-component-lines',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce a maximum number of lines in React component functions to prevent AI-generated monoliths',
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxLines: { type: 'number', minimum: 50, default: DEFAULT_MAX_LINES },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooManyLines:
        '组件 "{{componentName}}" 有 {{lines}} 行，超过了 {{maxLines}} 行的限制。\n' +
        '请拆分为更小的子组件，每个组件应该只有一个职责。',
    },
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;

    function check(
      node: TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression,
    ) {
      if (!returnsJSX(node)) return;

      const lines = getBodyLineCount(node);
      if (lines > maxLines) {
        const componentName = getComponentName(node);
        context.report({
          node,
          messageId: 'tooManyLines',
          data: {
            componentName,
            lines: String(lines),
            maxLines: String(maxLines),
          },
        });
      }
    }

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check,
    };
  },
});