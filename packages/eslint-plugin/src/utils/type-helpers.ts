import type { TSESTree, ParserServicesWithTypeInformation } from '@typescript-eslint/utils';
import type ts from 'typescript';

/**
 * Try to get parser services with type information.
 * Returns null if type info is not available.
 */
export function getTypeServices(context: {
  parserServices?: unknown;
}): ParserServicesWithTypeInformation | null {
  const services = context.parserServices as Record<string, unknown> | undefined;
  if (!services || !services.hasFullTypeInformation) {
    return null;
  }
  return services as unknown as ParserServicesWithTypeInformation;
}

/**
 * Check if a type is number or includes number
 */
export function isNumberType(type: ts.Type, checker: ts.TypeChecker): boolean {
  if (type.isUnion()) {
    return type.types.some((t) => isNumberType(t, checker));
  }
  const typeStr = checker.typeToString(type);
  return typeStr === 'number' || (type.getFlags() & 8) !== 0; // ts.TypeFlags.Number = 8
}

/**
 * Check if a type is string or includes string
 */
export function isStringType(type: ts.Type, checker: ts.TypeChecker): boolean {
  if (type.isUnion()) {
    return type.types.some((t) => isStringType(t, checker));
  }
  const typeStr = checker.typeToString(type);
  return typeStr === 'string' || (type.getFlags() & 4) !== 0; // ts.TypeFlags.String = 4
}

/**
 * Check if a type is a Promise type
 */
export function isPromiseType(type: ts.Type, checker: ts.TypeChecker): boolean {
  const typeStr = checker.typeToString(type);
  if (typeStr.startsWith('Promise<')) return true;

  const symbol = type.getSymbol();
  if (symbol && symbol.getName() === 'Promise') return true;

  // Check if it has a .then method (thenable)
  const thenProp = type.getProperty('then');
  return !!thenProp;
}

/**
 * Check if a type is an object type (not a primitive)
 */
export function isObjectType(type: ts.Type, checker: ts.TypeChecker): boolean {
  const typeStr = checker.typeToString(type);

  // Exclude primitives
  if (['string', 'number', 'boolean', 'undefined', 'null', 'void', 'never', 'symbol', 'bigint'].includes(typeStr)) {
    return false;
  }

  // Exclude JSX.Element / ReactNode
  if (typeStr.includes('Element') || typeStr.includes('ReactNode') || typeStr.includes('ReactElement')) {
    return false;
  }

  // Check flags: Object = 524288
  if ((type.getFlags() & 524288) !== 0) return true;

  return typeStr.startsWith('{') || typeStr.endsWith('[]') || typeStr === 'Date' || typeStr === 'Map' || typeStr === 'Set';
}

/**
 * Get the type of a node using parser services
 */
export function getNodeType(
  node: TSESTree.Node,
  services: ParserServicesWithTypeInformation,
): ts.Type {
  const tsNode = services.esTreeNodeToTSNodeMap.get(node);
  const checker = services.program.getTypeChecker();
  return checker.getTypeAtLocation(tsNode);
}
