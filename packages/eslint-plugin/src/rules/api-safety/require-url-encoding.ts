import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

// Functions/methods that accept URLs as first argument
const FETCH_CALLEE_NAMES = new Set([
  'fetch', 'axios', 'httpClient',
]);

const FETCH_MEMBER_METHODS = new Set([
  'get', 'post', 'put', 'patch', 'delete', 'head', 'options',
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS',
  'request',
]);

const FETCH_MEMBER_OBJECTS = new Set([
  'axios', 'apiClient', 'httpClient', 'http', 'api',
]);

// HTML attributes that contain URLs
const URL_ATTRIBUTES = new Set(['href', 'src', 'action']);

export default createRule({
  name: 'require-url-encoding',
  meta: {
    type: 'problem',
    docs: {
      description: 'URL query 参数中的变量必须使用 encodeURIComponent 编码',
    },
    messages: {
      missingEncoding:
        'URL query 参数中的变量 `{{varName}}` 未使用 encodeURIComponent 编码。特殊字符（如 &、=、空格）可能破坏 URL 结构或导致参数注入。请使用 `encodeURIComponent({{varName}})` 包装。',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function isEncodeCall(node: TSESTree.Expression): boolean {
      // encodeURIComponent(xxx) or encodeURI(xxx)
      if (
        node.type === AST_NODE_TYPES.CallExpression &&
        node.callee.type === AST_NODE_TYPES.Identifier &&
        (node.callee.name === 'encodeURIComponent' || node.callee.name === 'encodeURI')
      ) {
        return true;
      }
      // xxx.toString() or String(xxx) — not sufficient but common patterns
      return false;
    }

    function hasQueryParamPattern(quasis: TSESTree.TemplateElement[]): boolean {
      // Check if template literal contains URL query parameter patterns
      for (const quasi of quasis) {
        const value = quasi.value.raw;
        // Matches: ?key= or &key= patterns before/after expressions
        if (/[?&][a-zA-Z_][a-zA-Z0-9_]*=/.test(value) || value.endsWith('?') || value.endsWith('&') || /[?&]$/.test(value)) {
          return true;
        }
      }
      return false;
    }

    function isInUrlContext(node: TSESTree.TemplateLiteral): boolean {
      const parent = node.parent;
      if (!parent) return false;

      // Direct argument to fetch/apiClient.GET/etc
      if (parent.type === AST_NODE_TYPES.CallExpression) {
        const callee = parent.callee;
        // fetch(url)
        if (callee.type === AST_NODE_TYPES.Identifier && FETCH_CALLEE_NAMES.has(callee.name)) {
          return parent.arguments[0] === node;
        }
        // apiClient.GET(url)
        if (callee.type === AST_NODE_TYPES.MemberExpression) {
          const obj = callee.object;
          const prop = callee.property;
          if (
            obj.type === AST_NODE_TYPES.Identifier &&
            FETCH_MEMBER_OBJECTS.has(obj.name) &&
            prop.type === AST_NODE_TYPES.Identifier &&
            FETCH_MEMBER_METHODS.has(prop.name)
          ) {
            return parent.arguments[0] === node;
          }
        }
        return false;
      }

      // Assignment to href/src/action attribute in JSX
      if (parent.type === AST_NODE_TYPES.JSXExpressionContainer) {
        const attr = parent.parent;
        if (
          attr &&
          attr.type === AST_NODE_TYPES.JSXAttribute &&
          attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
          URL_ATTRIBUTES.has(attr.name.name)
        ) {
          return true;
        }
      }

      // Variable assigned and used in URL context — too complex, skip for now
      // Just check direct usage
      return false;
    }

    function getExpressionName(expr: TSESTree.Expression): string {
      if (expr.type === AST_NODE_TYPES.Identifier) return expr.name;
      if (expr.type === AST_NODE_TYPES.MemberExpression) {
        const obj = expr.object;
        const prop = expr.property;
        if (obj.type === AST_NODE_TYPES.Identifier && prop.type === AST_NODE_TYPES.Identifier) {
          return `${obj.name}.${prop.name}`;
        }
        if (obj.type === AST_NODE_TYPES.Identifier) return obj.name;
      }
      if (expr.type === AST_NODE_TYPES.CallExpression) {
        const callee = expr.callee;
        if (callee.type === AST_NODE_TYPES.MemberExpression) {
          const obj = callee.object;
          const prop = callee.property;
          if (obj.type === AST_NODE_TYPES.Identifier && prop.type === AST_NODE_TYPES.Identifier) {
            return `${obj.name}.${prop.name}()`;
          }
        }
        if (callee.type === AST_NODE_TYPES.Identifier) return `${callee.name}()`;
      }
      return 'expression';
    }

    function isQueryParamExpression(
      quasis: TSESTree.TemplateElement[],
      exprIndex: number
    ): boolean {
      // Check if this expression is in a query parameter position
      // i.e., the quasi before it ends with ?key= or &key= or ? or &
      const quasiBefore = quasis[exprIndex];
      if (!quasiBefore) return false;
      const raw = quasiBefore.value.raw;
      // Expression is right after ?key= or &key= or ends with = after ? or &
      if (/[?&][a-zA-Z_][a-zA-Z0-9_]*=$/.test(raw) || /[?&]$/.test(raw) || raw.endsWith('=')) {
        // Additional check: there must be a ? somewhere before in the template
        const allTextBefore = quasis.slice(0, exprIndex + 1).map(q => q.value.raw).join('');
        return allTextBefore.includes('?');
      }
      return false;
    }

    return {
      TemplateLiteral(node) {
        // Only check template literals in URL contexts
        if (!isInUrlContext(node)) return;
        // Must have query param pattern
        if (!hasQueryParamPattern(node.quasis)) return;

        // Check each expression
        for (let i = 0; i < node.expressions.length; i++) {
          const expr = node.expressions[i];
          // Only check expressions in query param positions
          if (!isQueryParamExpression(node.quasis, i)) continue;
          // Skip if already encoded
          if (isEncodeCall(expr as TSESTree.Expression)) continue;
          // Skip literals (numbers, etc)
          if ((expr as TSESTree.Expression).type === AST_NODE_TYPES.Literal) continue;

          const varName = getExpressionName(expr as TSESTree.Expression);
          context.report({
            node: expr as TSESTree.Expression,
            messageId: 'missingEncoding',
            data: { varName },
          });
        }
      },
    };
  },
});
