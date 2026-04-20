import { createRule } from '../../utils/rule-helpers';

const TODO_PATTERN = /\b(TODO|FIXME|HACK|XXX|PLACEHOLDER|TEMP)\b/i;

/**
 * Detect deferred implementation promises in comments.
 * AI loves to write "will implement later" and never comes back.
 */
const DEFERRED_PATTERN = /\b(will\s+implement|implement\s+later|do\s+later|fix\s+later|add\s+later|handle\s+later|will\s+add|will\s+fix|not\s+implemented|skip\s+for\s+now|come\s+back\s+to\s+this|revisit\s+later)\b/i;

export default createRule({
  name: 'no-todo-in-production',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow TODO/FIXME/HACK comments and deferred implementation promises in production code' },
    schema: [],
    messages: {
      todoComment:
        "检测到 '{{keyword}}' 注释，表示功能未完成或存在已知问题。请在发布前处理此标记：完成实现、修复问题或移除注释。",
      deferredPromise:
        "检测到延迟实现承诺 '{{phrase}}'。AI 常在注释中写下承诺但从不兑现。请立即实现该功能或移除相关代码。",
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename || '';
    if (/\.(test|spec)\./i.test(filename)) return {};
    if (/__tests__|__mocks__/i.test(filename)) return {};

    return {
      Program() {
        const comments = context.sourceCode.getAllComments();
        for (const comment of comments) {
          const todoMatch = TODO_PATTERN.exec(comment.value);
          if (todoMatch) {
            context.report({
              loc: comment.loc!,
              messageId: 'todoComment',
              data: { keyword: todoMatch[1].toUpperCase() },
            });
            continue; // Don't double-report same comment
          }

          const deferredMatch = DEFERRED_PATTERN.exec(comment.value);
          if (deferredMatch) {
            context.report({
              loc: comment.loc!,
              messageId: 'deferredPromise',
              data: { phrase: deferredMatch[1].toLowerCase() },
            });
          }
        }
      },
    };
  },
});
