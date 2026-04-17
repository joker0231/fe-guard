import type { TSESLint } from '@typescript-eslint/utils';
import { core } from './core';

/**
 * Extended preset: Core 60 rules + 11 warning rules = 71 total.
 * Adds dark mode, error recovery, ecosystem deps, and quality rules.
 */
export const extended: TSESLint.FlatConfig.ConfigArray = [
  ...core,
  {
    rules: {
      // 板块17 暗色模式兼容
      'guard/no-hardcoded-color': 'warn',
      // 板块18 错误恢复能力
      'guard/token-expiry-handling': 'warn',
      // 板块11 AI代码气味（warning级别）
      'guard/max-component-lines': 'warn',
      // 板块6 状态管理（warning级别）
      'guard/require-lazy-state-init': 'warn',
      // 板块20 扩展规则
      'guard/list-pagination-or-virtual': 'warn',
      'guard/form-prevent-default': 'warn',
      'guard/no-derived-state': 'warn',
      'guard/form-validation-required': 'warn',
      'guard/safe-optional-render': 'warn',
      'guard/no-stale-request': 'warn',
      'guard/require-env-fallback': 'warn',
    },
  },
];
