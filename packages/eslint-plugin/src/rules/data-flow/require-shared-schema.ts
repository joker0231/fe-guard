import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

type MessageIds = 'localApiSchema' | 'inlineFieldSchema';
type Options = [
  {
    /** Additional variable name patterns to match (regex strings) */
    additionalPatterns?: string[];
    /** Minimum number of z.object fields to trigger (default: 3) */
    minFields?: number;
  },
];

/**
 * API operation prefixes (camelCase start) that indicate an API schema
 */
const API_OPERATION_PREFIXES = /^(create|update|delete|patch|put|get|list|fetch|submit|remove|add|edit|save|upload|import|export)/i;

/**
 * Schema-like suffixes that indicate a schema definition
 */
const SCHEMA_SUFFIXES = /(Schema|Input|Output|Payload|Params|Body|Request|Response|Dto)$/;

/**
 * Business validation methods that indicate a field has domain-specific rules.
 * These always trigger regardless of arguments.
 */
const ALWAYS_BUSINESS_METHODS = new Set([
  'max', 'regex', 'email', 'url', 'uuid', 'cuid', 'cuid2', 'datetime', 'ip',
  'startsWith', 'endsWith', 'includes',
  'positive', 'negative', 'nonnegative', 'nonpositive', 'int', 'finite', 'safe',
  'gte', 'gt', 'lte', 'lt', 'multipleOf', 'step',
]);

/**
 * Methods that are business validation only when argument > 1.
 * .min(1) is "required" semantics, not business validation.
 */
const CONDITIONAL_BUSINESS_METHODS = new Set(['min', 'length']);

/**
 * Methods to skip (not business validation, just traverse through).
 */
const PASSTHROUGH_METHODS = new Set([
  'optional', 'nullable', 'nullish', 'default', 'describe', 'brand', 'catch',
  'pipe', 'transform', 'refine', 'superRefine', 'array', 'or', 'and',
  'readonly', 'promise', 'trim', 'toLowerCase', 'toUpperCase',
]);

/**
 * Check if a variable name looks like an API schema
 */
function isApiSchemaName(name: string): boolean {
  if (API_OPERATION_PREFIXES.test(name) && SCHEMA_SUFFIXES.test(name)) {
    return true;
  }
  return false;
}

/**
 * Check if a CallExpression is z.object({...}) and count its fields
 */
function isZodObjectCall(node: TSESTree.CallExpression): { isZodObject: boolean; fieldCount: number } {
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'z' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'object'
  ) {
    const arg = node.arguments[0];
    if (arg && arg.type === 'ObjectExpression') {
      return { isZodObject: true, fieldCount: arg.properties.length };
    }
    return { isZodObject: true, fieldCount: 0 };
  }
  return { isZodObject: false, fieldCount: 0 };
}

/**
 * Check if the z.object is derived from a shared schema
 */
