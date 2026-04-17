import type { TSESTree } from '@typescript-eslint/utils';

type Node = TSESTree.Node;

/**
 * Check if a function is a React component (starts with uppercase and returns JSX)
 */
export function isFunctionComponent(node: Node): boolean {
  if (node.type === 'FunctionDeclaration' && node.id) {
    return /^[A-Z]/.test(node.id.name);
  }
  if (
    node.type === 'VariableDeclarator' &&
    node.id.type === 'Identifier' &&
    /^[A-Z]/.test(node.id.name)
  ) {
    return true;
  }
  return false;
}

/**
 * Get the component name from a function node
 */
export function getComponentName(node: Node): string | null {
  if (node.type === 'FunctionDeclaration' && node.id) {
    return node.id.name;
  }
  if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier') {
    return node.id.name;
  }
  return null;
}

/**
 * Check if a CallExpression is a React hook
 */
export function isReactHook(node: TSESTree.CallExpression): boolean {
  if (node.callee.type !== 'Identifier') return false;
  return /^use[A-Z]/.test(node.callee.name);
}

/**
 * Check if a CallExpression is useState
 */
export function isUseState(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === 'Identifier' && node.callee.name === 'useState'
  );
}

/**
 * Check if a CallExpression is useEffect
 */
export function isUseEffect(node: TSESTree.CallExpression): boolean {
  return (
    node.callee.type === 'Identifier' &&
    (node.callee.name === 'useEffect' || node.callee.name === 'useLayoutEffect')
  );
}

/**
 * Extract useState pairs from a VariableDeclarator
 * e.g. const [foo, setFoo] = useState(...)
 * Returns { state: 'foo', setter: 'setFoo' } or null
 */
export function extractUseStatePair(
  node: TSESTree.VariableDeclarator,
): { state: string; setter: string } | null {
  if (
    node.init?.type !== 'CallExpression' ||
    !isUseState(node.init)
  ) {
    return null;
  }

  if (
    node.id.type === 'ArrayPattern' &&
    node.id.elements.length >= 2 &&
    node.id.elements[0]?.type === 'Identifier' &&
    node.id.elements[1]?.type === 'Identifier'
  ) {
    return {
      state: node.id.elements[0].name,
      setter: node.id.elements[1].name,
    };
  }

  return null;
}

/**
 * Common async data fetching patterns
 */
export const ASYNC_FETCH_PATTERNS = [
  'fetch',
  'axios',
  'useQuery',
  'useSWR',
  'useMutation',
  'useInfiniteQuery',
] as const;

/**
 * Check if a CallExpression is an async data fetch call
 */
export function isAsyncFetchCall(node: TSESTree.CallExpression): boolean {
  if (node.callee.type === 'Identifier') {
    return ASYNC_FETCH_PATTERNS.includes(
      node.callee.name as (typeof ASYNC_FETCH_PATTERNS)[number],
    );
  }
  // axios.get(), axios.post(), etc.
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'axios'
  ) {
    return true;
  }
  return false;
}

/**
 * Check if a variable name matches loading state patterns
 */
export function isLoadingVariable(name: string): boolean {
  return /loading|isLoading|pending|isFetching/i.test(name);
}

/**
 * Check if a variable name matches error state patterns
 */
export function isErrorVariable(name: string): boolean {
  return /^(error|isError|err)$/i.test(name) || /error|isError/i.test(name);
}

// ── Field name patterns used by data-display rules ──
// These are exported so that generic rules (no-null-render, no-undefined-render)
// can skip fields already covered by more specific data-display rules.

const DATE_EXACT = new Set([
  'createdAt', 'updatedAt', 'deletedAt', 'startDate', 'endDate',
  'publishDate', 'dueDate', 'deadline', 'birthday', 'birthDate',
  'expireAt', 'timestamp',
]);
const DATE_SUFFIX = /(At|Date|Time)$/;

const BOOL_PREFIX = /^(is|has|can)[A-Z]/;
const BOOL_EXACT = new Set([
  'enabled', 'disabled', 'active', 'visible', 'deleted',
  'verified', 'locked', 'checked', 'selected', 'required',
]);

const ENUM_KEYWORDS = new Set([
  'status', 'type', 'level', 'state', 'role', 'category',
  'kind', 'mode', 'priority', 'gender', 'grade', 'phase',
]);

const NUMBER_KEYWORDS = new Set([
  'price', 'amount', 'total', 'count', 'balance', 'salary',
  'cost', 'fee', 'revenue', 'profit', 'quantity', 'score',
  'rate', 'percentage', 'discount',
]);

/**
 * Check if a property name is covered by a specific data-display rule
 * (date/boolean/enum/number). Used by generic rules to avoid duplicate reports.
 */
export function isSpecificDataDisplayField(propName: string): boolean {
  if (DATE_EXACT.has(propName) || DATE_SUFFIX.test(propName)) return true;
  if (BOOL_PREFIX.test(propName) || BOOL_EXACT.has(propName)) return true;
  if (ENUM_KEYWORDS.has(propName.toLowerCase())) return true;
  if (NUMBER_KEYWORDS.has(propName.toLowerCase())) return true;
  return false;
}
