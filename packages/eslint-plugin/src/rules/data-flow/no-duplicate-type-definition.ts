import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';
import path from 'path';
import fs from 'fs';

type Options = [
  {
    sharedDir?: string;
    sharedTypeNames?: string[];
    excludeDirs?: string[];
  },
];

/**
 * 从 shared 目录的 index.ts/index.d.ts 中提取导出的类型名
 * 简单实现：正则匹配 export { ... } 和 export type/interface
 */
function extractSharedTypeNames(sharedDir: string): string[] {
  const typeNames: string[] = [];
  const indexFiles = ['index.ts', 'index.d.ts', 'index.tsx'];

  for (const indexFile of indexFiles) {
    const indexPath = path.join(sharedDir, indexFile);
    if (!fs.existsSync(indexPath)) continue;

    const content = fs.readFileSync(indexPath, 'utf-8');

    // 匹配 export type { TypeA, TypeB } from '...'
    // 匹配 export { TypeA, TypeB } from '...'
    const reExportRegex = /export\s+(?:type\s+)?\{([^}]+)\}/g;
    let match;
    while ((match = reExportRegex.exec(content)) !== null) {
      const names = match[1].split(',').map((n) => {
        const trimmed = n.trim();
        // 处理 as 重命名: OriginalName as ExportedName
        const asMatch = trimmed.match(/(\w+)\s+as\s+(\w+)/);
        return asMatch ? asMatch[2] : trimmed;
      });
      typeNames.push(...names.filter((n) => n && /^[A-Z]/.test(n)));
    }

    // 匹配 export type TypeA = ...
    const typeAliasRegex = /export\s+type\s+([A-Z]\w+)/g;
    while ((match = typeAliasRegex.exec(content)) !== null) {
      typeNames.push(match[1]);
    }

    // 匹配 export interface TypeA { ... }
    const interfaceRegex = /export\s+interface\s+([A-Z]\w+)/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      typeNames.push(match[1]);
    }

    // 匹配 export enum TypeA { ... }
    const enumRegex = /export\s+enum\s+([A-Z]\w+)/g;
    while ((match = enumRegex.exec(content)) !== null) {
      typeNames.push(match[1]);
    }
  }

  return [...new Set(typeNames)];
}

// 缓存 shared 类型名列表（避免每个文件都读磁盘）
const sharedTypeCache = new Map<string, string[]>();

export default createRule<Options, 'duplicateType'>({
  name: 'no-duplicate-type-definition',
  meta: {
    type: 'problem',
    docs: {
      description:
        '禁止在业务代码中重新定义 shared 目录已导出的类型。应直接 import 使用，避免类型不同步。',
    },
    messages: {
      duplicateType:
        '类型 `{{ typeName }}` 已在 shared 目录中定义并导出。请直接 `import type { {{ typeName }} } from "shared"` 使用，避免重复定义导致类型不同步。',
    },
    schema: [
      {
        type: 'object',
        properties: {
          sharedDir: {
            type: 'string',
            description: 'shared 目录的路径（相对于项目根目录或绝对路径）',
          },
          sharedTypeNames: {
            type: 'array',
            items: { type: 'string' },
            description: '手动指定的共享类型名列表（优先于自动扫描）',
          },
          excludeDirs: {
            type: 'array',
            items: { type: 'string' },
            description: '排除的目录（如 shared 本身、node_modules）',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      sharedDir: 'src/shared',
      sharedTypeNames: [],
      excludeDirs: ['shared', 'node_modules', '.gen'],
    },
  ],
  create(context, [options]) {
    const filename = context.filename || context.getFilename();
    const normalizedPath = filename.replace(/\\/g, '/');
    const excludeDirs = options.excludeDirs ?? ['shared', 'node_modules', '.gen'];

    // 排除 shared 目录本身和其他排除目录
    if (excludeDirs.some((dir) => normalizedPath.includes(`/${dir}/`))) {
      return {};
    }

    // 排除测试文件
    if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename)) {
      return {};
    }

    // 获取共享类型名列表
    let sharedTypeNames: string[] = options.sharedTypeNames ?? [];

    if (sharedTypeNames.length === 0 && options.sharedDir) {
      // 尝试自动扫描
      const sharedDir = path.isAbsolute(options.sharedDir)
        ? options.sharedDir
        : findSharedDir(filename, options.sharedDir);

      if (sharedDir) {
        if (!sharedTypeCache.has(sharedDir)) {
          sharedTypeCache.set(sharedDir, extractSharedTypeNames(sharedDir));
        }
        sharedTypeNames = sharedTypeCache.get(sharedDir) ?? [];
      }
    }

    if (sharedTypeNames.length === 0) {
      return {};
    }

    const sharedTypeSet = new Set(sharedTypeNames);

    return {
      // interface Foo { ... }
      TSInterfaceDeclaration(node: TSESTree.TSInterfaceDeclaration) {
        if (sharedTypeSet.has(node.id.name)) {
          context.report({
            node: node.id,
            messageId: 'duplicateType',
            data: { typeName: node.id.name },
          });
        }
      },

      // type Foo = ...
      TSTypeAliasDeclaration(node: TSESTree.TSTypeAliasDeclaration) {
        if (sharedTypeSet.has(node.id.name)) {
          context.report({
            node: node.id,
            messageId: 'duplicateType',
            data: { typeName: node.id.name },
          });
        }
      },

      // enum Foo { ... }
      TSEnumDeclaration(node: TSESTree.TSEnumDeclaration) {
        if (sharedTypeSet.has(node.id.name)) {
          context.report({
            node: node.id,
            messageId: 'duplicateType',
            data: { typeName: node.id.name },
          });
        }
      },
    };
  },
});

/**
 * 从当前文件路径向上查找项目根目录，然后拼接 sharedDir
 */
function findSharedDir(filename: string, relativeSharedDir: string): string | null {
  let dir = path.dirname(filename);
  const root = path.parse(dir).root;

  while (dir !== root) {
    const candidate = path.join(dir, relativeSharedDir);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }

    // 检查 package.json 标记项目根
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      const candidate2 = path.join(dir, relativeSharedDir);
      if (fs.existsSync(candidate2)) {
        return candidate2;
      }
      return null; // 找到项目根但没有 shared 目录
    }

    dir = path.dirname(dir);
  }

  return null;
}