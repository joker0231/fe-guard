import type { TSESTree } from '@typescript-eslint/utils';

type Node = TSESTree.Node;

/**
 * Check if a JSX attribute name starts with "on" (event handler)
 */
export function isEventHandlerProp(name: string): boolean {
  return /^on[A-Z]/.test(name);
}

/**
 * Get JSX element name as string
 */
export function getJSXElementName(node: TSESTree.JSXOpeningElement): string {
  if (node.name.type === 'JSXIdentifier') {
    return node.name.name;
  }
  if (node.name.type === 'JSXMemberExpression') {
    return `${getJSXMemberName(node.name)}`;
  }
  return '';
}

function getJSXMemberName(node: TSESTree.JSXMemberExpression): string {
  const object =
    node.object.type === 'JSXIdentifier'
      ? node.object.name
      : getJSXMemberName(node.object);
  return `${object}.${node.property.name}`;
}

/**
 * Get the value of a JSX attribute
 */
export function getJSXAttributeValue(
  attr: TSESTree.JSXAttribute,
): TSESTree.Expression | TSESTree.JSXExpression | null {
  if (!attr.value) return null;

  if (attr.value.type === 'JSXExpressionContainer') {
    return attr.value.expression.type === 'JSXEmptyExpression'
      ? null
      : attr.value.expression;
  }

  return attr.value;
}

/**
 * Find a specific JSX attribute on an element
 */
export function findJSXAttribute(
  node: TSESTree.JSXOpeningElement,
  name: string,
): TSESTree.JSXAttribute | null {
  for (const attr of node.attributes) {
    if (
      attr.type === 'JSXAttribute' &&
      attr.name.type === 'JSXIdentifier' &&
      attr.name.name === name
    ) {
      return attr;
    }
  }
  return null;
}

/**
 * Check if a JSX element has a specific attribute
 */
export function hasJSXAttribute(
  node: TSESTree.JSXOpeningElement,
  name: string,
): boolean {
  return findJSXAttribute(node, name) !== null;
}

/**
 * Check if a node is inside a JSX expression container that's a child of an event handler
 */
export function isInsideEventHandler(node: Node): boolean {
  let current: Node | undefined = node.parent;
  while (current) {
    if (
      current.type === 'JSXAttribute' &&
      current.name.type === 'JSXIdentifier' &&
      isEventHandlerProp(current.name.name)
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Check if a node is a JSX expression (inside { })
 */
export function isJSXExpression(node: Node): boolean {
  return node.parent?.type === 'JSXExpressionContainer';
}

/**
 * Get style property from JSX element's style attribute
 */
export function getStyleProperty(
  element: TSESTree.JSXOpeningElement,
  propertyName: string,
): TSESTree.Property | null {
  const styleAttr = findJSXAttribute(element, 'style');
  if (!styleAttr?.value) return null;

  const value =
    styleAttr.value.type === 'JSXExpressionContainer'
      ? styleAttr.value.expression
      : null;

  if (!value || value.type !== 'ObjectExpression') return null;

  for (const prop of value.properties) {
    if (
      prop.type === 'Property' &&
      prop.key.type === 'Identifier' &&
      prop.key.name === propertyName
    ) {
      return prop;
    }
  }
  return null;
}

/**
 * Check if children contain .map() call (dynamic list rendering)
 */
export function childrenHasMapCall(node: TSESTree.JSXElement | TSESTree.JSXFragment): boolean {
  for (const child of node.children) {
    if (child.type === 'JSXExpressionContainer') {
      const expr = child.expression;
      if (
        expr.type === 'CallExpression' &&
        expr.callee.type === 'MemberExpression' &&
        expr.callee.property.type === 'Identifier' &&
        expr.callee.property.name === 'map'
      ) {
        return true;
      }
    }
  }
  return false;
}
