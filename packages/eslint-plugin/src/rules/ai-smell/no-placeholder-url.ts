import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const PLACEHOLDER_PATTERNS = [
  /example\.com/i,
  /placeholder\.com/i,
  /your-api/i,
  /your-domain/i,
  /your-.*\.com/i,
  /jsonplaceholder\.typicode\.com/i,
  /localhost:\d+/,
  /127\.0\.0\.1/,
];

export default createRule({
  name: 'no-placeholder-url',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow placeholder URLs in production code' },
    schema: [],
    messages: {
      placeholderUrl:
        "检测到占位符 URL '{{url}}'。这可能是 AI 生成的示例地址，在生产环境中无法使用。请替换为真实 URL 或使用环境变量。",
    },
  },
  defaultOptions: [],
  create(context) {
    const filename = context.filename || '';
    if (/\.(test|spec|stories|story)\./i.test(filename)) return {};
    if (/__tests__|__mocks__|fixtures?|mocks?/i.test(filename)) return {};

    function checkString(value: string, node: TSESTree.Node) {
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (pattern.test(value)) {
          context.report({ node, messageId: 'placeholderUrl', data: { url: value } });
          return;
        }
      }
    }

    return {
      Literal(node: TSESTree.Literal) {
        if (typeof node.value !== 'string') return;
        checkString(node.value, node);
      },
      TemplateLiteral(node: TSESTree.TemplateLiteral) {
        for (const quasi of node.quasis) {
          if (quasi.value.raw) {
            checkString(quasi.value.raw, node);
          }
        }
      },
    };
  },
});
