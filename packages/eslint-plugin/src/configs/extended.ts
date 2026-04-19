import type { TSESLint } from '@typescript-eslint/utils';
import { core } from './core';

/**
 * Extended preset: Core 60 rules + 11 warning rules = 71 total.
 * Adds dark mode, error recovery, ecosystem deps, and quality rules.
 *
 * Exported as a single config object (not an array) so that
 * `plugin.configs.extended.rules` works for spreading into user configs.
 */
export const extended: TSESLint.FlatConfig.Config = {
  rules: {
    ...core.rules,
    // 板块17 暗色模式兼容
    'fe-guard/no-hardcoded-color': 'warn',
    // 板块18 错误恢复能力
    'fe-guard/token-expiry-handling': 'warn',
    // 板块11 AI代码气味（warning级别）
    'fe-guard/max-component-lines': 'warn',
    // 板块6 状态管理（warning级别）
    'fe-guard/require-lazy-state-init': 'warn',
    // 板块20 扩展规则
    'fe-guard/list-pagination-or-virtual': 'warn',
    'fe-guard/form-prevent-default': 'warn',
    'fe-guard/no-derived-state': 'warn',
    'fe-guard/form-validation-required': 'warn',
    'fe-guard/safe-optional-render': 'warn',
    'fe-guard/no-stale-request': 'warn',
    'fe-guard/require-env-fallback': 'warn',
  },
};