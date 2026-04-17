import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(
  (name) => `https://frontend-guard.dev/rules/${name}`
);

/**
 * Check if TypeScript type information is available.
 * Rules requiring type info should call this and skip if false.
 */
export function hasTypeInfo(context: { parserServices?: unknown }): boolean {
  const services = context.parserServices as Record<string, unknown> | undefined;
  return !!(services && services.hasFullTypeInformation);
}
