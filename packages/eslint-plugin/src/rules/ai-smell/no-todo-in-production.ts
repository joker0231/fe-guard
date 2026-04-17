import { createRule } from '../../utils/rule-helpers';

const TODO_PATTERN = /\b(TODO|FIXME|HACK|XXX|PLACEHOLDER|TEMP)\b/i;

export default createRule({
  name: 'no-todo-in-production',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow TODO/FIXME/HACK comments in production code' },
    schema: [],
    messages: {
      todoComment:
        "检测到 '{{keyword}}' 注释，表示功能未完成或存在已知问题。请在发布前处理此标记：完成实现、修复问题或移除注释。",
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
          const match = TODO_PATTERN.exec(comment.value);
          if (match) {
            context.report({
              loc: comment.loc!,
              messageId: 'todoComment',
              data: { keyword: match[1].toUpperCase() },
            });
          }
        }
      },
    };
  },
});
