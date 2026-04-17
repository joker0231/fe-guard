import guardPlugin from '@frontend-guard/eslint-plugin';

export default [
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: {
      guard: guardPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // ── Board 1: Event Handler ──
      'guard/no-empty-handler': 'error',
      'guard/handler-must-exist': 'error',
      // ── Board 2: Page Reachability ──
      'guard/no-dead-link': 'error',
      'guard/require-auth-guard': 'error',
      'guard/no-location-href-navigate': 'error',
      // ── Board 3: Error Boundary ──
      'guard/require-error-boundary': 'error',
      'guard/require-loading-state': 'error',
      'guard/require-error-state': 'error',
      'guard/require-empty-state': 'error',
      'guard/require-suspense-boundary': 'error',
      // ── Board 4: API Safety ──
      'guard/fetch-must-catch': 'error',
      'guard/response-null-check': 'error',
      'guard/api-timeout': 'error',
      'guard/no-get-with-body': 'error',
      'guard/safe-json-parse': 'error',
      // ── Board 5: Component ──
      'guard/conditional-render-complete': 'error',
      'guard/no-state-in-render': 'error',
      'guard/no-recursive-without-base': 'error',
      // ── Board 6: State Management ──
      'guard/no-state-mutation': 'error',
      // ── Board 7: Render Safety ──
      'guard/no-falsy-render': 'error',
      'guard/no-undefined-render': 'error',
      // 'guard/no-object-in-jsx': 'error',      // needs type info
      // 'guard/no-floating-promise': 'error',    // needs type info
      // ── Board 8: Async Safety ──
      'guard/no-async-effect': 'error',
      'guard/await-in-try': 'error',
      // ── Board 9: Side Effects ──
      'guard/no-effect-set-state-loop': 'error',
      'guard/no-unnecessary-effect': 'error',
      'guard/require-cleanup-bindings': 'error',
      // ── Board 10: Security ──
      'guard/no-raw-dangerously-set-innerhtml': 'error',
      // ── Board 11: AI Smell ──
      'guard/no-placeholder-url': 'error',
      'guard/no-todo-in-production': 'error',
      'guard/no-scattered-constants': 'error',
      // ── Board 12: Visual Integrity ──
      'guard/no-hardcoded-pixel-width': 'error',
      'guard/text-overflow-handling': 'error',
      'guard/dynamic-content-overflow': 'error',
      'guard/image-adaptability': 'error',
      'guard/flex-wrap-required': 'error',
      // ── Board 13: Interaction Integrity ──
      'guard/modal-close-handling': 'error',
      'guard/tab-default-active': 'error',
      'guard/table-empty-state': 'error',
      'guard/form-multi-step-completeness': 'error',
      // ── Board 14: State Completeness ──
      'guard/operation-feedback': 'error',
      // ── Board 15: Data Display ──
      'guard/no-null-render': 'error',
      'guard/no-enum-raw-render': 'error',
      'guard/no-number-unformatted': 'error',
      'guard/no-date-raw-render': 'error',
      'guard/no-boolean-raw-render': 'error',
      // ── Board 16: Async Component ──
      'guard/async-handler-try-catch': 'error',
      'guard/controlled-or-uncontrolled': 'error',
      'guard/require-debounce-throttle': 'error',
      // ── Extended Rules ──
      'guard/no-hardcoded-color': 'warn',
      'guard/token-expiry-handling': 'warn',
      'guard/list-pagination-or-virtual': 'warn',
      'guard/form-prevent-default': 'warn',
      'guard/no-derived-state': 'warn',
      'guard/form-validation-required': 'warn',
      // 'guard/safe-optional-render': 'warn',   // needs type info
      'guard/no-stale-request': 'warn',
      'guard/require-env-fallback': 'warn',
    },
  },
];
