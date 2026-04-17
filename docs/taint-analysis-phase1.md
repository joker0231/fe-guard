# 轻量级污点分析可行性调研（Phase 1）

**调研目标**：评估在 fe-guard 中引入跨文件数据流（污点）分析的可行性，并给出 Phase 1 的具体实现路径。

**范围**：Phase 1 只跟踪 `fetch` 和 `axios` 响应（外部输入 → UI 渲染/状态更新）这一类污点流。

**与已有 ESLint 规则的关系**：已实现的 `require-io-validation` 是单文件作用域的简化版；本文档讨论的是跨文件增强版（作为 L2 Vite 插件层能力）。

---

## 1. 工具选型

| 方案 | 工作量 | 性能 | 能力上限 | 生态契合度 |
|------|-------|------|---------|-----------|
| **ts-morph**（推荐） | ⭐⭐ 中 | ⭐⭐⭐ 良好（封装好） | ⭐⭐⭐⭐ 完整，含类型信息、跨文件引用查找、rename、符号追踪 | ⭐⭐⭐⭐ 与现有Vite插件共生良好 |
| TypeScript Compiler API 直接用 | ⭐⭐⭐⭐ 重 | ⭐⭐⭐⭐ 最佳 | ⭐⭐⭐⭐⭐ 无上限 | ⭐⭐ 需自写大量辅助代码 |
| 自研 Visitor（纯 AST） | ⭐⭐⭐ 中 | ⭐⭐⭐⭐⭐ 最快 | ⭐⭐ 受限（无类型、无跨文件引用） | ⭐⭐⭐ 简单场景够用 |

**结论**：选 **ts-morph**。
- 已在 Vite 插件分析器中广泛使用（`page-reachability-analyzer` 等都基于 TS Project）
- 内置 `getReferences`、`getDefinitions`、`getType` 等高层 API，避免重复造轮子
- Project 可复用，不会重复初始化 TSC

---

## 2. 污点源（Sources）定义

### Phase 1 只识别以下 AST 模式

| 模式 | AST 识别点 | 举例 |
|------|-----------|------|
| **S1**: `await fetch(...)` | `AwaitExpression.argument = CallExpression` + callee.name=`fetch` | `const res = await fetch('/api/x')` |
| **S2**: `res.json()` / `await res.json()` | `CallExpression.expression = PropertyAccessExpression` + name=`json` | `const data = await res.json()` |
| **S3**: `axios(...)` / `axios.get/post/put/delete/patch/head/request(...)` | `CallExpression.expression` 是 `axios` 或 `axios.XXX` | `const res = await axios.get('/api/x')` |
| **S4**: 上述结果的 `.data` 访问 | `PropertyAccessExpression`，name=`data`，object 是 S1/S3 结果 | `setUsers(res.data)` |

### 推广策略（后续阶段）

- S5：`navigator.geolocation.*` / `localStorage.getItem` / `URLSearchParams.get` / `window.location.*`
- S6：`postMessage` 事件数据、`MessageChannel`、`BroadcastChannel`

---

## 3. 污点传播（Propagation）

### 3.1 需要支持的传播模式

| 模式 | 示例 | 处理方式 |
|------|------|----------|
| **P1** 同作用域变量赋值 | `const b = a` | `a` tainted → `b` tainted |
| **P2** 解构赋值 | `const { data } = res` | `res` tainted → `data` tainted（字段级或保守全继承） |
| **P3** 函数参数传递（跨作用域） | `foo(a)` 其中 `a` tainted → `foo` 的形参 tainted | **难点**，需要跨函数 |
| **P4** 函数返回值 | `function wrap() { return await fetch(...) }` 返回值 tainted | 需函数级 summary |
| **P5** 跨文件 import/export | `import { loadUsers } from './api'` | 需跨文件符号解析 |
| **P6** 对象属性装入 | `obj.x = taintedValue` → `obj.x` tainted | 保守近似：污点"溢出"整个对象 |

### 3.2 Phase 1 实现建议

- **P1/P2 全支持**：在单函数作用域内维护 `Map<string, TaintInfo>` 即可
- **P3/P4 有限支持**：只跟踪**本仓库定义的**函数；对外部包（如 `axios`）只识别其**顶层函数签名**（白名单 + 特殊规则）
- **P5 全支持（核心价值）**：通过 ts-morph 的 `getReferences()` 识别 export 符号的所有使用点
- **P6 暂不支持**：对象属性污染一律保守处理（对象整体视为 tainted）

### 3.3 跨函数跟踪策略

**方案 A：过程间摘要（Interprocedural Summary）**
- 扫一遍所有函数，生成"函数 → 参数污染透传规则 + 返回值是否 tainted"的摘要
- 分析时查摘要，避免深入

