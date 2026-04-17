import type { TSESLint } from '@typescript-eslint/utils';
import { extended } from './extended';

/**
 * All preset: Same 73 rules as extended, but with parserOptions.project
 * to enable full type information for the 4 rules that need it:
 * - guard/no-falsy-render
 * - guard/no-object-in-jsx
 * - guard/no-floating-promise
 * - guard/safe-optional-render
 */
export const all: TSESLint.FlatConfig.ConfigArray = [
  ...extended,
  {
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
  },
];
