/**
 * eslint-plugin-fe-guard
 *
 * ESLint plugin for Frontend Guard - AI代码编译级防御器
 * 77 ESLint rules (Core 66 error + Extended 11 error) + 14 Vite analyzer rules = 90 total
 */

// ── Board 1: Event Handler ──
import noEmptyHandler from './rules/event-handler/no-empty-handler';
import handlerMustExist from './rules/event-handler/handler-must-exist';

// ── Board 2: Page Reachability (L1) ──
import noDeadLink from './rules/page-reachability/no-dead-link';
import requireAuthGuard from './rules/page-reachability/require-auth-guard';
import noLocationHrefNavigate from './rules/page-reachability/no-location-href-navigate';
import enforceRouteExportConvention from './rules/page-reachability/enforce-route-export-convention';
import enforceFlatRoutes from './rules/page-reachability/enforce-flat-routes';

// ── Board 3: Error Boundary ──
import requireErrorBoundary from './rules/error-boundary/require-error-boundary';
import requireLoadingState from './rules/error-boundary/require-loading-state';
import requireErrorState from './rules/error-boundary/require-error-state';
import requireEmptyState from './rules/error-boundary/require-empty-state';
import requireSuspenseBoundary from './rules/error-boundary/require-suspense-boundary';

// ── Board 4: API Safety ──
import fetchMustCatch from './rules/api-safety/fetch-must-catch';
import responseNullCheck from './rules/api-safety/response-null-check';
import apiTimeout from './rules/api-safety/api-timeout';
import noGetWithBody from './rules/api-safety/no-get-with-body';
import safeJsonParse from './rules/api-safety/safe-json-parse';
import noRawFetch from './rules/api-safety/no-raw-fetch';
import noImmediateMutationOnInput from './rules/api-safety/no-immediate-mutation-on-input';
import requireFormValidation from './rules/api-safety/require-form-validation';
import noZeroDebounce from './rules/api-safety/no-zero-debounce';

// ── Board 5: Component ──
import conditionalRenderComplete from './rules/component/conditional-render-complete';
import noStateInRender from './rules/component/no-state-in-render';
import noRecursiveWithoutBase from './rules/component/no-recursive-without-base';
import restrictNativeElements from './rules/component/restrict-native-elements';
import noInlineComponentDefinition from './rules/component/no-inline-component-definition';
import noEmptySelectValue from './rules/component/no-empty-select-value';

// ── Board 6: State Management ──
import noStateMutation from './rules/state-management/no-state-mutation';
import requireLazyStateInit from './rules/state-management/require-lazy-state-init';

// ── Board 7: Render Safety ──
import noFalsyRender from './rules/render-safety/no-falsy-render';
import noUndefinedRender from './rules/render-safety/no-undefined-render';
import noObjectInJsx from './rules/render-safety/no-object-in-jsx';
import noUnstableJsxProps from './rules/render-safety/no-unstable-jsx-props';
import noUnstableKey from './rules/render-safety/no-unstable-key';

// ── Board 8: Async Safety ──
import noAsyncEffect from './rules/async-safety/no-async-effect';
import awaitInTry from './rules/async-safety/await-in-try';
import noFloatingPromise from './rules/async-safety/no-floating-promise';

// ── Board 9: Side Effects ──
import noEffectSetStateLoop from './rules/side-effects/no-effect-set-state-loop';
import noUnnecessaryEffect from './rules/side-effects/no-unnecessary-effect';
import requireCleanupBindings from './rules/side-effects/require-cleanup-bindings';

// ── Board 10: Security ──
import noRawDangerouslySetInnerhtml from './rules/security/no-raw-dangerously-set-innerhtml';
import noNativeFeedback from './rules/security/no-native-feedback';
import noHardcodedSecret from './rules/security/no-hardcoded-secret';
import noSensitiveStorage from './rules/security/no-sensitive-storage';
import requireErrorHandlerOnEvents from './rules/error-handling/require-error-handler-on-events';
import noEmptyCatch from './rules/error-handling/no-empty-catch';
import requireIoValidation from './rules/data-flow/require-io-validation';
import noDuplicateTypeDefinition from './rules/data-flow/no-duplicate-type-definition';
import requireSharedSchema from './rules/data-flow/require-shared-schema';
import requireStorageKeyConstants from './rules/data-flow/require-storage-key-constants';

