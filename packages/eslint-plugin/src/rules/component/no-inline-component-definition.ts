import { createRule } from '../../utils/rule-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

type ComponentFn =
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression
  | TSESTree.ArrowFunctionExpression;

/** Check if a function body returns JSX */
function returnsJSX(node: ComponentFn): boolean {
  const { body } = node;

  // Arrow 直接返回 JSX: () => <div/>
  if (body.type === 'JSXElement' || body.type === 'JSXFragment') {
    return true;
  }

  if (body.type !== 'BlockStatement') return false;

  return body.body.some((stmt) => {
    if (stmt.type !== 'ReturnStatement' || !stmt.argument) return false;
    const arg = stmt.argument;
    return (
      arg.type === 'JSXElement' ||
      arg.type === 'JSXFragment' ||
      (arg.type === 'ConditionalExpression' &&
        (arg.consequent.type === 'JSXElement' ||
          arg.consequent.type === 'JSXFragment' ||
          arg.alternate.type === 'JSXElement' ||
          arg.alternate.type === 'JSXFragment'))
    );
  });
}

/** Get component name from function node */
function getFunctionName(node: ComponentFn): string | null {
  // function Foo() {}
  if (node.type === 'FunctionDeclaration' && node.id) {
    return node.id.name;
  }

  // const Foo = () => {} / const Foo = function() {}
  if (
    node.parent &&
    node.parent.type === 'VariableDeclarator' &&
    node.parent.id.type === 'Identifier'
  ) {
    return node.parent.id.name;
  }

  return null;
}

/** Check if name starts with uppercase (React component convention) */
function isComponentName(name: string): boolean {
  return /^[A-Z]/.test(name);
}

/** Find all nested function/arrow definitions within a block body */
function findNestedFunctions(block: TSESTree.BlockStatement): ComponentFn[] {
  const result: ComponentFn[] = [];

  function visit(node: TSESTree.Node | null | undefined): void {
    if (!node) return;

    // 跳过JSX内部（JSX中的箭头函数通常是事件handler）
    if (node.type === 'JSXElement' || node.type === 'JSXFragment') return;

    if (node.type === 'FunctionDeclaration') {
      result.push(node);
      // 不递归进入函数体（内部嵌套由其自己的遍历处理）
      return;
    }

    if (node.type === 'VariableDeclarator' && node.init) {
      if (
        node.init.type === 'ArrowFunctionExpression' ||
        node.init.type === 'FunctionExpression'
      ) {
        result.push(node.init);
        return;
      }
    }

    // 递归子节点
    for (const key in node) {
      if (key === 'parent' || key === 'loc' || key === 'range') continue;
      const child = (node as any)[key];
      if (Array.isArray(child)) {
        child.forEach((c) => visit(c));
      } else if (child && typeof child === 'object' && typeof child.type === 'string') {
        visit(child);
      }
    }
  }

  block.body.forEach((stmt) => visit(stmt));
  return result;
}

export default createRule({
  name: 'no-inline-component-definition',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow defining React components inside other components (causes remounts and state loss)',
    },
    schema: [],
    messages: {
      inlineComponent:
        '不能在组件 "{{parentName}}" 内部定义另一个组件 "{{childName}}"。\n' +
        '每次父组件render都会创建新的组件类，导致子组件state丢失、children重新挂载。\n' +
        '请将 "{{childName}}" 移到文件顶层。',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      ':function'(node: ComponentFn) {
        // 只处理有块级body的外层组件
        if (!node.body || node.body.type !== 'BlockStatement') return;

        const parentName = getFunctionName(node);
        if (!parentName || !isComponentName(parentName)) return;
        if (!returnsJSX(node)) return;

        // 在body中查找嵌套的组件定义
        const nested = findNestedFunctions(node.body);

        for (const inner of nested) {
          const childName = getFunctionName(inner);
          if (!childName || !isComponentName(childName)) continue;
          if (!returnsJSX(inner)) continue;

          context.report({
            node: inner,
            messageId: 'inlineComponent',
            data: { parentName, childName },
          });
        }
      },
    };
  },
});