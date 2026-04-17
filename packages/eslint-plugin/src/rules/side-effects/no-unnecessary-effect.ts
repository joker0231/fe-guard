import { createRule } from '../../utils/rule-helpers';
import { extractUseStatePair, isUseEffect } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const SIDE_EFFECT_NAMES = new Set([
  'fetch', 'axios', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'addEventListener', 'removeEventListener', 'console',
  'alert', 'confirm', 'prompt', 'requestAnimationFrame',
]);

function containsSideEffect(node: TSESTree.Node): boolean {
  if (node.type === 'CallExpression') {
    if (node.callee.type === 'Identifier' && SIDE_EFFECT_NAMES.has(node.callee.name)) return true;
    if (node.callee.type === 'MemberExpression') {
      if (node.callee.object.type === 'Identifier' && SIDE_EFFECT_NAMES.has(node.callee.object.name)) return true;
    }
  }
  if (node.type === 'AwaitExpression') return true;
  return false;
}

function walkBody(node: TSESTree.Node, cb: (n: TSESTree.Node) => boolean): boolean {
  if (cb(node)) return true;
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            if (walkBody(item as TSESTree.Node, cb)) return true;
          }
        }
      } else if ('type' in child) {
        if (walkBody(child as TSESTree.Node, cb)) return true;
      }
    }
  }
  return false;
}

export default createRule({
  name: 'no-unnecessary-effect',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow useEffect for pure state derivation (use useMemo instead)' },
    schema: [],
    messages: {
      unnecessaryEffect:
        "此 useEffect 仅用于从 props/state 派生新值，是不必要的副作用。请使用 useMemo 替代：const {{derivedVar}} = useMemo(() => {{computation}}, [deps])。",
    },
  },
  defaultOptions: [],
  create(context) {
    const setterToState = new Map<string, string>();

    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        const pair = extractUseStatePair(node);
        if (pair) setterToState.set(pair.setter, pair.state);
      },
      CallExpression(node: TSESTree.CallExpression) {
        if (!isUseEffect(node)) return;
        if (node.arguments.length < 2) return;

        const callback = node.arguments[0];
        if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') return;
        if (callback.async) return;

        const body = callback.body;
        if (body.type !== 'BlockStatement') return;
        if (body.body.length !== 1) return;

        const stmt = body.body[0];
        if (stmt.type !== 'ExpressionStatement') return;

        const expr = stmt.expression;
        if (expr.type !== 'CallExpression') return;
        if (expr.callee.type !== 'Identifier') return;
        if (!setterToState.has(expr.callee.name)) return;

        // Check no side effects in the argument
        if (expr.arguments.length > 0) {
          const hasSideEffect = walkBody(expr.arguments[0], containsSideEffect);
          if (hasSideEffect) return;
        }

        // Check callback has no return (cleanup)
        // Already ensured body has only 1 statement which is ExpressionStatement

        const derivedVar = setterToState.get(expr.callee.name)!;
        context.report({
          node,
          messageId: 'unnecessaryEffect',
          data: { derivedVar, computation: 'expression' },
        });
      },
    };
  },
});
