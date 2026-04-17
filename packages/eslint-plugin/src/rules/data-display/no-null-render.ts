import { createRule } from '../../utils/rule-helpers';
import { isSpecificDataDisplayField } from '../../utils/react-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const SAFE_PROPS = new Set(['length', 'id', 'key', 'className', 'style', 'children', 'type', 'ref']);
const SAFE_OBJECTS = new Set(['Math', 'console', 'window', 'document', 'JSON', 'Object', 'Array', 'Number', 'String']);

export default createRule({
  name: 'no-null-render',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow rendering object properties without null handling' },
    schema: [],
    messages: {
      nullRender: "'{{expression}}' 直接渲染可能输出 \"null\" 或 \"undefined\"。请添加空值处理：{{expression}} ?? '默认值' 或 {{expression}} || '-'。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      'JSXExpressionContainer > MemberExpression'(node: TSESTree.MemberExpression) {
        if (node.computed) return;
        if (node.property.type !== 'Identifier') return;
        if (SAFE_PROPS.has(node.property.name)) return;
        if (node.object.type === 'Identifier' && SAFE_OBJECTS.has(node.object.name)) return;
        // Skip fields already covered by more specific data-display rules
        if (isSpecificDataDisplayField(node.property.name)) return;
        // Walk up chain to find root object (e.g., this.props.name → this)
        let root: TSESTree.Node = node.object;
        while (root.type === 'MemberExpression') root = root.object;
        if (root.type === 'ThisExpression') return;
        // Skip non-optional MemberExpression directly in JSXElement children —
        // already covered by no-undefined-render which suggests ?.  + ??
        const container = node.parent;
        if (
          !node.optional &&
          container?.type === 'JSXExpressionContainer' &&
          (container.parent?.type === 'JSXElement' || container.parent?.type === 'JSXFragment')
        ) return;

        const expression = context.sourceCode.getText(node);
        context.report({ node, messageId: 'nullRender', data: { expression } });
      },
    };
  },
});
