import { createRule } from '../../utils/rule-helpers';
import { isUseEffect } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const BINDING_CLEANUP_PAIRS: Record<string, string> = {
  setInterval: 'clearInterval',
  setTimeout: 'clearTimeout',
  addEventListener: 'removeEventListener',
  subscribe: 'unsubscribe',
  on: 'off',
};

const CONSTRUCTOR_CLEANUP_PAIRS: Record<string, string> = {
  WebSocket: 'close',
  AbortController: 'abort',
  EventSource: 'close',
};

export default createRule({
  name: 'require-cleanup-bindings',
  meta: {
    type: 'problem',
    docs: { description: 'Require cleanup for bindings in useEffect (setInterval, addEventListener, etc.)' },
    schema: [],
    messages: {
      missingCleanup:
        "useEffect 中调用了 '{{bindingCall}}'，但缺少对应的清理操作 '{{cleanupCall}}'。未清理的绑定会导致内存泄漏。请在 useEffect 的 return 函数中调用 '{{cleanupCall}}'。",
      missingConstructorCleanup:
        "useEffect 中创建了 '{{constructorName}}' 实例，但缺少对应的清理操作 '.{{cleanupMethod}}()'。未清理的资源会导致内存泄漏。请在 useEffect 的 return 函数中调用 '.{{cleanupMethod}}()'。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isUseEffect(node)) return;
        const callback = node.arguments[0];
        if (!callback) return;
        if (callback.type !== 'ArrowFunctionExpression' && callback.type !== 'FunctionExpression') return;
        if (callback.body.type !== 'BlockStatement') return;

        const bindings = findBindingCalls(callback.body);
        const constructors = findConstructorCalls(callback.body);
        if (bindings.length === 0 && constructors.length === 0) return;

        const cleanupCalls = findCleanupCalls(callback.body);

        for (const binding of bindings) {
          const expected = BINDING_CLEANUP_PAIRS[binding.name];
          if (expected && !cleanupCalls.has(expected)) {
            context.report({
              node: binding.node,
              messageId: 'missingCleanup',
              data: { bindingCall: binding.name, cleanupCall: expected },
            });
          }
        }

        for (const ctor of constructors) {
          const expected = CONSTRUCTOR_CLEANUP_PAIRS[ctor.name];
          if (expected && !cleanupCalls.has(expected)) {
            context.report({
              node: ctor.node,
              messageId: 'missingConstructorCleanup',
              data: { constructorName: ctor.name, cleanupMethod: expected },
            });
          }
        }
      },
    };
  },
});

interface BindingInfo { name: string; node: TSESTree.CallExpression; }
interface ConstructorInfo { name: string; node: TSESTree.NewExpression; }

function findBindingCalls(body: TSESTree.BlockStatement): BindingInfo[] {
  const results: BindingInfo[] = [];
  walkStatements(body, (n) => {
    if (n.type !== 'CallExpression') return;
    const name = getCallName(n as TSESTree.CallExpression);
    if (name && name in BINDING_CLEANUP_PAIRS) {
      results.push({ name, node: n as TSESTree.CallExpression });
    }
  });
  return results;
}

function findConstructorCalls(body: TSESTree.BlockStatement): ConstructorInfo[] {
  const results: ConstructorInfo[] = [];
  walkStatements(body, (n) => {
    if (n.type !== 'NewExpression') return;
    const expr = n as TSESTree.NewExpression;
    if (expr.callee.type === 'Identifier' && expr.callee.name in CONSTRUCTOR_CLEANUP_PAIRS) {
      results.push({ name: expr.callee.name, node: expr });
    }
  });
  return results;
}

function findCleanupCalls(body: TSESTree.BlockStatement): Set<string> {
  const calls = new Set<string>();
  // Find the return statement with a function
  for (const stmt of body.body) {
    if (stmt.type === 'ReturnStatement' && stmt.argument) {
      const arg = stmt.argument;
      if (arg.type === 'ArrowFunctionExpression' || arg.type === 'FunctionExpression') {
        if (arg.body.type === 'BlockStatement') {
          walkStatements(arg.body, (n) => {
            if (n.type === 'CallExpression') {
              const name = getCallName(n);
              if (name) calls.add(name);
            }
          });
        } else if (arg.body.type === 'CallExpression') {
          const name = getCallName(arg.body);
          if (name) calls.add(name);
        }
      }
    }
  }
  return calls;
}

function getCallName(node: TSESTree.CallExpression): string | null {
  if (node.callee.type === 'Identifier') return node.callee.name;
  if (node.callee.type === 'MemberExpression' && node.callee.property.type === 'Identifier') {
    return node.callee.property.name;
  }
  return null;
}

function walkStatements(node: TSESTree.Node, cb: (n: TSESTree.Node) => void) {
  cb(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            // Don't descend into nested functions (they have their own scope)
            const t = (item as TSESTree.Node).type;
            if (t === 'ArrowFunctionExpression' || t === 'FunctionExpression' || t === 'FunctionDeclaration') continue;
            walkStatements(item as TSESTree.Node, cb);
          }
        }
      } else if ('type' in child) {
        const t = (child as TSESTree.Node).type;
        if (t === 'ArrowFunctionExpression' || t === 'FunctionExpression' || t === 'FunctionDeclaration') return;
        walkStatements(child as TSESTree.Node, cb);
      }
    }
  }
}
