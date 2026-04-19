import type { TSESLint } from '@typescript-eslint/utils';
import { extended } from './extended';

/**
 * All preset: Same 71 rules as extended, but with parserOptions.project
 * to enable full type information for the 4 rules that need it:
 * - fe-guard/no-falsy-render
 * - fe-guard/no-object-in-jsx
 * - fe-guard/no-floating-promise
 * - fe-guard/safe-optional-render
 *
 * Exported as a single config object (not an array) so that
 * `plugin.configs.all.rules` works for spreading into user configs.
 */
export const all: TSESLint.FlatConfig.Config = {
  ...extended,
  languageOptions: {
    parserOptions: {
      project: true,
    },
  },
};