// ── Board 11: AI Smell ──
import noPlaceholderUrl from './rules/ai-smell/no-placeholder-url';
import noTodoInProduction from './rules/ai-smell/no-todo-in-production';
import noScatteredConstants from './rules/ai-smell/no-scattered-constants';
import maxComponentLines from './rules/ai-smell/max-component-lines';
import noFullModuleImport from './rules/ai-smell/no-full-module-import';

// ── Board 12: Visual Integrity ──
import noHardcodedPixelWidth from './rules/visual-integrity/no-hardcoded-pixel-width';
import textOverflowHandling from './rules/visual-integrity/text-overflow-handling';
import dynamicContentOverflow from './rules/visual-integrity/dynamic-content-overflow';
import imageAdaptability from './rules/visual-integrity/image-adaptability';
import flexWrapRequired from './rules/visual-integrity/flex-wrap-required';

// ── Board 13: Interaction Integrity ──
import modalCloseHandling from './rules/interaction-integrity/modal-close-handling';
import tabDefaultActive from './rules/interaction-integrity/tab-default-active';
import tableEmptyState from './rules/interaction-integrity/table-empty-state';
import formMultiStepCompleteness from './rules/interaction-integrity/form-multi-step-completeness';

// ── Board 14: State Completeness (L1) ──
import operationFeedback from './rules/state-completeness/operation-feedback';

// ── Board 15: Data Display ──
import noNullRender from './rules/data-display/no-null-render';
import noEnumRawRender from './rules/data-display/no-enum-raw-render';
import noNumberUnformatted from './rules/data-display/no-number-unformatted';
import noDateRawRender from './rules/data-display/no-date-raw-render';
import noBooleanRawRender from './rules/data-display/no-boolean-raw-render';

// ── Board 16: Async Component Extension ──
import asyncHandlerTryCatch from './rules/async-component-ext/async-handler-try-catch';
import controlledOrUncontrolled from './rules/async-component-ext/controlled-or-uncontrolled';
import requireDebounceThrottle from './rules/async-component-ext/require-debounce-throttle';

// ── Board 17: Dark Mode (L1) ──
import noHardcodedColor from './rules/dark-mode/no-hardcoded-color';

// ── Board 18: Error Recovery ──
import tokenExpiryHandling from './rules/error-recovery/token-expiry-handling';

// ── Board 20: Extended (L1) ──
import listPaginationOrVirtual from './rules/extended/list-pagination-or-virtual';
import formPreventDefault from './rules/extended/form-prevent-default';
import noDerivedState from './rules/extended/no-derived-state';
import formValidationRequired from './rules/extended/form-validation-required';
import safeOptionalRender from './rules/extended/safe-optional-render';
import noStaleRequest from './rules/extended/no-stale-request';
import requireEnvFallback from './rules/extended/require-env-fallback';

