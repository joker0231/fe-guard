import { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../../utils/rule-helpers';

type MessageIds = 'missingOnError' | 'missingOnSuccess';

export default createRule<[], MessageIds>({
  name: 'require-mutation-callbacks',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require useMutation to handle both success and error states via onSuccess and onError callbacks',
    },
    schema: [],
    messages: {
      missingOnError:
        'useMutation is missing "onError" callback. Handle the error state — show a toast/notification to the user if appropriate.',
      missingOnSuccess:
        'useMutation is missing "onSuccess" callback. Handle the success state — show a toast/notification to the user if appropriate.',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Match useMutation(...) calls
        if (!isUseMutationCall(node)) return;

        const optionsArg = findOptionsArg(node);
        if (!optionsArg) return;

        // Only check inline object expressions
        if (optionsArg.type !== 'ObjectExpression') return;

        const properties = optionsArg.properties;
        const hasOnSuccess = hasProperty(properties, 'onSuccess');
        const hasOnError = hasProperty(properties, 'onError');

        if (!hasOnSuccess) {
          context.report({
            node,
            messageId: 'missingOnSuccess',
          });
        }

        if (!hasOnError) {
          context.report({
            node,
            messageId: 'missingOnError',
          });
        }
      },
    };
  },
});

function isUseMutationCall(node: TSESTree.CallExpression): boolean {
  // useMutation(...)
  if (
    node.callee.type === 'Identifier' &&
    node.callee.name === 'useMutation'
  ) {
    return true;
  }
  // someClient.useMutation(...)
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'useMutation'
  ) {
    return true;
  }
  return false;
}

function findOptionsArg(
  node: TSESTree.CallExpression,
): TSESTree.Expression | undefined {
  // useMutation({ mutationFn, onSuccess, onError })
  // useMutation(mutationFn, { onSuccess, onError })
  // TanStack Query v5: single object arg
  // TanStack Query v4: (mutationFn, options) or (options)
  if (node.arguments.length === 0) return undefined;

  const firstArg = node.arguments[0];

  // Single object arg (v5 pattern)
  if (
    firstArg &&
    firstArg.type === 'ObjectExpression'
  ) {
    return firstArg;
  }

  // Two args: (mutationFn, options)
  if (node.arguments.length >= 2) {
    const secondArg = node.arguments[1];
    if (
      secondArg &&
      secondArg.type === 'ObjectExpression'
    ) {
      return secondArg;
    }
  }

  return undefined;
}

function hasProperty(
  properties: TSESTree.ObjectLiteralElement[],
  name: string,
): boolean {
  return properties.some(
    (prop) =>
      prop.type === 'Property' &&
      ((prop.key.type === 'Identifier' && prop.key.name === name) ||
        (prop.key.type === 'Literal' && prop.key.value === name)),
  );
}