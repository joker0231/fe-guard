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
 */
function isMutationCall(
  node: TSESTree.CallExpression,
  patterns: string[],
): boolean {
  const { callee } = node;

  // Direct call: fetch(), mutate(), request()
  if (callee.type === 'Identifier') {
    return patterns.some((p) => callee.name.toLowerCase().includes(p.toLowerCase()));
  }

  // Member call: api.patch(), httpClient.post(), mutation.mutate(), client.fetch()
  if (callee.type === 'MemberExpression') {
    const objName = callee.object.type === 'Identifier' ? callee.object.name : '';
    const propName = callee.property.type === 'Identifier' ? callee.property.name : '';
    return patterns.some((p) => objName.toLowerCase().includes(p.toLowerCase()))
        || patterns.some((p) => propName.toLowerCase().includes(p.toLowerCase()));
  }

  return false;
}

/**
 * Check a single expression/statement for mutation calls
 */
function checkExprForMutation(
  expr: TSESTree.Expression,
  patterns: string[],
  results: TSESTree.CallExpression[],
): void {
  if (expr.type === 'CallExpression' && isMutationCall(expr, patterns)) {
    results.push(expr);
  }
  if (
    expr.type === 'AwaitExpression' &&
    expr.argument.type === 'CallExpression' &&
    isMutationCall(expr.argument, patterns)
  ) {
    results.push(expr.argument);
  }
}

/**
 * Check statements for mutation calls (one level only, no deep recursion)
 */
function checkStatementsForMutations(
  stmts: TSESTree.Statement[],
  patterns: string[],
  results: TSESTree.CallExpression[],
  shallow?: boolean,
): void {
  for (const stmt of stmts) {
    if (stmt.type === 'ExpressionStatement') {
      checkExprForMutation(stmt.expression, patterns, results);
    }
    // Variable declaration: const res = fetch() / const res = await fetch()
    if (stmt.type === 'VariableDeclaration') {
      for (const decl of stmt.declarations) {
        if (decl.init) {
          checkExprForMutation(decl.init, patterns, results);
        }
      }
    }
    // ReturnStatement: return fetch(url)
    if (stmt.type === 'ReturnStatement' && stmt.argument) {
      checkExprForMutation(stmt.argument, patterns, results);
    }
    // IfStatement: one level shallow recursion into consequent/alternate
    if (stmt.type === 'IfStatement' && !shallow) {
      if (stmt.consequent.type === 'BlockStatement') {
        checkStatementsForMutations(stmt.consequent.body, patterns, results, true);
      } else if (stmt.consequent.type === 'ExpressionStatement') {
        checkExprForMutation(stmt.consequent.expression, patterns, results);
      }
      if (stmt.alternate) {
        if (stmt.alternate.type === 'BlockStatement') {
          checkStatementsForMutations(stmt.alternate.body, patterns, results, true);
        } else if (stmt.alternate.type === 'ExpressionStatement') {
          checkExprForMutation(stmt.alternate.expression, patterns, results);
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
): TSESTree.CallExpression[] {
  const results: TSESTree.CallExpression[] = [];

  // Case 1: Arrow shorthand — the body IS a CallExpression
  if (node.type === 'CallExpression') {
    if (isMutationCall(node, patterns)) {
      results.push(node);
    }
    return results;
  }

  // Case 2: BlockStatement — check direct statements + ReturnStatement + IfStatement
  if (node.type === 'BlockStatement') {
    checkStatementsForMutations(node.body, patterns, results);
  }

  return results;
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

        // Case 1: onChange={handler} — reference to a function
        // If the name contains debounce/throttle, skip
        if (expr.type === 'Identifier') {
          if (isDebounced(expr.name)) return;
          // Can't analyze external function body, skip
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
          // If any top-level call is a debounced function, skip
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
        const mutations = findMutationCalls(body, patterns);
        if (mutations.length > 0) {
          context.report({ node, messageId: 'immediateMutation' });
        }
      },
    };
  },
});