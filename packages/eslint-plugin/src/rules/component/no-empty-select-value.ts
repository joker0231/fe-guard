import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/joker0231/fe-guard/blob/main/docs/rules/${name}.md`
);

/**
 * 检测选择类组件的 value prop 为空字符串、缺失或 fallback 到空字符串
 *
 * 覆盖范围：
 * - 成员表达式：*.Item / *.Option（对象名包含 Select/Listbox/Combobox/Radio/Tab/Toggle/Primitive）
 * - 标识符：SelectItem/RadioItem/TabsTrigger 等（名字匹配选择类组件模式）
 *
 * 检测模式：
 * 1. value="" / value={""} / value={``} — 字面量空字符串
 * 2. 缺少 value prop
 * 3. value={x ?? ''} / value={x || ''} — fallback 到空字符串的不安全模式
 */

// 对象名关键词（包含任一即匹配）
const OBJECT_KEYWORDS = [
  'Select', 'Listbox', 'Combobox', 'Radio', 'Tab', 'Toggle', 'Primitive',
];

// 属性名白名单（只有这些属性名会被检测）
// Trigger 只在 Tab 相关组件中需要 value，在 Select/Radio 中 Trigger 是打开按钮不需要 value
const ITEM_PROPERTY_NAMES = new Set(['Item', 'Option']);
const TRIGGER_PROPERTY_NAME = 'Trigger';

// 标识符匹配正则：选择类组件 + Item/Option/Trigger 后缀
const IDENTIFIER_PATTERN = /^(?:.*(?:Select|Listbox|Combobox|Radio|Tab|Toggle).*(?:Item|Option|Trigger))$/;

// 额外的精确标识符匹配（常见命名）
const EXTRA_IDENTIFIERS = new Set([
  'SelectItem',
  'SelectOption',
  'ListboxOption',
  'ComboboxOption',
  'RadioItem',
  'RadioGroupItem',
  'TabsTrigger',
  'TabTrigger',
  'ToggleGroupItem',
]);

type MessageIds = 'emptyValue' | 'missingValue' | 'emptyFallback';

export default createRule<[], MessageIds>({
  name: 'no-empty-select-value',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow empty string value on selection component items',
    },
    messages: {
      emptyValue:
        'Select/Radio/Tab 等选择组件的 value 不能为空字符串。使用 placeholder 属性或提供有意义的值。',
      missingValue:
        '选择组件的 item 必须有 value prop。',
      emptyFallback:
        'value 中使用了 ?? "" �� || "" fallback 到空字符串，这会导致运行时错误。请在数据源过滤无效选项或提供有意义的默认值。',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    function isTargetElement(node: TSESTree.JSXOpeningElement): boolean {
      const { name } = node;

      // 成员表达式：*.Item / *.Option（任何选择类对象）
      if (
        name.type === 'JSXMemberExpression' &&
        name.property.type === 'JSXIdentifier'
      ) {
        const propName = name.property.name;
        const objectName = getObjectName(name.object);

        if (objectName && OBJECT_KEYWORDS.some((kw) => objectName.includes(kw))) {
          // Item/Option: 任何选择类组件都需要 value
          if (ITEM_PROPERTY_NAMES.has(propName)) return true;
          // Trigger: 只在 Tab 相关组件中需要 value
          if (propName === TRIGGER_PROPERTY_NAME && objectName.includes('Tab')) return true;
        }
      }

      // 标识符：SelectItem 等
      if (name.type === 'JSXIdentifier') {
        if (EXTRA_IDENTIFIERS.has(name.name)) return true;
        if (IDENTIFIER_PATTERN.test(name.name)) return true;
      }

      return false;
    }

    function getObjectName(node: TSESTree.JSXTagNameExpression): string | null {
      if (node.type === 'JSXIdentifier') {
        return node.name;
      }
      // 嵌套成员表达式：a.b.Item → 取 "a.b"
      if (node.type === 'JSXMemberExpression') {
        const obj = getObjectName(node.object);
        if (obj && node.property.type === 'JSXIdentifier') {
          return `${obj}.${node.property.name}`;
        }
      }
      return null;
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

    function isEmptyFallbackPattern(
      value: TSESTree.JSXAttribute['value']
    ): boolean {
      if (!value || value.type !== 'JSXExpressionContainer') return false;

      const expr = value.expression;

      // value={x ?? ''} or value={x || ''}
      if (
        expr.type === 'LogicalExpression' &&
        (expr.operator === '??' || expr.operator === '||')
      ) {
        return isEmptyLiteralNode(expr.right);
      }

      // value={x ? '' : y} or value={x ? y : ''}
      if (expr.type === 'ConditionalExpression') {
        return isEmptyLiteralNode(expr.consequent) || isEmptyLiteralNode(expr.alternate);
      }

      return false;
    }

    function isEmptyLiteralNode(node: TSESTree.Expression | TSESTree.PrivateIdentifier): boolean {
      // ''
      if (node.type === 'Literal' && node.value === '') return true;

      // `` (空模板字面量)
      if (
        node.type === 'TemplateLiteral' &&
        node.quasis.length === 1 &&
        node.expressions.length === 0 &&
        node.quasis[0].value.raw === ''
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
          return;
        }

        if (isEmptyFallbackPattern(valueProp.value)) {
          context.report({
            node: valueProp,
            messageId: 'emptyFallback',
          });
        }
      },
    };
  },
});