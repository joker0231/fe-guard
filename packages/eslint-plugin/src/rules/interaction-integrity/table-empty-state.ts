import { createRule } from '../../utils/rule-helpers';
import { getJSXElementName, hasJSXAttribute, findJSXAttribute, getJSXAttributeValue } from '../../utils/jsx-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const TABLE_COMPONENTS = /^(Table|DataGrid|DataTable)$/;
const DATA_PROPS = ['dataSource', 'data', 'rows', 'items'];
const EMPTY_PROPS = ['emptyText', 'emptyContent', 'noDataComponent', 'empty'];

function getDataVarName(node: TSESTree.JSXOpeningElement): string | null {
  for (const prop of DATA_PROPS) {
    const attr = findJSXAttribute(node, prop);
    if (!attr) continue;
    const val = getJSXAttributeValue(attr);
    if (!val) continue;
    if (val.type === 'Identifier') return val.name;
    if (val.type === 'MemberExpression' && val.property.type === 'Identifier') return val.property.name;
  }
  return null;
}

function hasLengthCheckWrapper(node: TSESTree.Node, dataVar: string): boolean {
  let current: TSESTree.Node | undefined = node.parent;
  while (current) {
    if (current.type === 'ConditionalExpression' || current.type === 'LogicalExpression') {
      const src = extractText(current);
      if (src.includes(dataVar) && src.includes('length')) return true;
    }
    if (current.type === 'IfStatement') return true;
    if (current.type === 'FunctionDeclaration' || current.type === 'ArrowFunctionExpression' || current.type === 'FunctionExpression') break;
    current = current.parent;
  }
  return false;
}

function extractText(node: TSESTree.Node): string {
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') return extractText(node.object) + '.' + extractText(node.property);
  if (node.type === 'BinaryExpression') return extractText(node.left) + extractText(node.right);
  if (node.type === 'LogicalExpression') return extractText(node.left) + extractText(node.right);
  if (node.type === 'ConditionalExpression') return extractText(node.test);
  return '';
}

export default createRule({
  name: 'table-empty-state',
  meta: {
    type: 'problem',
    docs: { description: 'Require empty state handling for table components' },
    schema: [],
    messages: {
      missingEmpty: "<{{component}}> 使用动态数据源 '{{dataVar}}'，但缺少空状态展示。数据为空时用户将看到空白表格。请配置 locale.emptyText 或添加空态判断。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const name = getJSXElementName(node);
        if (!TABLE_COMPONENTS.test(name)) return;

        const dataVar = getDataVarName(node);
        if (!dataVar) return;

        if (hasJSXAttribute(node, 'locale')) return;
        if (EMPTY_PROPS.some((p) => hasJSXAttribute(node, p))) return;

        const jsxElement = node.parent;
        if (jsxElement && hasLengthCheckWrapper(jsxElement, dataVar)) return;

        context.report({ node, messageId: 'missingEmpty', data: { component: name, dataVar } });
      },
    };
  },
});