function isDerivedFromShared(node: TSESTree.Node): boolean {
  if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
    const obj = node.callee.object;
    const prop = node.callee.property;
    if (prop.type === 'Identifier' && ['pick', 'omit', 'extend', 'merge', 'partial', 'required'].includes(prop.name)) {
      if (obj.type === 'Identifier' && /^[A-Z]/.test(obj.name)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Walk a chain of method calls to find the inner z.object() call.
 * Handles patterns like: z.object({...}).refine(...).transform(...)
 */
function findZodObjectInChain(node: TSESTree.CallExpression): TSESTree.CallExpression | null {
  const { isZodObject } = isZodObjectCall(node);
  if (isZodObject) return node;

  // Walk down: if callee is .refine/.transform/.pipe etc, check the object
  if (node.callee.type === 'MemberExpression') {
    const obj = node.callee.object;
    if (obj.type === 'CallExpression') {
      return findZodObjectInChain(obj);
    }
  }
  return null;
}

/**
 * Walk a Zod method chain and check for business validation methods.
 * Returns found business method names.
 *
 * Example chain: z.string().min(6).optional()
 * AST: CallExpression(.optional) → CallExpression(.min) → CallExpression(z.string)
 */
function findBusinessValidations(node: TSESTree.Node): string[] {
  const found: string[] = [];
  let current: TSESTree.Node = node;

  while (current.type === 'CallExpression') {
    const call = current as TSESTree.CallExpression;
    if (call.callee.type !== 'MemberExpression') break;

    const methodNode = call.callee.property;
    if (methodNode.type !== 'Identifier') break;

    const methodName = methodNode.name;

    if (ALWAYS_BUSINESS_METHODS.has(methodName)) {
      found.push(methodName);
    } else if (CONDITIONAL_BUSINESS_METHODS.has(methodName)) {
      // Check if first argument is a literal number > 1
      const firstArg = call.arguments[0];
      if (firstArg && firstArg.type === 'Literal' && typeof firstArg.value === 'number' && firstArg.value > 1) {
        found.push(`${methodName}(${firstArg.value})`);
      }
    }
    // For PASSTHROUGH_METHODS and unknown methods, just continue traversing

    current = call.callee.object;
  }

  return found;
}

/**
 * Check if a node is a Zod primitive call (z.string(), z.number(), etc.)
 * by walking to the root of the chain.
 */
function isZodPrimitiveChain(node: TSESTree.Node): boolean {
  let current: TSESTree.Node = node;

  while (current.type === 'CallExpression') {
    const call = current as TSESTree.CallExpression;
    if (call.callee.type !== 'MemberExpression') return false;
    current = call.callee.object;
  }

  // Root should be z.string() / z.number() etc. — but we already walked past it.
  // Actually let's re-check: the root of the chain should be a CallExpression
  // whose callee is z.<primitive>
  // Let me re-walk to find it properly.

  let root: TSESTree.Node = node;
  while (root.type === 'CallExpression') {
    const call = root as TSESTree.CallExpression;
    if (call.callee.type !== 'MemberExpression') return false;

    const obj = call.callee.object;
    const prop = call.callee.property;

    // Check if this is the z.<primitive>() root
    if (
      obj.type === 'Identifier' &&
      obj.name === 'z' &&
      prop.type === 'Identifier'
    ) {
      const ZOD_PRIMITIVES = new Set(['string', 'number', 'boolean', 'date', 'bigint', 'symbol', 'undefined', 'null', 'void', 'any', 'unknown', 'never', 'nan']);
      return ZOD_PRIMITIVES.has(prop.name);
    }

    root = obj;
  }

  return false;
}

/**
 * Get the field name from a Property node
 */
function getFieldName(prop: TSESTree.ObjectLiteralElement): string | null {
  if (prop.type === 'Property') {
    if (prop.key.type === 'Identifier') return prop.key.name;
    if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') return prop.key.value;
  }
  return null;
}

export default createRule<Options, MessageIds>({
  name: 'require-shared-schema',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'API request/response schemas should be defined in shared/ directory, not locally in src/. ' +
        'Field schemas with business validation rules should also be imported from shared/.',
    },
    messages: {
      localApiSchema:
        'API schema "{{name}}" should be defined in shared/ directory and imported, not defined locally. ' +
        'Use shared schema directly or derive with .pick()/.omit()/.extend().',
      inlineFieldSchema:
        'Field "{{fieldName}}" has inline validation ({{validations}}). ' +
        'Import a shared field schema from shared/ instead. ' +
        'Check shared/ for an existing "{{fieldName}}Schema" first; create one in shared/ only if not found.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          additionalPatterns: {
            type: 'array',
            items: { type: 'string' },
          },
          minFields: {
            type: 'number',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  create(context, [options]) {
    const filename = context.filename || context.getFilename();

    // Skip shared/ directory, server/ directory, test files, components/ui/
    if (
      filename.includes('/shared/') ||
      filename.startsWith('shared/') ||
      filename.includes('/server/') ||
      filename.startsWith('server/') ||
      filename.includes('__test') ||
      filename.includes('.test.') ||
      filename.includes('.spec.') ||
      filename.includes('/components/ui/') ||
      filename.startsWith('components/ui/')
    ) {
      return {};
    }

    const minFields = options.minFields ?? 3;
    const additionalPatterns = (options.additionalPatterns || []).map((p) => new RegExp(p));

    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== 'Identifier' || !node.init) return;

        const varName = node.id.name;
        let callExpr: TSESTree.CallExpression | null = null;

        if (node.init.type === 'CallExpression') {
          callExpr = node.init;
        }

        if (!callExpr) return;

        // Find z.object() - may be wrapped in .refine()/.transform()/.pipe() etc.
        const zodObjectCall = findZodObjectInChain(callExpr);
        if (!zodObjectCall) return;

        const { isZodObject, fieldCount } = isZodObjectCall(zodObjectCall);
        if (!isZodObject) return;

        // Skip if derived from shared schema
        if (isDerivedFromShared(zodObjectCall)) return;

        // --- Original check: localApiSchema ---
        const matchesApiPattern = isApiSchemaName(varName);
        const matchesAdditional = additionalPatterns.some((p) => p.test(varName));
        const isLargeSchema = fieldCount >= minFields && SCHEMA_SUFFIXES.test(varName);

        if (matchesApiPattern || matchesAdditional || isLargeSchema) {
          context.report({
            node: node.id,
            messageId: 'localApiSchema',
            data: { name: varName },
          });
        }

        // --- New check: inlineFieldSchema ---
        // Check each field in z.object({...}) for inline business validation
        const arg = zodObjectCall.arguments[0];
        if (!arg || arg.type !== 'ObjectExpression') return;

        for (const prop of arg.properties) {
          const fieldName = getFieldName(prop);
          if (!fieldName) continue;
          if (prop.type !== 'Property') continue;

          const fieldValue = prop.value;
          if (fieldValue.type !== 'CallExpression') continue;

          // Check if it's a Zod primitive chain with business validation
          if (!isZodPrimitiveChain(fieldValue)) continue;

          const validations = findBusinessValidations(fieldValue);
          if (validations.length > 0) {
            context.report({
              node: prop,
              messageId: 'inlineFieldSchema',
              data: {
                fieldName,
                validations: validations.join(', '),
              },
            });
          }
        }
      },
    };
  },
});