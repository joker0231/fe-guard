import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

/** Function name patterns that suggest error handling */
const HANDLER_PATTERN = /log|report|handle|notify|track|capture|record/i;

/** Console methods that count as "at least some handling" */
const CONSOLE_METHODS = new Set(['error', 'warn', 'log', 'info', 'debug']);

/**
 * Check if a statement represents some form of error handling.
 */
function isHandlingStatement(stmt: TSESTree.Statement): boolean {
  // throw / return 直接放行
  if (stmt.type === 'ThrowStatement' || stmt.type === 'ReturnStatement') {
    return true;
  }

  // 表达式语句：检查里面的调用
  if (stmt.type === 'ExpressionStatement') {
    const expr = stmt.expression;

    // AwaitExpression 包裹的调用
    const call = expr.type === 'AwaitExpression' ? expr.argument : expr;

    if (call.type !== 'CallExpression') return false;

    // console.xxx / logger.xxx 等
    if (call.callee.type === 'MemberExpression') {
      const obj = call.callee.object;
      const prop = call.callee.property;

      if (prop.type !== 'Identifier') return false;

      // console.error/warn/log/info/debug
      if (obj.type === 'Identifier' && obj.name === 'console' && CONSOLE_METHODS.has(prop.name)) {
        return true;
      }

      // logger.xxx / log.xxx
      if (obj.type === 'Identifier' && /^log(ger)?$/i.test(obj.name)) {
        return true;
      }

      // 方法名匹配 handler 模式（如 errorReporter.report()）
      if (HANDLER_PATTERN.test(prop.name)) {
        return true;
      }
    }

    // 直接函数调用：reportError(e) / handleError(e) 等
    if (call.callee.type === 'Identifier' && HANDLER_PATTERN.test(call.callee.name)) {
      return true;
    }
  }

  // if / try / switch 等控制流，认为有处理
  if (
    stmt.type === 'IfStatement' ||
    stmt.type === 'TryStatement' ||
    stmt.type === 'SwitchStatement'
  ) {
    return true;
  }

  return false;
}

export default createRule({
  name: 'no-empty-catch',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow empty catch blocks that silently swallow errors',
    },
    schema: [],
    messages: {
      emptyCatch:
        'catch块不能为空。必须至少处理错误（记录日志/抛出/返回）：\n' +
        '1. 调用 logger.error(e) 记录错误\n' +
        '2. throw 重新抛出\n' +
        '3. return 返回降级值\n' +
        '4. 调用错误上报函数如 reportError(e)',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      CatchClause(node: TSESTree.CatchClause) {
        const body = node.body.body;

        // 空块或只有空语句
        const nonEmpty = body.filter((stmt) => stmt.type !== 'EmptyStatement');

        if (nonEmpty.length === 0) {
          context.report({ node: node.body, messageId: 'emptyCatch' });
          return;
        }

        // 至少有一条语句是处理行为
        const hasHandling = nonEmpty.some((stmt) => isHandlingStatement(stmt));

        if (!hasHandling) {
          context.report({ node: node.body, messageId: 'emptyCatch' });
        }
      },
    };
  },
});