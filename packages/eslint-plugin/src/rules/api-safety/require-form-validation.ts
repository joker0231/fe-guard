import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../../utils/rule-helpers';

type MessageIds = 'missingFormValidation' | 'missingSubmitValidation';

// Validation function/method names that count as "doing validation"
const VALIDATION_CALLS = new Set([
  'validateForm',
  'validate',
  'safeParse',
  'parse',
  'trigger',        // React Hook Form trigger()
  'handleSubmit',   // React Hook Form handleSubmit()
]);

// Check if a node is a call to handleSubmit (React Hook Form pattern)
function isHandleSubmitCall(node: TSESTree.Node): boolean {
  if (node.type === AST_NODE_TYPES.CallExpression) {
    if (
      node.callee.type === AST_NODE_TYPES.Identifier &&
      node.callee.name === 'handleSubmit'
    ) {
      return true;
    }
    // form.handleSubmit(callback)
    if (
      node.callee.type === AST_NODE_TYPES.MemberExpression &&
      node.callee.property.type === AST_NODE_TYPES.Identifier &&
      node.callee.property.name === 'handleSubmit'
    ) {
      return true;
    }
  }
  return false;
}

// Check if a call expression is a validation call
function isValidationCall(node: TSESTree.CallExpression): boolean {
  // Direct call: validateForm(...), safeParse(...)
  if (
    node.callee.type === AST_NODE_TYPES.Identifier &&
    VALIDATION_CALLS.has(node.callee.name)
  ) {
    return true;
  }
  // Method call: schema.safeParse(...), schema.parse(...), form.trigger(...)
  if (
    node.callee.type === AST_NODE_TYPES.MemberExpression &&
    node.callee.property.type === AST_NODE_TYPES.Identifier &&
    VALIDATION_CALLS.has(node.callee.property.name)
  ) {
    return true;
  }
  return false;
}

// Check if an AST subtree contains a validation call.
// Uses generic child-walking to avoid switch-case type narrowing issues.
// Skips 'parent' to prevent circular reference stack overflow.
const SKIP_KEYS = new Set(['parent', 'type', 'loc', 'range', 'start', 'end']);
const MAX_DEPTH = 15;

function containsValidationCall(node: TSESTree.Node, depth = 0): boolean {
  if (depth > MAX_DEPTH) return false;

  // Check if this node itself is a validation call
  if (node.type === AST_NODE_TYPES.CallExpression) {
    if (isValidationCall(node as TSESTree.CallExpression)) return true;
    if (isHandleSubmitCall(node)) return true;
  }

  // Walk all child properties generically
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue;
    const child = (node as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (
          item != null &&
          typeof item === 'object' &&
          typeof (item as TSESTree.Node).type === 'string'
        ) {
          if (containsValidationCall(item as TSESTree.Node, depth + 1)) return true;
        }
      }
    } else if (
      child != null &&
      typeof child === 'object' &&
      typeof (child as TSESTree.Node).type === 'string'
    ) {
      if (containsValidationCall(child as TSESTree.Node, depth + 1)) return true;
    }
  }
  return false;
}

// Resolve a function reference to its definition in the same scope
function resolveFunction(
  name: string,
  scope: TSESTree.Node,
): TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression | TSESTree.FunctionDeclaration | null {
  // Check BlockStatement body
  if (scope.type === AST_NODE_TYPES.BlockStatement || scope.type === AST_NODE_TYPES.Program) {
    const body = scope.body;
    for (const stmt of body) {
      // function handleRegister() { ... }
      if (
        stmt.type === AST_NODE_TYPES.FunctionDeclaration &&
        stmt.id?.name === name
      ) {
        return stmt;
      }
      // const handleRegister = () => { ... }
      if (stmt.type === AST_NODE_TYPES.VariableDeclaration) {
        for (const decl of stmt.declarations) {
          if (
            decl.id.type === AST_NODE_TYPES.Identifier &&
            decl.id.name === name &&
            decl.init != null &&
            (decl.init.type === AST_NODE_TYPES.ArrowFunctionExpression ||
              decl.init.type === AST_NODE_TYPES.FunctionExpression)
          ) {
            return decl.init;
          }
        }
      }
    }
  }
  return null;
}

// Find the enclosing function/program scope
function findEnclosingScope(node: TSESTree.Node): TSESTree.Node | null {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (
      current.type === AST_NODE_TYPES.FunctionDeclaration ||
      current.type === AST_NODE_TYPES.FunctionExpression ||
      current.type === AST_NODE_TYPES.ArrowFunctionExpression ||
      current.type === AST_NODE_TYPES.Program
    ) {
      // For functions, return their body; for Program, return Program itself
      if (current.type === AST_NODE_TYPES.Program) return current;
      if ('body' in current) {
        return current.body as TSESTree.Node;
      }
    }
    current = current.parent;
  }
  return null;
}

export const requireFormValidation = createRule<[], MessageIds>({
  name: 'require-form-validation',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require form submission handlers to include validation before API calls. Front-end validation should happen before sending data to the server.',
    },
    messages: {
      missingFormValidation:
        'Form onSubmit handler must include validation (e.g., validateForm(), schema.safeParse(), or use handleSubmit from React Hook Form) before submitting data.',
      missingSubmitValidation:
        'Submit button onClick handler must include validation before triggering API calls.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      // Detect onSubmit on JSX elements
      JSXAttribute(node) {
        if (
          node.name.type !== AST_NODE_TYPES.JSXIdentifier ||
          node.name.name !== 'onSubmit'
        ) {
          return;
        }

        const value = node.value;
        if (!value) return;

        // onSubmit={expression}
        if (value.type === AST_NODE_TYPES.JSXExpressionContainer) {
          const expr = value.expression;

          if (expr.type === AST_NODE_TYPES.JSXEmptyExpression) return;

          // onSubmit={handleSubmit(callback)} → OK (React Hook Form)
          if (isHandleSubmitCall(expr)) return;

          // onSubmit={(e) => { ... }} → check body
          if (
            expr.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            expr.type === AST_NODE_TYPES.FunctionExpression
          ) {
            if (!containsValidationCall(expr.body)) {
              context.report({
                node,
                messageId: 'missingFormValidation',
              });
            }
            return;
          }

          // onSubmit={handleRegister} → resolve function reference
          if (expr.type === AST_NODE_TYPES.Identifier) {
            const scope = findEnclosingScope(node);
            if (scope) {
              const fn = resolveFunction(expr.name, scope);
              if (fn) {
                if (!containsValidationCall(fn.body)) {
                  context.report({
                    node,
                    messageId: 'missingFormValidation',
                  });
                }
                return;
              }
            }
            // Can't resolve → skip (don't report, might be imported)
            return;
          }

          // onSubmit={someObj.method} → can't analyze, skip
        }
      },
    };
  },
});

export default requireFormValidation;