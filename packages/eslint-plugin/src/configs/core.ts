import type { TSESLint } from '@typescript-eslint/utils';

/**
 * Core preset: 60 rules, all error level.
 * Catches white screens, crashes, dead features, security issues.
 */
export const core: TSESLint.FlatConfig.ConfigArray = [
  {
    plugins: {},  // Will be populated in index.ts
    rules: {
      // 板块1 事件处理
      'guard/no-empty-handler': 'error',
      'guard/handler-must-exist': 'error',
      // 板块2 页面可达性 (L1 rules only)
      'guard/no-dead-link': 'error',
      'guard/require-auth-guard': 'error',
      'guard/no-location-href-navigate': 'error',
      // 板块3 错误兜底
      'guard/require-error-boundary': 'error',
      'guard/require-loading-state': 'error',
      'guard/require-error-state': 'error',
      'guard/require-empty-state': 'error',
      'guard/require-suspense-boundary': 'error',
      // 板块4 API安全
      'guard/fetch-must-catch': 'error',
      'guard/response-null-check': 'error',
      'guard/api-timeout': 'error',
      'guard/no-get-with-body': 'error',
      'guard/safe-json-parse': 'error',
      // 板块5 组件健壮
      'guard/conditional-render-complete': 'error',
      'guard/no-state-in-render': 'error',
      'guard/no-recursive-without-base': 'error',
      'guard/restrict-native-elements': 'error',
      'guard/no-inline-component-definition': 'error',
      // 板块6 状态管理
      'guard/no-state-mutation': 'error',
      // 板块7 渲染安全
      'guard/no-falsy-render': 'error',
      'guard/no-undefined-render': 'error',
      'guard/no-object-in-jsx': 'error',
      'guard/no-unstable-jsx-props': 'error',
      'guard/no-unstable-key': 'error',
      // 板块8 异步安全
      'guard/no-async-effect': 'error',
      'guard/await-in-try': 'error',
      'guard/no-floating-promise': 'error',
      // 板块9 副作用与资源清理
      'guard/no-effect-set-state-loop': 'error',
      'guard/no-unnecessary-effect': 'error',
      'guard/require-cleanup-bindings': 'error',
      // 板块10 安全性
      'guard/no-raw-dangerously-set-innerhtml': 'error',
      'guard/no-native-feedback': 'error',
      'guard/no-hardcoded-secret': 'error',
      'guard/require-error-handler-on-events': 'error',
      'guard/require-io-validation': 'error',
      // 板块11 AI代码气味
      'guard/no-placeholder-url': 'error',
      'guard/no-todo-in-production': 'error',
      'guard/no-scattered-constants': 'error',
      'guard/no-full-module-import': 'error',
      // 板块19 错误处理
      'guard/no-empty-catch': 'error',
      // 板块12 视觉完整性
      'guard/no-hardcoded-pixel-width': 'error',
      'guard/text-overflow-handling': 'error',
      'guard/dynamic-content-overflow': 'error',
      'guard/image-adaptability': 'error',
      'guard/flex-wrap-required': 'error',
      // 板块13 组件交互完整性
      'guard/modal-close-handling': 'error',
      'guard/tab-default-active': 'error',
      'guard/table-empty-state': 'error',
      'guard/form-multi-step-completeness': 'error',
      // 板块14 状态完备性
      'guard/operation-feedback': 'error',
      // 板块15 数据展示正确性
      'guard/no-null-render': 'error',
      'guard/no-enum-raw-render': 'error',
      'guard/no-number-unformatted': 'error',
      'guard/no-date-raw-render': 'error',
      'guard/no-boolean-raw-render': 'error',
      // 板块16 异步与组件扩展
      'guard/async-handler-try-catch': 'error',
      'guard/controlled-or-uncontrolled': 'error',
      'guard/require-debounce-throttle': 'error',
    },
  },
];
