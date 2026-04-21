import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

// Exact function names that are debounce/throttle wrappers
const EXACT_DEBOUNCE_NAMES = new Set([
  'debounce', 'throttle',
  'useDebouncedCallback', 'useThrottledCallback',
  'useDebounce', 'useThrottle',
]);

// Exact member property names (_.debounce, lodash.throttle)
const EXACT_MEMBER_NAMES = new Set(['debounce', 'throttle']);

/**
 * Check if a callee matches debounce/throttle function names.
 * Uses EXACT match to avoid false positives on names like setDebouncedValue, useDebounce, etc.
 */
function isDebounceCall(node: TSESTree.CallExpression): boolean {
  const { callee } = node;

  // Direct call: debounce(fn, 0), throttle(fn, 0)
  if (callee.type === 'Identifier') {
    return EXACT_DEBOUNCE_NAMES.has(callee.name);
  }

  // Member call: _.debounce(fn, 0), lodash.throttle(fn, 0)
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
    return EXACT_MEMBER_NAMES.has(callee.property.name);
  }

  return false;
}

/**
 * Get the delay argument value from a debounce call.
 * Returns the numeric value if it's a literal number, or null if not determinable.
 * Typically the delay is the 2nd argument: debounce(fn, delay)
 */
function getDelayValue(node: TSESTree.CallExpression): number | null {
  // Most debounce functions: debounce(fn, delay) or debounce(fn, delay, options)
  // Some hooks: useDebouncedCallback(fn, delay) or useDebouncedCallback(fn, delay, deps)
  if (node.arguments.length < 2) return null;

  const delayArg = node.arguments[1];

  if (delayArg.type === 'Literal' && typeof delayArg.value === 'number') {
    return delayArg.value;
  }

  // UnaryExpression: debounce(fn, -0) or debounce(fn, +0)
  if (
    delayArg.type === 'UnaryExpression' &&
    delayArg.argument.type === 'Literal' &&
    typeof delayArg.argument.value === 'number'
  ) {
    if (delayArg.operator === '-') return -delayArg.argument.value;
    if (delayArg.operator === '+') return delayArg.argument.value;
  }

  return null;
}

const MIN_EFFECTIVE_DELAY = 50; // ms — anything below this is effectively no debounce

export default createRule({
  name: 'no-zero-debounce',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow debounce/throttle with zero or near-zero delay, which is effectively no debounce.',
    },
    schema: [],
    messages: {
      zeroDebounce:
        '`debounce`/`throttle` 的延迟为 {{delay}}ms，等于没有防抖。请使用合理的延迟时间（推荐 300-500ms 用于搜索输入，100-200ms 用于滚动/resize）。',
      missingDelay:
        '`debounce`/`throttle` 缺少延迟参数，默认为 0ms 等于没有防抖。请显式指定延迟时间。',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (!isDebounceCall(node)) return;

        // Check if delay argument exists
        if (node.arguments.length < 2) {
          // Some debounce implementations default to 0 when no delay specified
          // Only report if it's clearly a debounce call with just the function argument
          if (node.arguments.length === 1) {
            context.report({
              node,
              messageId: 'missingDelay',
            });
          }
          return;
        }

        const delay = getDelayValue(node);
        if (delay !== null && delay < MIN_EFFECTIVE_DELAY) {
          context.report({
            node,
            messageId: 'zeroDebounce',
            data: { delay: String(delay) },
          });
        }
      },
    };
  },
});