import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';
import path from 'path';

type Options = [
  {
    routesDirPattern?: string;
    requiredExportName?: string;
    excludeFiles?: string[];
  },
];

export default createRule<Options, 'missingRouteExport' | 'wrongRouteExportType'>({
  name: 'enforce-route-export-convention',
  meta: {
    type: 'problem',
    docs: {
      description:
        '路由文件必须按框架约定导出 Route 常量（如 TanStack Router 的 export const Route = ...）',
    },
    messages: {
      missingRouteExport:
        '路由文件缺少 `export const {{ requiredName }} = ...` 导出。TanStack Router 等框架要求路由文件导出特定名称的常量，否则路由静默失效。',
      wrongRouteExportType:
        '`{{ requiredName }}` 应该通过 `export const` 导出，而不是 `export default` 或其他方式。',
    },
    schema: [
      {
        type: 'object',
        properties: {
          routesDirPattern: {
            type: 'string',
            description: '路由目录的匹配模式（路径中包含此字符串的文件视为路由文件）',
          },
          requiredExportName: {
            type: 'string',
            description: '要求导出的常量名称',
          },
          excludeFiles: {
            type: 'array',
            items: { type: 'string' },
            description: '排除的文件名模式（如 __root、route-tree）',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      routesDirPattern: 'routes',
      requiredExportName: 'Route',
      excludeFiles: ['__root', 'route-tree', 'routeTree'],
    },
  ],
  create(context, [options]) {
    const routesDirPattern = options.routesDirPattern ?? 'routes';
    const requiredName = options.requiredExportName ?? 'Route';
    const excludeFiles = options.excludeFiles ?? ['__root', 'route-tree', 'routeTree'];

    const filename = context.filename || context.getFilename();
    const normalizedPath = filename.replace(/\\/g, '/');

    // 只检查 routes/ 目录下的文件
    if (!normalizedPath.includes(`/${routesDirPattern}/`)) {
      return {};
    }

    // 排除特定文件
    const basename = path.basename(filename, path.extname(filename));
    if (excludeFiles.some((pattern) => basename.includes(pattern))) {
      return {};
    }

    // 排除测试文件
    if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename)) {
      return {};
    }

    let hasCorrectExport = false;
    let hasDefaultExportOfRoute = false;
    const programNode: TSESTree.Program[] = [];

    return {
      Program(node) {
        programNode.push(node);
      },

      // export const Route = ...
      ExportNamedDeclaration(node) {
        if (
          node.declaration &&
          node.declaration.type === 'VariableDeclaration' &&
          node.declaration.kind === 'const'
        ) {
          for (const declarator of node.declaration.declarations) {
            if (
              declarator.id.type === 'Identifier' &&
              declarator.id.name === requiredName
            ) {
              hasCorrectExport = true;
            }
          }
        }

        // export { Route } from '...'
        if (node.specifiers) {
          for (const spec of node.specifiers) {
            if (
              spec.exported.type === 'Identifier' &&
              spec.exported.name === requiredName
            ) {
              hasCorrectExport = true;
            }
          }
        }
      },

      // export default Route — 不是正确的导出方式
      ExportDefaultDeclaration(node) {
        if (
          node.declaration.type === 'Identifier' &&
          node.declaration.name === requiredName
        ) {
          hasDefaultExportOfRoute = true;
        }
      },

      'Program:exit'() {
        if (hasCorrectExport) {
          return; // 正确导出，不报错
        }

        if (hasDefaultExportOfRoute) {
          context.report({
            node: programNode[0],
            messageId: 'wrongRouteExportType',
            data: { requiredName },
          });
          return;
        }

        // 缺少导出
        context.report({
          node: programNode[0],
          messageId: 'missingRouteExport',
          data: { requiredName },
        });
      },
    };
  },
});