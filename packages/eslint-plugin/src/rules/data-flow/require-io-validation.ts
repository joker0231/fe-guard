import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

/**
 * Rule: require-io-validation
 *
 * 外部IO（fetch/axios响应）的数据必须经过Schema验证后才能使用。
 * 未验证的外部数据直接流向UI会导致运行时崩溃，或引入安全问题。
 *
 * 污点源（taint sources）：
 *   1. await fetch(...) 及其 .json() 调用结果
 *   2. await axios(...)/axios.get/post/put/delete/patch(...) 及其 .data 访问
 *
 * 净化函数（sanitizers）：
 *   1. *Schema.parse(x) / *Schema.safeParse(x)（Zod）
 *   2. yup.*.validate(...) / 名字含 validate/verify/check 的函数
 *
 * 污点汇（sinks）：
 *   1. setXxx(...) / setState(...) / useState(...)（React setter）
 *   2. JSX 中直接引用（<div>{data}</div> / <Comp data={x} />）
 *
 * 白名单：
 *   1. 行内 `// @io-validated` 注释（可挂在 VariableDeclaration 或 sink 调用处）
 *   2. 测试文件（*.test.ts / *.spec.ts / __tests__/ / __mocks__/）
 *
 * 限制：
 *   - 单函数作用域内分析（跨函数由 Phase 1 污点分析覆盖）
 *   - 最多追踪 3 层赋值链
 *   - 解构赋值保守处理：所有解构目标都继承污点
 */

const TAINT_DEPTH_LIMIT = 3;
const SANITIZER_NAME_RE = /(validate|verify|check)/i;

function isTestFile(filename: string): boolean {
  return (
    /\.(test|spec)\.[tj]sx?$/.test(filename) ||
    /\/__tests__\//.test(filename) ||
    /\/__mocks__\//.test(filename)
  );
}

/** 判断是否是 axios 调用：axios(...) / axios.get(...) 等 */
function isAxiosCall(node: TSESTree.Node): boolean {
  if (node.type !== 'CallExpression') return false;
  const callee = node.callee;
  if (callee.type === 'Identifier' && callee.name === 'axios') return true;
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'axios' &&
    callee.property.type === 'Identifier' &&
    ['get', 'post', 'put', 'delete', 'patch', 'request', 'head'].includes(
      callee.property.name,
    )
  ) {
    return true;
  }
  return false;
}

/** 判断是否是 fetch 调用：fetch(...) */
function isFetchCall(node: TSESTree.Node): boolean {
  return (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'fetch'
  );
}

/**
 * 判断节点自身是否是污点源（不依赖上下文变量表）。
 * 识别直接的 IO 调用表达式。
 */
function isDirectTaintSource(node: TSESTree.Node): boolean {
  // Pattern A: await fetch(...) / await axios.XXX(...)
  if (node.type === 'AwaitExpression') {
    const arg = node.argument;
    if (isFetchCall(arg) || isAxiosCall(arg)) return true;
    // await res.json()
    if (
      arg.type === 'CallExpression' &&
      arg.callee.type === 'MemberExpression' &&
      arg.callee.property.type === 'Identifier' &&
      arg.callee.property.name === 'json'
    ) {
      return true;
    }
  }

  // Pattern B: axios.get(...).data / (await axios.get(...)).data
  if (
    node.type === 'MemberExpression' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'data'
  ) {
    const obj = node.object;
    if (obj.type === 'AwaitExpression' && isAxiosCall(obj.argument)) {
      return true;
    }
    if (isAxiosCall(obj)) return true;
  }

  return false;
}

/** 判断 CallExpression 是否是净化调用 */
function isSanitizerCall(node: TSESTree.CallExpression): boolean {
  const callee = node.callee;
  if (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier'
  ) {
    const m = callee.property.name;
    if (m === 'parse' || m === 'safeParse') return true;
    if (SANITIZER_NAME_RE.test(m)) return true;
  }
  if (callee.type === 'Identifier' && SANITIZER_NAME_RE.test(callee.name)) {
    return true;
  }
  return false;
}

