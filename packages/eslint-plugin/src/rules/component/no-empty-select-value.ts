import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/joker0231/fe-guard/blob/main/docs/rules/${name}.md`
);

/**
 * 检测 Select.Item / SelectItem 的 value prop 为空字符串或缺失
 *
 * Radix UI 的 Select.Item 要求 value 不能为空字符串。
 * AI 常犯错误：用空 value 的 Item 做"请选择..."占位，
 * 正确方式是使用 Select 的 placeholder 属性。
 */

// 匹配的组件名（成员表达式和标识符两种形式）
const MEMBER_PATTERNS: Array<{ object: string; property: string }> = [
  { object: 'Select', property: 'Item' },
  { object: 'Select', property: 'Option' },
  { object: 'Listbox', property: 'Option' },
  { object: 'Combobox', property: 'Option' },
];

const IDENTIFIER_PATTERNS = new Set([
  'SelectItem',
  'SelectOption',
  'ListboxOption',
  'ComboboxOption',
]);

type MessageIds = 'emptyValue' | 'missingValue';

export default createRule<[], MessageIds>({
  name: 'no-empty-select-value',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow empty string value on Select items',
    },
    messages: {
      emptyValue:
        'Select item 的 value 不能为空字符串。使用 Select 的 placeholder 属性代替空 value 的占位项。',
      missingValue:
        'Select item 必须有 value prop。',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function isTargetElement(node: TSESTree.JSXOpeningElement): boolean {
      const { name } = node;

      // 成员表达式：Select.Item
      if (
        name.type === 'JSXMemberExpression' &&
        name.object.type === 'JSXIdentifier' &&
        name.property.type === 'JSXIdentifier'
      ) {
        return MEMBER_PATTERNS.some(
          (p) =>
            (name.object as TSESTree.JSXIdentifier).name === p.object &&
            name.property.name === p.property
        );
      }

      // 标识符：SelectItem
      if (name.type === 'JSXIdentifier') {
        return IDENTIFIER_PATTERNS.has(name.name);
      }

      return false;
    }

    function getValueProp(
      node: TSESTree.JSXOpeningElement
    ): TSESTree.JSXAttribute | null {
      for (const attr of node.attributes) {
        if (
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'value'
        ) {
          return attr;
        }
      }
      return null;
    }

    function isEmptyStringLiteral(
      value: TSESTree.JSXAttribute['value']
    ): boolean {
      if (!value) return false;

      // value=""
      if (value.type === 'Literal' && value.value === '') {
        return true;
      }

      // value={""}
      if (
        value.type === 'JSXExpressionContainer' &&
        value.expression.type === 'Literal' &&
        value.expression.value === ''
      ) {
        return true;
      }

      // value={``} (空模板字面量)
      if (
        value.type === 'JSXExpressionContainer' &&
        value.expression.type === 'TemplateLiteral' &&
        value.expression.quasis.length === 1 &&
        value.expression.expressions.length === 0 &&
        value.expression.quasis[0].value.raw === ''
      ) {
        return true;
      }

      return false;
    }

    return {
      JSXOpeningElement(node) {
        if (!isTargetElement(node)) return;

        const valueProp = getValueProp(node);

        if (!valueProp) {
          // 缺少 value prop
          context.report({
            node,
            messageId: 'missingValue',
          });
          return;
        }

        if (isEmptyStringLiteral(valueProp.value)) {
          context.report({
            node: valueProp,
            messageId: 'emptyValue',
          });
        }
      },
    };
  },
});