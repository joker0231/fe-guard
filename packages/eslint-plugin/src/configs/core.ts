import type { TSESLint } from '@typescript-eslint/utils';

/**
 * Core preset: 60 rules, all error level.
 * Catches white screens, crashes, dead features, security issues.
 *
 * Exported as a single config object (not an array) so that
 * `plugin.configs.core.rules` works for spreading into user configs.
 */
export const core: TSESLint.FlatConfig.Config = {
  rules: {
    // 板块1 事件处理
    'fe-guard/no-empty-handler': 'error',
    'fe-guard/handler-must-exist': 'error',
    // 板块2 页面可达性 (L1 rules only)
    'fe-guard/no-dead-link': 'error',
    'fe-guard/require-auth-guard': 'error',
    'fe-guard/no-location-href-navigate': 'error',
    'fe-guard/enforce-route-export-convention': 'error',
    'fe-guard/enforce-flat-routes': 'error',
    // 板块3 错误兜底
    'fe-guard/require-error-boundary': 'error',
    'fe-guard/require-loading-state': 'error',
    'fe-guard/require-error-state': 'error',
    'fe-guard/require-empty-state': 'error',
    'fe-guard/require-suspense-boundary': 'error',
    // 板块4 API安全
    'fe-guard/fetch-must-catch': 'error',
    'fe-guard/response-null-check': 'error',
    'fe-guard/api-timeout': 'error',
    'fe-guard/no-get-with-body': 'error',
    'fe-guard/safe-json-parse': 'error',
    'fe-guard/no-raw-fetch': 'error',
    'fe-guard/no-immediate-mutation-on-input': 'error',
    'fe-guard/require-form-validation': 'error',
    // 板块5 组件健壮
    'fe-guard/conditional-render-complete': 'error',
    'fe-guard/no-state-in-render': 'error',
    'fe-guard/no-recursive-without-base': 'error',
    'fe-guard/restrict-native-elements': 'error',
    'fe-guard/no-inline-component-definition': 'error',
    'fe-guard/no-empty-select-value': 'error',
    // 板块6 状态管理
    'fe-guard/no-state-mutation': 'error',
    // 板块7 渲染安全
    'fe-guard/no-falsy-render': 'error',
    'fe-guard/no-undefined-render': 'error',
    'fe-guard/no-object-in-jsx': 'error',
    'fe-guard/no-unstable-jsx-props': 'error',
    'fe-guard/no-unstable-key': 'error',
    // 板块8 异步安全
    'fe-guard/no-async-effect': 'error',
    'fe-guard/await-in-try': 'error',
    'fe-guard/no-floating-promise': 'error',
    // 板块9 副作用与资源清理
    'fe-guard/no-effect-set-state-loop': 'error',
    'fe-guard/no-unnecessary-effect': 'error',
    'fe-guard/require-cleanup-bindings': 'error',
    // 板块10 安全性
    'fe-guard/no-raw-dangerously-set-innerhtml': 'error',
    'fe-guard/no-native-feedback': 'error',
    'fe-guard/no-hardcoded-secret': 'error',
    'fe-guard/no-sensitive-storage': 'error',
    'fe-guard/require-error-handler-on-events': 'error',
    'fe-guard/require-io-validation': 'error',
    'fe-guard/no-duplicate-type-definition': 'error',
    'fe-guard/require-shared-schema': 'error',
    // 板块11 AI代码气味
    'fe-guard/no-placeholder-url': 'error',
    'fe-guard/no-todo-in-production': 'error',
    'fe-guard/no-scattered-constants': 'error',
    'fe-guard/no-full-module-import': 'error',
    // 板块19 错误处理
    'fe-guard/no-empty-catch': 'error',
    // 板块12 视觉完整性
    'fe-guard/no-hardcoded-pixel-width': 'error',
    'fe-guard/text-overflow-handling': 'error',
    'fe-guard/dynamic-content-overflow': 'error',
    'fe-guard/image-adaptability': 'error',
    'fe-guard/flex-wrap-required': 'error',
    // 板块13 组件交互完整性
    'fe-guard/modal-close-handling': 'error',
    'fe-guard/tab-default-active': 'error',
    'fe-guard/table-empty-state': 'error',
    'fe-guard/form-multi-step-completeness': 'error',
    // 板块14 状态完备性
    'fe-guard/operation-feedback': 'error',
    // 板块15 数据展示正确性
    'fe-guard/no-null-render': 'error',
    'fe-guard/no-enum-raw-render': 'error',
    'fe-guard/no-number-unformatted': 'error',
    'fe-guard/no-date-raw-render': 'error',
    'fe-guard/no-boolean-raw-render': 'error',
    // 板块16 异步与组件扩展
    'fe-guard/async-handler-try-catch': 'error',
    'fe-guard/controlled-or-uncontrolled': 'error',
    'fe-guard/require-debounce-throttle': 'error',
    // 板块17 标准ESLint推荐
    'eqeqeq': 'error',
  },
  linterOptions: {
    noInlineConfig: true,
  },
};