import { createRule } from '../../utils/rule-helpers';
import { isInsideTryCatch } from '../../utils/ast-helpers';

export default createRule({
  name: 'await-in-try',
  meta: {
    type: 'problem',
    docs: { description: 'Require await expressions to be in try-catch blocks' },
    schema: [],
    messages: {
      awaitNotInTry:
        "`await` 未在 `try-catch` 中。Promise被reject时错误会向上传播导致未捕获异常。请用 `try { await ... } catch (error) { /* 处理错误 */ }` 包裹。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      AwaitExpression(node) {
        if (isInsideTryCatch(node)) return;

        // Skip fetch/axios calls — already covered by fetch-must-catch
        const arg = node.argument;
        if (arg.type === 'CallExpression') {
          const callee = arg.callee;
          if (callee.type === 'Identifier' && callee.name === 'fetch') return;
          if (
            callee.type === 'MemberExpression' &&
            callee.object.type === 'Identifier' &&
            callee.object.name === 'axios'
          ) return;
        }

        context.report({ node, messageId: 'awaitNotInTry' });
      },
    };
  },
});
