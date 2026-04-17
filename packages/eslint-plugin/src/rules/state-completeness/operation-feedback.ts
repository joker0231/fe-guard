import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const FEEDBACK_PATTERNS = /^(message|toast|notification|alert|Message|Toast|Notification)\b/;
const LOADING_PATTERNS = /^set.*(Loading|Submitting|Deleting|Pending)/;
const NAVIGATE_PATTERNS = /^(navigate|router|history)\b/;

function hasFeedback(body: TSESTree.Node): boolean {
  let found = false;
  walkNode(body, (n) => {
    if (found) return;
    if (n.type === 'CallExpression') {
      const name = getCallExprName(n);
      if (name && (FEEDBACK_PATTERNS.test(name) || NAVIGATE_PATTERNS.test(name))) {
        found = true;
      }
    }
  });
  return found;
}

function hasLoadingSetter(body: TSESTree.Node): boolean {
  let found = false;
  walkNode(body, (n) => {
    if (found) return;
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && LOADING_PATTERNS.test(n.callee.name)) {
      found = true;
    }
  });
  return found;
}

function hasAwaitOrThen(body: TSESTree.Node): boolean {
  let found = false;
  walkNode(body, (n) => {
    if (found) return;
    if (n.type === 'AwaitExpression') found = true;
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' &&
        n.callee.property.type === 'Identifier' && n.callee.property.name === 'then') found = true;
  });
  return found;
}

function getCallExprName(node: TSESTree.CallExpression): string | null {
  if (node.callee.type === 'Identifier') return node.callee.name;
  if (node.callee.type === 'MemberExpression') {
    const obj = node.callee.object;
    const prop = node.callee.property;
    if (obj.type === 'Identifier' && prop.type === 'Identifier') return `${obj.name}.${prop.name}`;
  }
  return null;
}

function walkNode(node: TSESTree.Node, cb: (n: TSESTree.Node) => void) {
  cb(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    if (child && typeof child === 'object') {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === 'object' && 'type' in item) {
            const t = (item as TSESTree.Node).type;
            if (t === 'ArrowFunctionExpression' || t === 'FunctionExpression' || t === 'FunctionDeclaration') continue;
            walkNode(item as TSESTree.Node, cb);
          }
        }
      } else if ('type' in child) {
        const t = (child as TSESTree.Node).type;
        if (t === 'ArrowFunctionExpression' || t === 'FunctionExpression' || t === 'FunctionDeclaration') return;
        walkNode(child as TSESTree.Node, cb);
      }
    }
  }
}

const DELETE_CALL_PATTERN = /delete|remove|destroy/i;
const DELETE_TEXT_PATTERN = /删除|移除|delete|remove/i;
const CONFIRM_PATTERN = /^(confirm|Modal\.confirm|Dialog\.confirm)$/;

function isDeleteContext(jsxAttr: TSESTree.JSXAttribute, body: TSESTree.Node, context: { sourceCode: { getText(node: TSESTree.Node): string } }): boolean {
  // Check if handler body contains delete-like call
  let hasDeleteCall = false;
  walkNode(body, (n) => {
    if (hasDeleteCall) return;
    if (n.type === 'CallExpression') {
      const name = getCallExprName(n);
      if (name && DELETE_CALL_PATTERN.test(name)) hasDeleteCall = true;
    }
  });
  if (hasDeleteCall) return true;
  // Check button text content
  const parent = jsxAttr.parent;
  if (parent && parent.type === 'JSXOpeningElement' && parent.parent && parent.parent.type === 'JSXElement') {
    const text = context.sourceCode.getText(parent.parent);
    if (DELETE_TEXT_PATTERN.test(text)) return true;
  }
  return false;
}

function hasConfirmDialog(body: TSESTree.Node): boolean {
  let found = false;
  walkNode(body, (n) => {
    if (found) return;
    if (n.type === 'CallExpression') {
      const name = getCallExprName(n);
      if (name && CONFIRM_PATTERN.test(name)) found = true;
    }
  });
  return found;
}

export default createRule({
  name: 'operation-feedback',
  meta: {
    type: 'problem',
    docs: { description: 'Require user feedback for async operations in event handlers' },
    schema: [],
    messages: {
      missingFeedback: '异步操作缺少用户反馈。请添加 loading 状态指示和操作成功/失败提示（如 message.success/error）。',
      deleteWithoutConfirm: '删除操作缺少确认弹窗。请在执行删除前添加 confirm() 或 Modal.confirm() 确认。',
    },
  },
  defaultOptions: [],
  create(context) {
    function resolveHandlerBody(expr: TSESTree.Node): TSESTree.Node | null {
      if (expr.type === 'ArrowFunctionExpression' || expr.type === 'FunctionExpression') {
        return expr.body;
      }
      if (expr.type === 'Identifier') {
        const scope = context.sourceCode.getScope(expr);
        let current: typeof scope | null = scope;
        while (current) {
          const v = current.variables.find((va: { name: string }) => va.name === expr.name);
          if (v) {
            for (const def of v.defs) {
              const dn = def.node as TSESTree.Node;
              if (dn.type === 'VariableDeclarator' && (dn as TSESTree.VariableDeclarator).init) {
                const init = (dn as TSESTree.VariableDeclarator).init!;
                if (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') {
                  return init.body;
                }
              }
              if (dn.type === 'FunctionDeclaration' && (dn as TSESTree.FunctionDeclaration).body) {
                return (dn as TSESTree.FunctionDeclaration).body;
              }
            }
            break;
          }
          current = current.upper;
        }
      }
      return null;
    }

    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier') return;
        const handlerName = node.name.name;
        if (handlerName !== 'onClick' && handlerName !== 'onSubmit') return;

        if (!node.value || node.value.type !== 'JSXExpressionContainer') return;
        const expr = node.value.expression;
        if (expr.type === 'JSXEmptyExpression') return;

        const body = resolveHandlerBody(expr);
        if (!body) return;

        if (!hasAwaitOrThen(body)) return;

        // Check for delete operation without confirmation (before feedback check for error ordering)
        if (isDeleteContext(node, body, context)) {
          if (!hasConfirmDialog(body)) {
            context.report({ node, messageId: 'deleteWithoutConfirm' });
          }
        }

        if (!hasFeedback(body) || !hasLoadingSetter(body)) {
          context.report({ node, messageId: 'missingFeedback' });
        }
      },
    };
  },
});
