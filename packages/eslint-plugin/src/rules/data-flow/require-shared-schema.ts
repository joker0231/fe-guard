import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

type MessageIds = 'localApiSchema';
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
 * Check if a variable name looks like an API schema
 */
function isApiSchemaName(name: string): boolean {
  // Must match both: operation prefix + schema suffix
  // e.g. createTaskSchema, UpdateUserInput, deleteItemPayload
  if (API_OPERATION_PREFIXES.test(name) && SCHEMA_SUFFIXES.test(name)) {
    return true;
  }
  return false;
}

/**
 * Check if a CallExpression is z.object({...}) and count its fields
 */
function isZodObjectCall(node: TSESTree.CallExpression): { isZodObject: boolean; fieldCount: number } {
  // z.object({...})
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
 * e.g. SharedSchema.pick({...}), SharedSchema.omit({...}), SharedSchema.extend({...})
 */
function isDerivedFromShared(node: TSESTree.Node): boolean {
  // Walk up to find if this is a method chain like SomeSchema.pick/omit/extend
  if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression') {
    const obj = node.callee.object;
    const prop = node.callee.property;
    if (prop.type === 'Identifier' && ['pick', 'omit', 'extend', 'merge', 'partial', 'required'].includes(prop.name)) {
      // The object being called on is likely a shared schema
      if (obj.type === 'Identifier' && /^[A-Z]/.test(obj.name)) {
        return true;
      }
    }
  }
  return false;
}

export default createRule<Options, MessageIds>({
  name: 'require-shared-schema',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'API request/response schemas should be defined in shared/ directory, not locally in src/. This ensures a single source of truth for the API contract.',
    },
    messages: {
      localApiSchema:
        'API schema "{{name}}" should be defined in shared/ directory and imported, not defined locally. ' +
        'Use shared schema directly or derive with .pick()/.omit()/.extend().',
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
        // const xxxSchema = z.object({...})
        if (node.id.type !== 'Identifier' || !node.init) return;

        const varName = node.id.name;
        let callExpr: TSESTree.CallExpression | null = null;

        // Direct: const xxx = z.object({...})
        if (node.init.type === 'CallExpression') {
          callExpr = node.init;
        }

        if (!callExpr) return;

        // Check if it's z.object()
        const { isZodObject, fieldCount } = isZodObjectCall(callExpr);
        if (!isZodObject) return;

        // Skip if derived from shared schema (e.g. SharedSchema.pick({...}).extend(z.object({...})))
        // This is a simple check - the z.object might be inside a chain
        if (isDerivedFromShared(callExpr)) return;

        // Check if variable name matches API schema pattern
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
      },
    };
  },
});