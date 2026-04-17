import { createRule } from '../../utils/rule-helpers';
import { isInsideEventHandler } from '../../utils/jsx-helpers';
import { extractUseStatePair } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'no-state-in-render',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow setState/dispatch in render path' },
    schema: [],
    messages: {
      stateInRender:
        "在render路径中直接调用 '{{setterName}}' 会导致无限重渲染循环。请将状态更新移到事件处理函数、useEffect或useCallback中。",
    },
  },
  defaultOptions: [],
  create(context) {
    const setterNames = new Set<string>();

    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        const pair = extractUseStatePair(node);
        if (pair) {
          setterNames.add(pair.setter);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'Identifier') return;
        const name = node.callee.name;

        if (!setterNames.has(name) && name !== 'dispatch') return;

        // Check if inside event handler prop
        if (isInsideEventHandler(node)) return;

        // Check if inside useEffect/useCallback/useMemo callback
        let current: TSESTree.Node | undefined = node.parent;
        let insideCallback = false;
        while (current) {
          if (
            current.type === 'CallExpression' &&
            current.callee.type === 'Identifier' &&
            /^use(Effect|LayoutEffect|Callback|Memo)$/.test(current.callee.name)
          ) {
            insideCallback = true;
            break;
          }
          // Inside an arrow/function that is an event handler or local callback
          if (
            current.type === 'ArrowFunctionExpression' || current.type === 'FunctionExpression'
          ) {
            const p = current.parent;
            if (
              p?.type === 'JSXExpressionContainer' ||
              p?.type === 'VariableDeclarator' ||
              p?.type === 'Property' ||
              p?.type === 'CallExpression'
            ) {
              insideCallback = true;
              break;
            }
          }
          // Inside a named function (not the component itself)
          if (current.type === 'FunctionDeclaration' && current.id) {
            // If this is a component (starts with uppercase), it's the component body, not a callback
            if (/^[A-Z]/.test(current.id.name)) break;
            insideCallback = true;
            break;
          }
          current = current.parent;
        }

        if (insideCallback) return;

        // If we're in the component body directly (not in a callback), report
        context.report({
          node,
          messageId: 'stateInRender',
          data: { setterName: name },
        });
      },
    };
  },
});