**方案 B：即时内联（inline）**
- 遇到调用点时展开被调函数的 body 作为分析子图

Phase 1 选 **方案 A**，成本低、能处理大部分场景。

---

## 4. 去污染（Sanitizer）识别

### 4.1 识别模式（与 `require-io-validation` ESLint 规则对齐）

| 类型 | 模式 | 举例 |
|------|------|------|
| **Z1** Zod `.parse` / `.safeParse` | `X.parse(tainted)` 或 `X.safeParse(tainted)` | `const u = UserSchema.parse(raw)` |
| **Z2** Yup `.validate` | `X.validate(tainted)` | `schema.validate(raw)` |
| **Z3** 命名启发式 | 函数名含 `validate`/`verify`/`check` | `validateUser(raw)` |
| **Z4** 类型断言（保守不识别） | `raw as User` | **Phase 1 不承认**，仅警告 |
| **Z5** `// @io-validated` 行内注释 | 特定变量声明上方 | 与 ESLint 规则一致 |

### 4.2 自定义 validator 的识别

- **基于命名约定**（低成本，默认开启）：函数名匹配 `/(validate|verify|check)/i`
- **基于 TS 类型签名**（高精度，可选）：返回类型是 `SafeParseReturnType` / `Result<T,E>` / 形如 `{success:boolean, data?:T}` 的类型

Phase 1 推荐**命名约定 + 用户可配置 `sanitizers: ['validateUser', 'myValidate']`**。

---

## 5. 汇（Sinks）识别

| 汇 | 模式 | 说明 |
|----|------|------|
| **K1** React setter | `setXxx(...)` / `useState(...)` / `this.setState({...})` | `/^set[A-Z]/` 启发式 + React hook 签名识别 |
| **K2** JSX 表达式容器 | `<div>{tainted}</div>` | AST: JsxExpression |
| **K3** JSX 组件属性 | `<Child data={tainted} />` | AST: JsxAttribute with expression |
| **K4** `dangerouslySetInnerHTML` | `dangerouslySetInnerHTML={{__html: tainted}}` | 已有规则 `no-raw-dangerously-set-innerhtml` 可复用 |
| **K5** `localStorage.setItem` / `document.title` | 全局污染面 | Phase 2 再做 |

---

## 6. 性能预估

### 6.1 基准假设
- 项目规模：5000 行 TS/TSX，约 50 个文件
- 函数数：约 300 个

### 6.2 估算

| 阶段 | 操作 | 预估耗时（冷启动） |
|------|------|----|
| Project 初始化（ts-morph + tsconfig） | 一次 | 2~3 秒 |
| 全局污点源扫描（S1-S4 模式匹配） | 全量 AST walk | 0.5~1 秒 |
| 函数摘要生成 | 300 函数 | 1~2 秒 |
| 跨文件引用解析 | `getReferences` × 污点导出符号数 | 1~3 秒 |
| 单轮完整分析 | **总计** | **5~10 秒** |

### 6.3 增量分析可行性

- ts-morph 的 Project 对象支持 `addSourceFileAtPath` / `refreshFromFileSystem`，适合增量
- 文件变更后：重算该文件的函数摘要 → 传播到下游引用文件
- 预估增量耗时：**1~2 秒/文件**

**结论**：冷启动 10 秒内可接受，增量分析可用于 dev server 集成。

---

## 7. 误报率预估 & 白名单机制

### 7.1 主要误报来源

| # | 场景 | 发生频率 | 缓解策略 |
|---|------|---------|---------|
| E1 | 内部 API（已知返回结构）响应当作外部输入 | 中 | 按URL白名单（`internalEndpoints: ['/internal/*']`），这类仍需警告但降级为 warn |
| E2 | 被 `.parse()` 但是 JSON 而非 Schema（如 `JSON.parse`） | 高 | 严格识别 `XxxSchema.parse` 而非任何 `.parse`（已在 ESLint 规则中处理） |
| E3 | 通过中间层 adapter 已净化 | 中 | 函数摘要支持"此函数已净化"标记（@io-validated 注释在函数定义处） |
| E4 | 第三方库 wrapper | 低 | 白名单配置：`sanitizerPackages: ['zod', 'yup', 'io-ts']` |
| E5 | 测试代码 | 高 | 整文件跳过 `*.test.ts` / `*.spec.ts` / `__tests__/` |

### 7.2 白名单配置

```ts
// frontend-guard.config.ts
export default {
  taintAnalysis: {
    sources: {
      include: ['fetch', 'axios'],           // 污点源白名单
      excludeUrls: ['/internal/stable-api']  // 可信URL
    },
    sanitizers: [
      'validateUser',                        // 自定义validator
      '/^assert[A-Z]/',                      // 正则形式
    ],
    ignoreFiles: ['src/legacy/**']
  }
}
```