const rules = {
  // Board 1
  'no-empty-handler': noEmptyHandler,
  'handler-must-exist': handlerMustExist,
  // Board 2
  'no-dead-link': noDeadLink,
  'require-auth-guard': requireAuthGuard,
  'no-location-href-navigate': noLocationHrefNavigate,
  'enforce-route-export-convention': enforceRouteExportConvention,
  'enforce-flat-routes': enforceFlatRoutes,
  // Board 3
  'require-error-boundary': requireErrorBoundary,
  'require-loading-state': requireLoadingState,
  'require-error-state': requireErrorState,
  'require-empty-state': requireEmptyState,
  'require-suspense-boundary': requireSuspenseBoundary,
  // Board 4
  'fetch-must-catch': fetchMustCatch,
  'response-null-check': responseNullCheck,
  'api-timeout': apiTimeout,
  'no-get-with-body': noGetWithBody,
  'safe-json-parse': safeJsonParse,
  'no-raw-fetch': noRawFetch,
  'no-immediate-mutation-on-input': noImmediateMutationOnInput,
  'require-form-validation': requireFormValidation,
  'no-zero-debounce': noZeroDebounce,
  // Board 5
  'conditional-render-complete': conditionalRenderComplete,
  'no-state-in-render': noStateInRender,
  'no-recursive-without-base': noRecursiveWithoutBase,
  'restrict-native-elements': restrictNativeElements,
  'no-inline-component-definition': noInlineComponentDefinition,
  'no-empty-select-value': noEmptySelectValue,
  // Board 6
  'no-state-mutation': noStateMutation,
  'require-lazy-state-init': requireLazyStateInit,
  // Board 7
  'no-falsy-render': noFalsyRender,
  'no-undefined-render': noUndefinedRender,
  'no-object-in-jsx': noObjectInJsx,
  'no-unstable-jsx-props': noUnstableJsxProps,
  'no-unstable-key': noUnstableKey,
  // Board 8
  'no-async-effect': noAsyncEffect,
  'await-in-try': awaitInTry,
  'no-floating-promise': noFloatingPromise,
  // Board 9
  'no-effect-set-state-loop': noEffectSetStateLoop,
  'no-unnecessary-effect': noUnnecessaryEffect,
  'require-cleanup-bindings': requireCleanupBindings,
  // Board 10
  'no-raw-dangerously-set-innerhtml': noRawDangerouslySetInnerhtml,
  'no-native-feedback': noNativeFeedback,
  'no-hardcoded-secret': noHardcodedSecret,
  'no-sensitive-storage': noSensitiveStorage,
  'require-error-handler-on-events': requireErrorHandlerOnEvents,
  'no-empty-catch': noEmptyCatch,
  'require-io-validation': requireIoValidation,
  'no-duplicate-type-definition': noDuplicateTypeDefinition,
  'require-shared-schema': requireSharedSchema,
  'require-storage-key-constants': requireStorageKeyConstants,
  // Board 11
  'no-placeholder-url': noPlaceholderUrl,
  'no-todo-in-production': noTodoInProduction,
  'no-scattered-constants': noScatteredConstants,
  'max-component-lines': maxComponentLines,
  'no-full-module-import': noFullModuleImport,
  // Board 12
  'no-hardcoded-pixel-width': noHardcodedPixelWidth,
  'text-overflow-handling': textOverflowHandling,
  'dynamic-content-overflow': dynamicContentOverflow,
  'image-adaptability': imageAdaptability,
  'flex-wrap-required': flexWrapRequired,
  // Board 13
  'modal-close-handling': modalCloseHandling,
  'tab-default-active': tabDefaultActive,
  'table-empty-state': tableEmptyState,
  'form-multi-step-completeness': formMultiStepCompleteness,
  // Board 14
  'operation-feedback': operationFeedback,
  // Board 15
  'no-null-render': noNullRender,
  'no-enum-raw-render': noEnumRawRender,
  'no-number-unformatted': noNumberUnformatted,
  'no-date-raw-render': noDateRawRender,
  'no-boolean-raw-render': noBooleanRawRender,
  // Board 16
  'async-handler-try-catch': asyncHandlerTryCatch,
  'controlled-or-uncontrolled': controlledOrUncontrolled,
  'require-debounce-throttle': requireDebounceThrottle,
  // Board 17
  'no-hardcoded-color': noHardcodedColor,
  // Board 18
  'token-expiry-handling': tokenExpiryHandling,
  // Board 20
  'list-pagination-or-virtual': listPaginationOrVirtual,
  'form-prevent-default': formPreventDefault,
  'no-derived-state': noDerivedState,
  'form-validation-required': formValidationRequired,
  'safe-optional-render': safeOptionalRender,
  'no-stale-request': noStaleRequest,
  'require-env-fallback': requireEnvFallback,
};

import { core } from './configs/core';
import { extended } from './configs/extended';
import { all } from './configs/all';

const plugin = {
  meta: {
    name: 'eslint-plugin-fe-guard',
    version: '0.1.0',
  },
  rules,
  configs: {
    core,
    extended,
    all,
    recommended: extended,
  },
};

export default plugin;
export { rules };
