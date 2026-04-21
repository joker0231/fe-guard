import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

type Options = [{ mutationPatterns?: string[] }];

const DEFAULT_MUTATION_PATTERNS = [
  'fetch',
  'axios',
  'mutate',
  'mutation',
  'api',
  'http',
  'httpClient',
  'request',
];

const DEBOUNCE_PATTERNS = [
  'debounce',
  'throttle',
  'Debounce',
  'Throttle',
  'debounc',
  'delayed',
  'Delayed',
];

/**
 * Check if a name looks like a debounced/throttled function
 */
function isDebounced(name: string): boolean {
  return DEBOUNCE_PATTERNS.some((pattern) => name.includes(pattern));
}

/**
 * Check if a call expression looks like a network request / mutation
 * Skips calls that also match debounce/throttle patterns
 */
function isMutationCall(
  node: TSESTree.CallExpression,
  patterns: string[],
): boolean {
  const { callee } = node;

  // Direct call: fetch(), mutate(), request()
  if (callee.type === 'Identifier') {
    // Skip if name matches debounce/throttle pattern
    if (isDebounced(callee.name)) return false;
    return patterns.some((p) => callee.name.toLowerCase().includes(p.toLowerCase()));
  }

  // Member call: api.patch(), httpClient.post(), mutation.mutate(), client.fetch()
  if (callee.type === 'MemberExpression') {
    const objName = callee.object.type === 'Identifier' ? callee.object.name : '';
    const propName = callee.property.type === 'Identifier' ? callee.property.name : '';
    // Skip if object or property matches debounce/throttle pattern
    if (isDebounced(objName) || isDebounced(propName)) return false;
    return patterns.some((p) => objName.toLowerCase().includes(p.toLowerCase()))
        || patterns.some((p) => propName.toLowerCase().includes(p.toLowerCase()));
  }

  return false;
}

/**
 * Check if a call is mutationVar.mutate() or mutationVar.mutateAsync()
 */
function isMutationVarCall(
  node: TSESTree.CallExpression,
  mutationVars: Set<string>,
): boolean {
  const { callee } = node;
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    mutationVars.has(callee.object.name) &&
    callee.property.type === 'Identifier' &&
    (callee.property.name === 'mutate' || callee.property.name === 'mutateAsync')
  ) {
    return true;
  }
  return false;
}

/**
 * Check a single expression/statement for mutation calls
 */
function checkExprForMutation(
  expr: TSESTree.Expression,
  patterns: string[],
  mutationVars: Set<string>,
  results: TSESTree.CallExpression[],
): void {
  if (expr.type === 'CallExpression') {
    if (isMutationCall(expr, patterns) || isMutationVarCall(expr, mutationVars)) {
      results.push(expr);
    }
  }
  if (
    expr.type === 'AwaitExpression' &&
    expr.argument.type === 'CallExpression'
  ) {
    if (isMutationCall(expr.argument, patterns) || isMutationVarCall(expr.argument, mutationVars)) {
      results.push(expr.argument);
    }
  }
}

/**
 * Check statements for mutation calls (one level only, no deep recursion)
 */
function checkStatementsForMutations(
  stmts: TSESTree.Statement[],
  patterns: string[],
  mutationVars: Set<string>,
  results: TSESTree.CallExpression[],
  shallow?: boolean,
): void {
  for (const stmt of stmts) {
    if (stmt.type === 'ExpressionStatement') {
      checkExprForMutation(stmt.expression, patterns, mutationVars, results);
    }
    // Variable declaration: const res = fetch() / const res = await fetch()
    if (stmt.type === 'VariableDeclaration') {
      for (const decl of stmt.declarations) {
        if (decl.init) {
          checkExprForMutation(decl.init, patterns, mutationVars, results);
        }
      }
    }
    // ReturnStatement: return fetch(url)
    if (stmt.type === 'ReturnStatement' && stmt.argument) {
      checkExprForMutation(stmt.argument, patterns, mutationVars, results);
    }
    // IfStatement: one level shallow recursion into consequent/alternate
    if (stmt.type === 'IfStatement' && !shallow) {
      if (stmt.consequent.type === 'BlockStatement') {
        checkStatementsForMutations(stmt.consequent.body, patterns, mutationVars, results, true);
      } else if (stmt.consequent.type === 'ExpressionStatement') {
        checkExprForMutation(stmt.consequent.expression, patterns, mutationVars, results);
      }
      if (stmt.alternate) {
        if (stmt.alternate.type === 'BlockStatement') {
          checkStatementsForMutations(stmt.alternate.body, patterns, mutationVars, results, true);
        } else if (stmt.alternate.type === 'ExpressionStatement') {
          checkExprForMutation(stmt.alternate.expression, patterns, mutationVars, results);
        }
      }
    }
  }
}

