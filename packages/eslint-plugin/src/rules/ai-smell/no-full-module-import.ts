import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

/**
 * Libraries that should not be imported as default/whole module.
 * Each entry provides the tree-shakable alternative.
 */
const FULL_IMPORT_LIBS: Record<string, { alternative: string; reason: string }> = {
  lodash: {
    alternative: "import get from 'lodash/get'（按需）或 lodash-es",
    reason: 'lodash全量import约70KB，通过按需import可显著减少bundle size',
  },
  moment: {
    alternative: '改用 dayjs 或 date-fns',
    reason: 'moment已不推荐使用，dayjs只有2KB且API相似',
  },
  ramda: {
    alternative: "按需导入 import * as R from 'ramda/es/xxx'",
    reason: 'ramda全量import约50KB',
  },
  '@ant-design/icons': {
    alternative: "import { UserOutlined } from '@ant-design/icons'（按需）",
    reason: '图标库必须按需导入',
  },
  rxjs: {
    alternative: "import { Observable } from 'rxjs'（按需）",
    reason: 'rxjs全量import巨大',
  },
};

/** Libraries where `import * as X from 'lib'` is forbidden */
const NAMESPACE_BAN_LIST = new Set([
  'antd',
  '@mui/material',
  '@ant-design/icons',
  'lodash',
  'ramda',
  'rxjs',
  'date-fns',
]);

export default createRule({
  name: 'no-full-module-import',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow full-module imports of large libraries to enable tree-shaking',
    },
    schema: [],
    messages: {
      fullDefaultImport:
        '禁止全量导入 "{{module}}"。{{reason}}。请改用：{{alternative}}',
      namespaceImport:
        '禁止使用命名空间导入 "import * as X from \'{{module}}\'"，这会导致整个库被打包。' +
        '请使用具名导入 "import { X, Y } from \'{{module}}\'"',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ImportDeclaration(node: TSESTree.ImportDeclaration) {
        // Skip type-only imports (don't affect bundle)
        if (node.importKind === 'type') return;

        const source = node.source.value;
        if (typeof source !== 'string') return;

        // Check 1: Default import of large libraries
        const libInfo = FULL_IMPORT_LIBS[source];
        if (libInfo) {
          const defaultImport = node.specifiers.find(
            (s) => s.type === 'ImportDefaultSpecifier',
          );
          if (defaultImport) {
            context.report({
              node,
              messageId: 'fullDefaultImport',
              data: {
                module: source,
                alternative: libInfo.alternative,
                reason: libInfo.reason,
              },
            });
          }
        }

        // Check 2: Namespace import of large libraries
        if (NAMESPACE_BAN_LIST.has(source)) {
          const namespaceImport = node.specifiers.find(
            (s) => s.type === 'ImportNamespaceSpecifier',
          );
          if (namespaceImport) {
            // Skip if it's a type-only namespace import (per-specifier importKind)
            const importKind = (namespaceImport as unknown as { importKind?: string }).importKind;
            if (importKind === 'type') return;

            context.report({
              node,
              messageId: 'namespaceImport',
              data: { module: source },
            });
          }
        }
      },
    };
  },
});