---

## 8. 实现复杂度估算

### 8.1 代码量（Phase 1）

| 模块 | 预估行数 | 说明 |
|------|---------|------|
| `analyzers/taint-analyzer.ts` | 300~400 | 主分析器 |
| `analyzers/taint/source-detector.ts` | 100~150 | 识别污点源 |
| `analyzers/taint/sanitizer-detector.ts` | 80~100 | 识别净化调用 |
| `analyzers/taint/sink-detector.ts` | 100~150 | 识别汇 |
| `analyzers/taint/propagation.ts` | 200~300 | 传播逻辑（核心） |
| `analyzers/taint/function-summary.ts` | 150~200 | 函数摘要生成 |
| `analyzers/taint/config.ts` | 50 | 配置处理 |
| 测试用例（含夹具项目） | 500+ | fixture + 断言 |
| **总计** | **~1500~1900 行** | |

### 8.2 规则数量

- **单条集中规则**：`taint-unvalidated-io`（error）—— 外部输入未验证就到达 UI 汇
- 可配置的子场景：`taint-axios-to-setstate`、`taint-fetch-to-jsx`（作为违规详细类型）

---

## 9. 与 `require-io-validation` ESLint 规则的关系

| 维度 | ESLint 规则（已实现） | Vite 污点分析（本文调研） |
|------|---------------------|-------------------------|
| **作用层** | L1（单文件） | L2（跨文件） |
| **分析范围** | 单函数作用域内 | 跨函数、跨文件 |
| **跟踪深度** | 最多 3 层赋值 | 全局，受函数摘要收敛 |
| **性能** | 毫秒级，lint 集成 | 秒级，独立运行 / watch 模式 |
| **误报** | 少（保守） | 中等（需白名单配合） |
| **触发时机** | 编辑器实时 / CI ESLint | CI 阶段 / dev server 启动 |

### 9.1 定位

- **共存关系，不互相替代**
- ESLint 规则：**第一道防线**，捕获明显的单文件错误，编辑器即时反馈
- Vite 污点分析：**第二道防线**，捕获跨文件、跨函数的隐式数据流

### 9.2 协同策略

1. ESLint 规则已报告的单文件违规 → Vite 插件通过**行号 + messageId** 去重不再重复
2. ESLint 规则无法触达的场景（如"在 A 文件 fetch，在 B 文件 setState"）→ 由 Vite 污点分析兜底
3. 配置共享：`frontend-guard.config.ts` 的 `taintAnalysis.sanitizers` 字段同时被两者读取

---

## 10. Phase 1 实施路径（如果立项）

### 目录结构
```
packages/vite-plugin/src/analyzers/taint-analyzer/
├── index.ts                   # 对外入口 + Vite 插件 hook
├── source-detector.ts         # 污点源识别
├── sanitizer-detector.ts      # 净化函数识别
├── sink-detector.ts           # 汇识别
├── propagation.ts             # 传播引擎
├── function-summary.ts        # 过程间摘要
├── config.ts                  # 配置规范化
└── types.ts                   # TaintInfo/SummaryEntry 等类型
```

### 里程碑

| 里程碑 | 内容 | 预估工时 |
|--------|------|---------|
| M1 | ts-morph 集成 + Project 初始化 + S1-S4 源识别 | 1 天 |
| M2 | 单文件内传播 + 净化 + 汇识别（P1/P2/K1/K2） | 2 天 |
| M3 | 跨函数摘要（P3/P4） | 2 天 |
| M4 | 跨文件传播（P5） | 2 天 |
| M5 | 配置、白名单、Vite 插件集成 | 1 天 |
| M6 | 测试夹具 + 真实项目回归 | 2 天 |
| **总计** | | **~10 人日** |

### 验收标准

- 在 `examples/react-app` 上跑过，能识别至少 3 种跨文件污点流
- 冷启动 < 10 秒，增量 < 3 秒
- 在真实项目（pipeline-monitor 规模）上误报率 < 15%

---

## 11. 结论与建议

1. **可行性**：技术路径清晰，ts-morph 能支撑所有核心能力，风险可控
2. **优先级**：建议 Phase 1 **先不立项**——当前 L1 ESLint 规则 `require-io-validation` 已覆盖 80% 常见场景。等真实项目跑一轮后再评估跨文件分析的必要性
3. **立项触发条件**：出现至少 3 个 ESLint 未能捕获的跨文件漏报案例 → 才启动 Phase 1
4. **中间方案**：可先在 Vite 插件层增加 "fetch/axios 全局使用清单" 报告（不做传播，仅扫描源），用户 review 时再人工判断是否遗漏净化

---

**调研结论**：技术可行、成本可控，建议**按需立项**而非立即实施。