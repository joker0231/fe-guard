# {{PROJECT_NAME}}

基于 [fe-guard](https://github.com/joker0231/fe-guard) 的前端项目脚手架。

## 技术栈

- **框架**: React 18 + TypeScript 5 (strict)
- **构建**: Vite 5
- **样式**: Tailwind CSS 3 + CSS Variables（支持暗色模式）
- **组件**: Radix UI + class-variance-authority (cva)
- **表单**: React Hook Form + Zod
- **路由**: TanStack Router
- **数据**: TanStack Query + openapi-fetch
- **状态**: Zustand
- **测试**: Vitest + Testing Library
- **静态检查**: fe-guard (79+ rules)

## 快速开始

```bash
pnpm install
pnpm dev          # 启动开发服务器
pnpm check        # 跑完整检查（lint + typecheck + test）
pnpm build        # 生产构建
```

## 项目结构

```
src/
├── components/ui/   # 22 个基础组件（Button/Input/Dialog 等）
├── hooks/           # 通用 Hooks（useList/useConfirmAction 等）
├── lib/             # 工具模块（api/logger/sanitize/utils）
├── pages/           # 业务页面
├── routes/          # TanStack Router 配置
└── types/           # 类型定义
```

## 核心规范

1. **不要使用原生 HTML 元素**（除 `<div>` 外），必须使用 `src/components/ui/` 下的封装组件
2. **不要硬编码颜色**，使用 Tailwind 主题变量（`bg-primary` 而非 `bg-[#3b82f6]`）
3. **I/O 边界数据必须经 Zod 验证**，使用 `parseResponse(Schema, data)`
4. **事件 handler 的 async 调用必须 try-catch**
5. **所有状态必须处理四态**（loading/error/empty/success），使用 `<LoadingSpinner />` `<ErrorState />` `<EmptyState />`

完整规范见 [fe-guard 文档](https://github.com/joker0231/fe-guard)。

## fe-guard 检查

```bash
pnpm lint          # ESLint + fe-guard 规则
pnpm typecheck     # TypeScript
pnpm test          # 单元测试
pnpm check         # 全部一起跑
```

规则违反会在编译/lint 时报错，**不要用 `// eslint-disable` 绕过**。