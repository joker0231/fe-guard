import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/data-flow/no-duplicate-type-definition';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

// 使用手动指定的 sharedTypeNames 进行测试（不依赖文件系统）
ruleTester.run('no-duplicate-type-definition', rule, {
  valid: [
    // ✅ 没有重复定义
    {
      code: `
        import type { Task } from 'shared';
        const task: Task = { id: '1', title: 'test' };
      `,
      options: [{ sharedTypeNames: ['Task', 'Comment', 'User'] }],
      filename: '/project/src/routes/dashboard.tsx',
    },
    // ✅ 定义了不同名的类型
    {
      code: `
        interface DashboardProps { title: string; }
        type FilterOptions = { status: string; };
      `,
      options: [{ sharedTypeNames: ['Task', 'Comment', 'User'] }],
      filename: '/project/src/routes/dashboard.tsx',
    },
    // ✅ shared 目录自身可以定义
    {
      code: `
        export interface Task { id: string; title: string; }
      `,
      options: [{ sharedTypeNames: ['Task'] }],
      filename: '/project/src/shared/types.ts',
    },
    // ✅ 测试文件排除
    {
      code: `
        interface Task { id: string; }
      `,
      options: [{ sharedTypeNames: ['Task'] }],
      filename: '/project/src/routes/dashboard.test.ts',
    },
    // ✅ .gen 目录排除（通过 excludeDirs 跳过）
    {
      code: `
        interface Task { id: string; }
      `,
      options: [{ sharedTypeNames: ['Task'], excludeDirs: ['shared', 'node_modules', '.gen'] }],
      filename: '/project/src/.gen/types.ts',
    },
  ],
  invalid: [
    // ❌ 重新定义了 shared 的 interface
    {
      code: `
        interface Task {
          id: string;
          title: string;
          status: string;
        }
        function Dashboard() { return null; }
      `,
      options: [{ sharedTypeNames: ['Task', 'Comment', 'User'] }],
      filename: '/project/src/routes/dashboard.tsx',
      errors: [{ messageId: 'duplicateType', data: { typeName: 'Task' } }],
    },
    // ❌ 重新定义了 shared 的 type
    {
      code: `
        type Comment = {
          id: string;
          content: string;
        };
      `,
      options: [{ sharedTypeNames: ['Task', 'Comment', 'User'] }],
      filename: '/project/src/routes/task-detail.tsx',
      errors: [{ messageId: 'duplicateType', data: { typeName: 'Comment' } }],
    },
    // ❌ 多个重复定义
    {
      code: `
        interface Task { id: string; }
        interface Comment { id: string; }
        type User = { name: string; };
      `,
      options: [{ sharedTypeNames: ['Task', 'Comment', 'User'] }],
      filename: '/project/src/routes/overview.tsx',
      errors: [
        { messageId: 'duplicateType', data: { typeName: 'Task' } },
        { messageId: 'duplicateType', data: { typeName: 'Comment' } },
        { messageId: 'duplicateType', data: { typeName: 'User' } },
      ],
    },
    // ❌ 在 lib 目录下也不允许重复（只有 shared 自身例外）
    {
      code: `
        interface Task { id: string; title: string; }
      `,
      options: [{ sharedTypeNames: ['Task'] }],
      filename: '/project/src/lib/helpers.ts',
      errors: [{ messageId: 'duplicateType', data: { typeName: 'Task' } }],
    },
  ],
});