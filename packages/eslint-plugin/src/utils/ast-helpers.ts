import type { TSESTree } from '@typescript-eslint/utils';

type Node = TSESTree.Node;

/**
 * Check if a node is inside a try-catch block
 */
export function isInsideTryCatch(node: Node): boolean {
  let current: Node | undefined = node.parent;
  while (current) {
    if (current.type === 'TryStatement') {
      return true;
    }
    // Don't cross function boundaries
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression'
    ) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Check if a node is inside a function with a given ancestor type
 */
export function hasAncestor(node: Node, type: string): boolean {
  let current: Node | undefined = node.parent;
  while (current) {
    if (current.type === type) return true;
    current = current.parent;
  }
  return false;
}

/**
 * Get the enclosing function node
 */
export function getEnclosingFunction(
  node: Node,
): TSESTree.FunctionDeclaration | TSESTree.FunctionExpression | TSESTree.ArrowFunctionExpression | null {
  let current: Node | undefined = node.parent;
  while (current) {
    if (
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression'
    ) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

/**
 * Check if a node has a .catch() chain following it
 */
export function hasCatchChain(node: Node): boolean {
  const parent = node.parent;
  if (!parent) return false;

  // node.then(...).catch(...)
  if (
    parent.type === 'MemberExpression' &&
    parent.property.type === 'Identifier' &&
    parent.property.name === 'catch'
  ) {
    return true;
  }

  // Check if parent is a CallExpression whose parent is .catch()
  if (parent.type === 'CallExpression' && parent.parent) {
    const grandparent = parent.parent;
    if (
      grandparent.type === 'MemberExpression' &&
      grandparent.property.type === 'Identifier' &&
      grandparent.property.name === 'catch'
    ) {
      return true;
    }
    // .then(...).catch(...)
    if (
      grandparent.type === 'MemberExpression' &&
      grandparent.property.type === 'Identifier' &&
      grandparent.property.name === 'then' &&
      grandparent.parent?.type === 'CallExpression' &&
      grandparent.parent.parent?.type === 'MemberExpression'
    ) {
      const thenParentMember = grandparent.parent.parent as TSESTree.MemberExpression;
      if (
        thenParentMember.property.type === 'Identifier' &&
        thenParentMember.property.name === 'catch'
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if a CallExpression returns a promise that is properly handled
 * (awaited, .then/.catch chained, assigned, or void prefixed)
 */
export function isPromiseHandled(node: TSESTree.CallExpression): boolean {
  const parent = node.parent;
  if (!parent) return false;

  // await expr
  if (parent.type === 'AwaitExpression') return true;

  // assigned to variable
  if (parent.type === 'VariableDeclarator') return true;

  // return statement
  if (parent.type === 'ReturnStatement') return true;

  // void expr
  if (parent.type === 'UnaryExpression' && parent.operator === 'void') return true;

  // .then() or .catch() chain
  if (
    parent.type === 'MemberExpression' &&
    parent.property.type === 'Identifier' &&
    (parent.property.name === 'then' || parent.property.name === 'catch')
  ) {
    return true;
  }

  return false;
}

/**
 * Get the string value from a node (StringLiteral or TemplateLiteral with no expressions)
 */
export function getStaticStringValue(node: Node): string | null {
  if (node.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  if (
    node.type === 'TemplateLiteral' &&
    node.expressions.length === 0 &&
    node.quasis.length === 1
  ) {
    return node.quasis[0].value.cooked ?? null;
  }
  return null;
}
