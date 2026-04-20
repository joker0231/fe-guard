import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';
import path from 'path';

type Options = [{ allowedFiles?: string[] }];

const DEFAULT_ALLOWED_FILES = [
  '**/lib/http*',
  '**/lib/api-client*',
  '**/lib/fetch*',
  '**/lib/request*',
  '**/utils/http*',
  '**/utils/request*',
];

/**
 * Simple glob matching (supports ** and *)
 */
function matchGlob(filepath: string, pattern: string): boolean {
  const regexStr = pattern
    .replace(/\*\*/g, '<<GLOBSTAR>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<GLOBSTAR>>/g, '.*');
  return new RegExp(regexStr).test(filepath);
}

export default createRule<
  Options,
  'noRawFetch' | 'noRawAxios' | 'noRawXHR' | 'noImageBeacon' | 'noDynamicScript' | 'noSendBeacon' | 'noRawEventSource' | 'noRawWorker'
>({
  name: 'no-raw-fetch',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow direct usage of fetch/axios/XMLHttpRequest and other network request bypass methods. Use the project HTTP client instead.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedFiles: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Glob patterns for files where raw fetch is allowed (e.g., HTTP client implementation files)',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noRawFetch:
        '禁止直接使用 `fetch()`。请使用项目封装的 HTTP Client（如 `httpClient.get()` / `httpClient.post()`），确保认证token注入、超时控制和统一错误处理。',
      noRawAxios:
        '禁止直接使用 `axios`。请使用项目封装的 HTTP Client（如 `httpClient.get()` / `httpClient.post()`），确保认证token注入、超时控制和统一错误处理。',
      noRawXHR:
        '禁止直接使用 `XMLHttpRequest`。请使用项目封装的 HTTP Client，确保认证token注入、超时控制和统一错误处理。',
      noImageBeacon:
        '禁止使用 `new Image().src` 发送网络请求（图片信标）。这是绕过 HTTP Client 的手段，请使用项目封装的请求方法。',
      noDynamicScript:
        '禁止动态创建 `<script>` 标签加载外部资源（JSONP等）。请使用项目封装的 HTTP Client 发送请求。',
      noSendBeacon:
        '禁止直接使用 `navigator.sendBeacon()`。如需在页面卸载时发送数据，请使用项目封装的方法。',
      noRawEventSource:
        '禁止直接使用 `new EventSource()`。如需 SSE 连接，请使用项目封装的 SSE Client。',
      noRawWorker:
        '禁止直接使用 `new Worker()`。Web Worker 可绕过主线程的代码检测，如确有并行计算需求请申请豁免。',
    },
  },
  defaultOptions: [{}],
  create(context) {
    const options = context.options[0] || {};
    const allowedFiles = options.allowedFiles || DEFAULT_ALLOWED_FILES;

    // Check if current file matches any allowed pattern
    const filename = context.filename || context.getFilename();
    const normalizedPath = filename.replace(/\\/g, '/');

    for (const pattern of allowedFiles) {
      if (matchGlob(normalizedPath, pattern)) {
        return {}; // Skip this file entirely
      }
    }

    return {
      CallExpression(node) {
        // Direct fetch() call
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'fetch'
        ) {
          context.report({ node, messageId: 'noRawFetch' });
          return;
        }

        // window.fetch() call
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'window' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'fetch'
        ) {
          context.report({ node, messageId: 'noRawFetch' });
          return;
        }

        // axios() direct call
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'axios'
        ) {
          context.report({ node, messageId: 'noRawAxios' });
          return;
        }

        // axios.get() / axios.post() etc.
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'axios'
        ) {
          context.report({ node, messageId: 'noRawAxios' });
          return;
        }

        // navigator.sendBeacon()
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'navigator' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'sendBeacon'
        ) {
          context.report({ node, messageId: 'noSendBeacon' });
          return;
        }

        // document.createElement('script') — JSONP bypass
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'document' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'createElement' &&
          node.arguments.length > 0 &&
          node.arguments[0].type === 'Literal' &&
          node.arguments[0].value === 'script'
        ) {
          context.report({ node, messageId: 'noDynamicScript' });
          return;
        }
      },

      // Detect: new XMLHttpRequest() / new EventSource() / new Worker()
      NewExpression(node) {
        if (node.callee.type === 'Identifier') {
          switch (node.callee.name) {
            case 'XMLHttpRequest':
              context.report({ node, messageId: 'noRawXHR' });
              break;
            case 'EventSource':
              context.report({ node, messageId: 'noRawEventSource' });
              break;
            case 'Worker':
            case 'SharedWorker':
              context.report({ node, messageId: 'noRawWorker' });
              break;
          }
        }
      },

      // Detect: new Image().src = url (image beacon)
      // Also catches: const img = new Image(); img.src = url;
      AssignmentExpression(node) {
        if (
          node.left.type === 'MemberExpression' &&
          node.left.property.type === 'Identifier' &&
          node.left.property.name === 'src'
        ) {
          // Check if the object is `new Image()` directly
          if (
            node.left.object.type === 'NewExpression' &&
            node.left.object.callee.type === 'Identifier' &&
            node.left.object.callee.name === 'Image'
          ) {
            context.report({ node, messageId: 'noImageBeacon' });
            return;
          }

          // Check if assigning .src to a variable that was assigned new Image()
          // This is a simplified check — we look at the variable name pattern
          if (node.left.object.type === 'Identifier') {
            const varName = node.left.object.name;
            // Heuristic: variable names like img, image, pixel, beacon suggest Image usage
            if (/^(img|image|pixel|beacon|tracker)/i.test(varName)) {
              // Walk up to find if this variable was assigned new Image()
              const scope = context.sourceCode.getScope(node);
              const variable = scope.variables.find((v) => v.name === varName);
              if (variable && variable.defs.length > 0) {
                const def = variable.defs[0];
                if (
                  def.type === 'Variable' &&
                  def.node.init &&
                  def.node.init.type === 'NewExpression' &&
                  def.node.init.callee.type === 'Identifier' &&
                  def.node.init.callee.name === 'Image'
                ) {
                  context.report({ node, messageId: 'noImageBeacon' });
                }
              }
            }
          }
        }
      },
    };
  },
});