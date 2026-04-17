import { createRule } from '../../utils/rule-helpers';
import { extractUseStatePair, isUseEffect } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'no-effect-set-state-loop',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow setState in useEffect that triggers infinite re-render loop' },
    schema: [],
    messages: {
      setStateLoop:
        "'{{setter}}' 会更新 '{{stateVar}}'，而 '{{stateVar}}' 在 useEffect 依赖数组中，导致无限循环。请使用函数式更新 setX(prev => ...) 并从依赖数组中移除 '{{stateVar}}'。",
    },
  },
  defaultOptions: [],
  create(context) {
    const statePairs = new Map<string, string>();

    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        const pair = extractUseStatePair(node);
        if (pair) statePairs.set(pair.setter, pair.state);
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (!isUseEffect(node)) return;
        if (node.arguments.length < 2) return;

        const callback = node.arguments[0];
        const depsArg = node.arguments[1];
        if (depsArg.type !== 'ArrayExpression') return;

        const depNames = new Set<string>();
        for (const el of depsArg.elements) {
          if (el && el.type === 'Identifier') depNames.add(el.name);
        }

        const fn = callback.type === 'ArrowFunctionExpression' || callback.type === 'FunctionExpression'
          ? callback : null;
        if (!fn) return;

        const setterCalls = findSetterCalls(fn.body, statePairs);
        for (const { setter, stateVar } of setterCalls) {
          if (depNames.has(stateVar)) {
            context.report({
              node,
              messageId: 'setStateLoop',
              data: { setter, stateVar },
            });
          }
        }
      },
    };
  },
});

function findSetterCalls(
  node: TSESTree.Node,
  statePairs: Map<string, string>,
): Array<{ setter: string; stateVar: string }> {
  const results: Array<{ setter: string; stateVar: string }> = [];
  walk(node, (n) => {
    if (
      n.type === 'CallExpression' &&
      n.callee.type === 'Identifier' &&
      statePairs.has(n.callee.name)
    ) {
      results.push({
        setter: n.callee.name,
        stateVar: statePairs.get(n.callee.name)!,
      });
    }
  });
  return results;
}

function walk(node: TSESTree.Node, cb: (n: TSESTree.Node) => void) {
  cb(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            walk(item as TSESTree.Node, cb);
          }
        }
      } else if ('type' in child) {
        walk(child as TSESTree.Node, cb);
      }
    }
  }
}
