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
    'fe-guard/no-hardcoded-color': 'error',
    // 板块18 错误恢复能力
    'fe-guard/token-expiry-handling': 'error',
    // 板块11 AI代码气味
    'fe-guard/max-component-lines': 'error',
    // 板块6 状态管理
    'fe-guard/require-lazy-state-init': 'error',
    // 板块20 扩展规则
    'fe-guard/list-pagination-or-virtual': 'error',
    'fe-guard/form-prevent-default': 'error',
    'fe-guard/no-derived-state': 'error',
    'fe-guard/form-validation-required': 'error',
    'fe-guard/safe-optional-render': 'error',
    'fe-guard/no-stale-request': 'error',
    'fe-guard/require-env-fallback': 'error',
  },
};