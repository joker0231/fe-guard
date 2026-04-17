import { createRule } from '../../utils/rule-helpers';
import { isUseState, isUseEffect, extractUseStatePair } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

export default createRule({
  name: 'no-derived-state',
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow storing derived state that can be computed from other state' },
    schema: [],
    messages: {
      derivedState:
        "`{{stateName}}` 是从 `{{source}}` 派生的值，不需要独立的state。请改用 `useMemo`：`const {{stateName}} = useMemo(() => {{computation}}, [{{deps}}])`。",
    },
  },
  defaultOptions: [],
  create(context) {
    // Track useState pairs and useEffect calls within each function component scope
    const stateSetters = new Map<string, { stateName: string; node: TSESTree.VariableDeclarator }>();
    const effects: {
      node: TSESTree.CallExpression;
      deps: string[];
      setterCalls: { setter: string; argSource: string }[];
      bodyStatementsCount: number;
      hasAsyncOrSideEffect: boolean;
    }[] = [];

    return {
      VariableDeclarator(node) {
        const pair = extractUseStatePair(node);
        if (pair) {
          stateSetters.set(pair.setter, { stateName: pair.state, node });
        }
      },

      CallExpression(node) {
        if (!isUseEffect(node)) return;
        if (node.arguments.length < 2) return;

        const callback = node.arguments[0];
        if (
          callback.type !== 'ArrowFunctionExpression' &&
          callback.type !== 'FunctionExpression'
        ) return;

        const depsArg = node.arguments[1];
        if (depsArg.type !== 'ArrayExpression') return;

        const deps = depsArg.elements
          .filter((el): el is TSESTree.Identifier => el?.type === 'Identifier')
          .map(el => el.name);

        if (deps.length === 0) return;

        const body = callback.body;
        if (body.type !== 'BlockStatement') return;

        // Check if the effect body only contains setter calls (pure derivation)
        const setterCalls: { setter: string; argSource: string }[] = [];
        let hasAsyncOrSideEffect = false;

        for (const stmt of body.body) {
          if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'CallExpression') {
            const call = stmt.expression;
            if (call.callee.type === 'Identifier' && stateSetters.has(call.callee.name)) {
              const argSrc = call.arguments.length > 0
                ? context.sourceCode.getText(call.arguments[0])
                : '';
              setterCalls.push({ setter: call.callee.name, argSource: argSrc });
              continue;
            }
          }
          // If there's any return statement (cleanup function), it's not pure derivation
          if (stmt.type === 'ReturnStatement') {
            hasAsyncOrSideEffect = true;
          }
          // Any other statement means it's not pure derivation
          hasAsyncOrSideEffect = true;
        }

        if (setterCalls.length > 0) {
          effects.push({
            node,
            deps,
            setterCalls,
            bodyStatementsCount: body.body.length,
            hasAsyncOrSideEffect,
          });
        }
      },

      'Program:exit'() {
        for (const effect of effects) {
          // Only flag effects that ONLY contain setter calls (no side effects)
          if (effect.hasAsyncOrSideEffect) continue;
          if (effect.setterCalls.length !== effect.bodyStatementsCount) continue;

          for (const call of effect.setterCalls) {
            const stateInfo = stateSetters.get(call.setter);
            if (!stateInfo) continue;

            context.report({
              node: effect.node,
              messageId: 'derivedState',
              data: {
                stateName: stateInfo.stateName,
                source: effect.deps.join(', '),
                computation: call.argSource,
                deps: effect.deps.join(', '),
              },
            });
          }
        }
      },
    };
  },
});
