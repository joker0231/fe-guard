import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const PAGINATION_COMPONENTS = /^(Pagination|Pager)$/i;
const VIRTUAL_HOOKS = new Set([
  'useVirtualizer',
  'useVirtual',
  'useWindowVirtualizer',
]);
const VIRTUAL_IMPORTS = new Set([
  'react-window',
  'react-virtualized',
  'react-virtuoso',
  '@tanstack/react-virtual',
]);

export default createRule({
  name: 'list-pagination-or-virtual',
  meta: {
    type: 'suggestion',
    docs: { description: 'Require pagination or virtual scrolling for list rendering' },
    schema: [],
    messages: {
      missingPagination:
        "列表直接渲染所有数据（`.map()`），大数据量时页面会卡顿。请添加分页：`<Pagination>` + `.slice()` 截取当前页数据，或使用虚拟滚动。",
    },
  },
  defaultOptions: [],
  create(context) {
    let hasPagination = false;
    let hasVirtualScroll = false;
    let hasSlice = false;
    const mapCalls: TSESTree.CallExpression[] = [];

    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source === 'string' && VIRTUAL_IMPORTS.has(source)) {
          hasVirtualScroll = true;
        }
        for (const spec of node.specifiers) {
          if (spec.type === 'ImportSpecifier' && spec.imported.type === 'Identifier' && VIRTUAL_HOOKS.has(spec.imported.name)) {
            hasVirtualScroll = true;
          }
        }
      },

      JSXOpeningElement(node) {
        if (node.name.type === 'JSXIdentifier' && PAGINATION_COMPONENTS.test(node.name.name)) {
          hasPagination = true;
        }
      },

      'JSXExpressionContainer > CallExpression'(node: TSESTree.CallExpression) {
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'map'
        ) {
          mapCalls.push(node);

          // Check if source has .slice() before .map()
          const obj = node.callee.object;
          if (
            obj.type === 'CallExpression' &&
            obj.callee.type === 'MemberExpression' &&
            obj.callee.property.type === 'Identifier' &&
            obj.callee.property.name === 'slice'
          ) {
            hasSlice = true;
          }
        }
      },

      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          VIRTUAL_HOOKS.has(node.callee.name)
        ) {
          hasVirtualScroll = true;
        }
      },

      'Program:exit'() {
        if (mapCalls.length === 0) return;
        if (hasPagination || hasVirtualScroll || hasSlice) return;

        for (const mapCall of mapCalls) {
          context.report({
            node: mapCall,
            messageId: 'missingPagination',
          });
        }
      },
    };
  },
});
