import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'require-suspense-boundary',
  meta: {
    type: 'problem',
    docs: { description: 'Require Suspense boundary for lazy-loaded components' },
    schema: [],
    messages: {
      missingSuspense:
        "懒加载组件 '{{componentName}}' 没有被 `<Suspense>` 包裹。组件加载期间会导致运行时崩溃。请用 `<Suspense fallback={<Loading />}>` 包裹该组件。",
    },
  },
  defaultOptions: [],
  create(context) {
    const lazyComponents = new Set<string>();

    return {
      // Track React.lazy() or lazy() calls
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== 'Identifier') return;
        const init = node.init;
        if (!init || init.type !== 'CallExpression') return;

        const callee = init.callee;
        // React.lazy(...)
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'React' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'lazy'
        ) {
          lazyComponents.add(node.id.name);
        }
        // lazy(...)
        if (callee.type === 'Identifier' && callee.name === 'lazy') {
          lazyComponents.add(node.id.name);
        }
      },

      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;
        if (!lazyComponents.has(node.name.name)) return;

        // Check if wrapped in Suspense
        let current: TSESTree.Node | undefined = node.parent;
        while (current) {
          if (
            current.type === 'JSXElement' &&
            current.openingElement.name.type === 'JSXIdentifier' &&
            current.openingElement.name.name === 'Suspense'
          ) {
            return;
          }
          current = current.parent;
        }

        context.report({
          node,
          messageId: 'missingSuspense',
          data: { componentName: node.name.name },
        });
      },
    };
  },
});
