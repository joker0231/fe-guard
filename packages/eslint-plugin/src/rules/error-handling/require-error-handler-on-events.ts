import { createRule } from '../../utils/rule-helpers';
import { isEventHandlerProp } from '../../utils/jsx-helpers';
import { isInsideTryCatch, isPromiseHandled } from '../../utils/ast-helpers';
import { getTypeServices, isPromiseType, getNodeType } from '../../utils/type-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

type FunctionLike =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionExpression;

/**
 * Rule: require-error-handler-on-events
 *
 * JSX事件handler（onClick/onChange/onSubmit等）中的async调用必须有错误处理。
 * React会吞掉handler中未catch的错误，用户操作失败但没有任何反馈。
 *
 * 检测模式：
 *   1. 属性名匹配 /^on[A-Z]/（isEventHandlerProp）
 *   2. 值是内联的 ArrowFunctionExpression 或 FunctionExpression
 *   3. 如果函数是async：所有AwaitExpression必须在try-catch内（函数自身边界为止）
 *   4. 如果函数是非async：调用返回Promise的函数必须有.catch()/.then()/await处理
 *
 * 白名单：
 *   - handler是引用的变量（无法跨函数静态分析）→ 跳过
 *   - 函数体内无任何异步调用 → 跳过
 *
 * 类型服务可选：
 *   - 有类型服务时可精确识别Promise-returning函数
 *   - 无类型服务时退化为只检测async函数的await是否有try-catch
 */
export default createRule({
  name: 'require-error-handler-on-events',
  meta: {
    type: 'problem',
    docs: {
      description:
        'JSX事件handler中的async调用必须有错误处理（try-catch或.catch()）',
    },
    schema: [],
    messages: {
      asyncAwaitNoTryCatch:
        "事件handler '{{eventName}}' 中的 await 缺少 try-catch 保护。\n" +
        'React会吞掉handler中未catch的错误，用户操作失败但无反馈。\n' +
        '请用 try-catch 包裹：\n' +
        '  try { await fetchSomething(); } catch (e) { logger.error(e); }',
      floatingPromiseInHandler:
        "事件handler '{{eventName}}' 中的异步调用 '{{call}}' 缺少错误处理。\n" +
        '请添加：\n' +
        '  1. 改为async函数并用 try-catch 包裹 await\n' +
        '  2. 链式 .catch(e => logger.error(e))',
    },
  },
  defaultOptions: [],
  create(context) {
    const services = getTypeServices(context);
    const checker = services?.program.getTypeChecker();

    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        // 1. 属性名必须是事件处理器
        if (node.name.type !== 'JSXIdentifier') return;
        const eventName = node.name.name;
        if (!isEventHandlerProp(eventName)) return;

        // 2. 值必须是 JSXExpressionContainer
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return;
        const expr = node.value.expression;
        if (expr.type === 'JSXEmptyExpression') return;

        // 3. 只检测内联的箭头函数或函数表达式（引用变量跳过）
        if (
          expr.type !== 'ArrowFunctionExpression' &&
          expr.type !== 'FunctionExpression'
        ) {
          return;
        }

        const fn = expr as FunctionLike;

        // 4. 根据async/非async分流检测
        if (fn.async) {
          checkAsyncHandler(fn, eventName);
        } else {
          checkSyncHandler(fn, eventName);
        }
      },
    };

    /**
     * async handler：所有 await 必须在 try-catch 内（函数边界为止）
     */
    function checkAsyncHandler(fn: FunctionLike, eventName: string): void {
      walkFunctionBody(fn, (n) => {
        if (n.type === 'AwaitExpression') {
          if (!isInsideTryCatch(n, fn)) {
            context.report({
              node: n,
              messageId: 'asyncAwaitNoTryCatch',
              data: { eventName },
            });
          }
        }
      });
    }

    /**
     * 非async handler：调用返回Promise的函数必须有 .then/.catch/await 处理
     * 需要类型服务才能准确识别 Promise-returning 函数；无类型服务则跳过
     */
    function checkSyncHandler(fn: FunctionLike, eventName: string): void {
      if (!services || !checker) return;

      walkFunctionBody(fn, (n) => {
        if (n.type !== 'CallExpression') return;

        // 已经被处理（.then/.catch/await/void/return/赋值给变量）则跳过
        if (isPromiseHandled(n)) return;

        // 判断是否返回Promise
        const nodeType = getNodeType(n, services);
        if (!isPromiseType(nodeType, checker)) return;

        const calleeText = context.sourceCode.getText(n.callee);
        const call =
          calleeText.length > 40 ? calleeText.slice(0, 37) + '...' : calleeText;

        context.report({
          node: n,
          messageId: 'floatingPromiseInHandler',
          data: { eventName, call },
        });
      });
    }

    /**
     * 遍历函数体内的节点，遇到嵌套函数边界则停止（不深入）
     */
    function walkFunctionBody(
      fn: FunctionLike,
      visit: (node: TSESTree.Node) => void,
    ): void {
      const root = fn.body;
      walk(root);

      function walk(node: TSESTree.Node | null | undefined): void {
        if (!node || typeof node !== 'object') return;

        visit(node);

        // 遇到嵌套函数边界停止（handler内部另起的函数有自己的作用域）
        if (
          node !== root &&
          (node.type === 'ArrowFunctionExpression' ||
            node.type === 'FunctionExpression' ||
            node.type === 'FunctionDeclaration')
        ) {
          return;
        }

        for (const key in node) {
          if (key === 'parent' || key === 'loc' || key === 'range') continue;
          const child = (node as unknown as Record<string, unknown>)[key];
          if (Array.isArray(child)) {
            for (const c of child) {
              if (c && typeof c === 'object' && 'type' in c) {
                walk(c as TSESTree.Node);
              }
            }
          } else if (child && typeof child === 'object' && 'type' in child) {
            walk(child as TSESTree.Node);
          }
        }
      }
    }
  },
});