/** 判断 CallExpression 是否是 sink（setState 类），返回污点参数索引 */
function getSinkArgIndices(node: TSESTree.CallExpression): number[] {
  const callee = node.callee;
  if (callee.type === 'Identifier') {
    if (/^set[A-Z]/.test(callee.name) || callee.name === 'useState') {
      return [0];
    }
  }
  if (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'setState'
  ) {
    return [0];
  }
  return [];
}

/** 从 Identifier / MemberExpression 提取根标识符名 */
function getReferencedIdent(node: TSESTree.Node | null): string | null {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    return getReferencedIdent(node.object);
  }
  return null;
}

export default createRule({
  name: 'require-io-validation',
  meta: {
    type: 'problem',
    docs: {
      description:
        '外部IO（fetch/axios响应）的数据必须经过Schema验证后才能使用',
    },
    schema: [],
    messages: {
      taintFlowToSink:
        "来自外部IO的未验证数据 '{{name}}' 流向 '{{sink}}'。\n" +
        '外部输入必须先经过Schema验证，否则运行时可能崩溃或引入安全问题。\n' +
        '请使用Zod（推荐）：\n' +
        '  const validated = MySchema.parse(raw);\n' +
        '或标记为已验证（如果确认此处无需验证）：\n' +
        '  // @io-validated',
      taintFlowToJsx:
        "来自外部IO的未验证数据 '{{name}}' 被渲染到JSX。\n" +
        '请先用 Schema.parse() 验证结构，避免运行时崩溃。\n' +
        '如果确认无需验证，添加注释：// @io-validated',
    },
  },
  defaultOptions: [],
  create(context) {
    if (isTestFile(context.filename)) return {};

    /** 作用域栈：函数边界push/pop */
    const taintStack: Map<string, number>[] = [new Map()];
    const currentScope = () => taintStack[taintStack.length - 1];

    function lookupTaint(name: string): number | null {
      for (let i = taintStack.length - 1; i >= 0; i--) {
        const d = taintStack[i].get(name);
        if (d !== undefined) return d;
      }
      return null;
    }

    function addTaint(name: string, depth: number): void {
      if (depth > TAINT_DEPTH_LIMIT) return;
      currentScope().set(name, depth);
    }

    function removeTaint(name: string): void {
      for (let i = taintStack.length - 1; i >= 0; i--) {
        if (taintStack[i].has(name)) {
          taintStack[i].delete(name);
          return;
        }
      }
    }

    /**
     * 检查节点及其祖先链上是否有 @io-validated 注释。
     * 注释通常挂在 VariableDeclaration / ExpressionStatement 上。
     */
    function hasValidatedComment(node: TSESTree.Node): boolean {
      const sc = context.sourceCode;
      let cur: TSESTree.Node | undefined = node;
      // 向上找最多3层
      for (let i = 0; i < 3 && cur; i++) {
        const cmts = sc.getCommentsBefore(cur);
        for (const c of cmts) {
          if (/@io-validated/.test(c.value)) return true;
        }
        cur = cur.parent;
      }
      // 同行 trailing 注释
      const line = node.loc?.start.line;
      if (line !== undefined) {
        for (const c of sc.getAllComments()) {
          if (c.loc?.start.line === line && /@io-validated/.test(c.value)) {
            return true;
          }
        }
      }
      return false;
    }

    /**
     * 递归分析表达式是否承载污点数据。
     */
    function analyzeExprTaint(
      node: TSESTree.Node | null,
    ): { tainted: boolean; depth: number } {
      if (!node) return { tainted: false, depth: 0 };

      // 净化调用：返回值非污点
      if (node.type === 'CallExpression' && isSanitizerCall(node)) {
        return { tainted: false, depth: 0 };
      }

      // 直接污点源
      if (isDirectTaintSource(node)) {
        return { tainted: true, depth: 1 };
      }

      // Identifier：查作用域污点表
      if (node.type === 'Identifier') {
        const d = lookupTaint(node.name);
        if (d !== null) return { tainted: true, depth: d + 1 };
        return { tainted: false, depth: 0 };
      }

      // await X
      if (node.type === 'AwaitExpression') {
        return analyzeExprTaint(node.argument);
      }

      // x.y → 看 x
      if (node.type === 'MemberExpression') {
        return analyzeExprTaint(node.object);
      }

      // 函数调用（非净化）：任一参数污染则结果污染
      if (node.type === 'CallExpression') {
        for (const arg of node.arguments) {
          const r = analyzeExprTaint(arg);
          if (r.tainted) return { tainted: true, depth: r.depth };
        }
      }

      return { tainted: false, depth: 0 };
    }

    /** 从解构模式收集所有目标变量名 */
    function collectPatternNames(
      pattern: TSESTree.DestructuringPattern | TSESTree.Node,
    ): string[] {
      const names: string[] = [];
      function walk(p: TSESTree.Node | null | undefined): void {
        if (!p) return;
        if (p.type === 'Identifier') {
          names.push(p.name);
        } else if (p.type === 'ObjectPattern') {
          for (const prop of p.properties) {
            if (prop.type === 'Property') walk(prop.value);
            else if (prop.type === 'RestElement') walk(prop.argument);
          }
        } else if (p.type === 'ArrayPattern') {
          for (const el of p.elements) walk(el);
        } else if (p.type === 'AssignmentPattern') {
          walk(p.left);
        } else if (p.type === 'RestElement') {
          walk(p.argument);
        }
      }
      walk(pattern);
      return names;
    }

    return {
      ':function'() {
        taintStack.push(new Map());
      },
      ':function:exit'() {
        taintStack.pop();
      },

      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (!node.init) return;
        if (hasValidatedComment(node)) return;

        const result = analyzeExprTaint(node.init);
        if (!result.tainted) return;

        if (node.id.type === 'Identifier') {
          addTaint(node.id.name, result.depth);
          return;
        }

        if (
          node.id.type === 'ObjectPattern' ||
          node.id.type === 'ArrayPattern'
        ) {
          for (const name of collectPatternNames(node.id)) {
            addTaint(name, result.depth);
          }
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (node.left.type !== 'Identifier') return;
        const leftName = node.left.name;
        if (hasValidatedComment(node)) {
          removeTaint(leftName);
          return;
        }
        const result = analyzeExprTaint(node.right);
        if (result.tainted) {
          addTaint(leftName, result.depth);
        } else {
          removeTaint(leftName);
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (isSanitizerCall(node)) return;
        if (hasValidatedComment(node)) return;

        const sinkIndices = getSinkArgIndices(node);
        if (sinkIndices.length === 0) return;

        for (const idx of sinkIndices) {
          const arg = node.arguments[idx];
          if (!arg) continue;
          const r = analyzeExprTaint(arg);
          if (!r.tainted) continue;

          const name = getReferencedIdent(arg) ?? 'data';
          const calleeText = context.sourceCode.getText(node.callee);
          const sink =
            calleeText.length > 40
              ? calleeText.slice(0, 37) + '...'
              : calleeText;

          context.report({
            node: arg,
            messageId: 'taintFlowToSink',
            data: { name, sink },
          });
        }
      },

      JSXExpressionContainer(node: TSESTree.JSXExpressionContainer) {
        if (hasValidatedComment(node)) return;
        const expr = node.expression;
        if (expr.type === 'JSXEmptyExpression') return;

        const r = analyzeExprTaint(expr);
        if (!r.tainted) return;

        const name = getReferencedIdent(expr) ?? 'data';
        context.report({
          node: expr,
          messageId: 'taintFlowToJsx',
          data: { name },
        });
      },
    };
  },
});