/**
 * Find mutation calls in a function body (shallow — checks direct statements + one level if/return)
 */
function findMutationCalls(
  node: TSESTree.Node,
  patterns: string[],
  mutationVars: Set<string>,
): TSESTree.CallExpression[] {
  const results: TSESTree.CallExpression[] = [];

  // Case 1: Arrow shorthand — the body IS a CallExpression
  if (node.type === 'CallExpression') {
    if (isMutationCall(node, patterns) || isMutationVarCall(node, mutationVars)) {
      results.push(node);
    }
    return results;
  }

  // Case 2: BlockStatement — check direct statements + ReturnStatement + IfStatement
  if (node.type === 'BlockStatement') {
    checkStatementsForMutations(node.body, patterns, mutationVars, results);
  }

  return results;
}

/**
 * Check if a node is inside a React component function (starts with uppercase)
 */
function isComponentFunction(node: TSESTree.Node): node is (TSESTree.FunctionDeclaration | TSESTree.ArrowFunctionExpression | TSESTree.FunctionExpression) {
  // function MyComponent() {}
  if (node.type === 'FunctionDeclaration' && node.id) {
    return /^[A-Z]/.test(node.id.name);
  }
  // const MyComponent = () => {} or const MyComponent = function() {}
  if (
    (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') &&
    node.parent?.type === 'VariableDeclarator' &&
    node.parent.id?.type === 'Identifier'
  ) {
    return /^[A-Z]/.test(node.parent.id.name);
  }
  return false;
}

/**
 * Collect useMutation variable names from a component's body statements
 */
function collectMutationVars(stmts: TSESTree.Statement[]): Set<string> {
  const vars = new Set<string>();
  for (const stmt of stmts) {
    if (stmt.type !== 'VariableDeclaration') continue;
    for (const decl of stmt.declarations) {
      if (
        decl.id.type === 'Identifier' &&
        decl.init?.type === 'CallExpression' &&
        decl.init.callee.type === 'Identifier' &&
        decl.init.callee.name === 'useMutation'
      ) {
        vars.add(decl.id.name);
      }
    }
  }
  return vars;
}

/**
 * Collect function definitions from a component's body statements
 * Returns a map of function name → function body node
 */
function collectFunctionDefs(stmts: TSESTree.Statement[]): Map<string, TSESTree.Node> {
  const fns = new Map<string, TSESTree.Node>();
  for (const stmt of stmts) {
    // function handleXxx() { ... }
    if (stmt.type === 'FunctionDeclaration' && stmt.id) {
      fns.set(stmt.id.name, stmt.body);
    }
    // const handleXxx = () => { ... } or const handleXxx = function() { ... }
    if (stmt.type === 'VariableDeclaration') {
      for (const decl of stmt.declarations) {
        if (decl.id.type !== 'Identifier' || !decl.init) continue;
        if (decl.init.type === 'ArrowFunctionExpression') {
          fns.set(decl.id.name, decl.init.body);
        } else if (decl.init.type === 'FunctionExpression') {
          fns.set(decl.id.name, decl.init.body);
        }
        // useCallback: const handleXxx = useCallback(() => { ... }, [])
        if (
          decl.init.type === 'CallExpression' &&
          decl.init.callee.type === 'Identifier' &&
          decl.init.callee.name === 'useCallback' &&
          decl.init.arguments.length > 0
        ) {
          const cbArg = decl.init.arguments[0];
          if (cbArg.type === 'ArrowFunctionExpression' || cbArg.type === 'FunctionExpression') {
            fns.set(decl.id.name, cbArg.body);
          }
        }
      }
    }
  }
  return fns;
}

/**
 * Get the component body statements for a given node
 */
function getComponentBody(node: TSESTree.Node): TSESTree.Statement[] | null {
  // Walk up to find component function
  let current: TSESTree.Node | undefined = node;
  while (current) {
    if (isComponentFunction(current)) {
      if (current.type === 'FunctionDeclaration' || current.type === 'FunctionExpression') {
        return current.body.body;
      }
      if (current.type === 'ArrowFunctionExpression' && current.body.type === 'BlockStatement') {
        return current.body.body;
      }
    }
    current = current.parent;
  }
  return null;
}

export default createRule<Options, 'immediateMutation'>({
  name: 'no-immediate-mutation-on-input',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow direct API/mutation calls inside onChange handlers without debounce.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          mutationPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional patterns to detect mutation calls',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      immediateMutation:
        '`onChange`/`onInput` 中直接调用了网络请求/mutation，每次输入变化都会触发请求。请使用 `debounce` 包装（推荐300-500ms延迟），或改为在 `onBlur` 时提交。',
    },
  },
  defaultOptions: [{}],
  create(context) {
    const options = context.options[0] || {};
    const patterns = options.mutationPatterns
      ? [...DEFAULT_MUTATION_PATTERNS, ...options.mutationPatterns]
      : DEFAULT_MUTATION_PATTERNS;

    return {
      JSXAttribute(node) {
        // Check onChange and onInput
        if (
          node.name.type !== 'JSXIdentifier' ||
          (node.name.name !== 'onChange' && node.name.name !== 'onInput')
        ) {
          return;
        }

        const value = node.value;
        if (!value || value.type !== 'JSXExpressionContainer') return;

        const expr = value.expression;
        if (expr.type === 'JSXEmptyExpression') return;

        // Collect component-level context
        const componentBody = getComponentBody(node);
        const mutationVars = componentBody ? collectMutationVars(componentBody) : new Set<string>();

        // Case 1: onChange={handler} — reference to a function
        if (expr.type === 'Identifier') {
          if (isDebounced(expr.name)) return;

          // Try to find the function in component scope and check its body
          if (componentBody) {
            const functionDefs = collectFunctionDefs(componentBody);
            const fnBody = functionDefs.get(expr.name);
            if (fnBody) {
              const mutations = findMutationCalls(fnBody, patterns, mutationVars);
              if (mutations.length > 0) {
                context.report({ node, messageId: 'immediateMutation' });
              }
            }
          }
          return;
        }

        // Case 2: onChange={(e) => { ... }} or onChange={function(e) { ... }}
        let body: TSESTree.Node | null = null;

        if (expr.type === 'ArrowFunctionExpression') {
          body = expr.body;
        } else if (expr.type === 'FunctionExpression') {
          body = expr.body;
        }

        if (!body) return;

        // Check if the function body contains a debounced call at top level
        if (body.type === 'BlockStatement') {
          for (const stmt of body.body) {
            if (stmt.type === 'ExpressionStatement' && stmt.expression.type === 'CallExpression') {
              const callee = stmt.expression.callee;
              if (callee.type === 'Identifier' && isDebounced(callee.name)) {
                return; // Using debounced function, OK
              }
            }
          }
        } else if (body.type === 'CallExpression') {
          // Arrow shorthand: onChange={(e) => debouncedUpdate(e)}
          if (body.callee.type === 'Identifier' && isDebounced(body.callee.name)) {
            return;
          }
        }

        // Find mutation calls in the function body
        const mutations = findMutationCalls(body, patterns, mutationVars);
        if (mutations.length > 0) {
          context.report({ node, messageId: 'immediateMutation' });
        }
      },
    };
  },
});