import { createRule } from '../../utils/rule-helpers';
import { getJSXElementName, hasJSXAttribute } from '../../utils/jsx-helpers';
import type { TSESTree } from '@typescript-eslint/utils';

const FORM_ELEMENTS = new Set([
  'input', 'select', 'textarea', 'Input', 'Select', 'TextArea',
  'DatePicker', 'Checkbox', 'Radio', 'Switch', 'TimePicker',
  'InputNumber', 'AutoComplete',
]);

export default createRule({
  name: 'controlled-or-uncontrolled',
  meta: {
    type: 'problem',
    docs: { description: 'Disallow mixing controlled and uncontrolled form component modes' },
    schema: [],
    messages: {
      mixedMode: "<{{element}}> 同时使用了 '{{controlled}}' 和 '{{uncontrolled}}'，混合受控和非受控模式会导致不可预期的行为。请选择其中一种模式。",
      missingOnChange: "<{{element}}> 使用了受控属性 '{{prop}}' 但缺少 onChange 处理器。表单值将无法更新。请添加 onChange 或改用 defaultValue。",
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const name = getJSXElementName(node);
        if (!FORM_ELEMENTS.has(name)) return;

        const hasValue = hasJSXAttribute(node, 'value');
        const hasDefaultValue = hasJSXAttribute(node, 'defaultValue');
        const hasChecked = hasJSXAttribute(node, 'checked');
        const hasDefaultChecked = hasJSXAttribute(node, 'defaultChecked');
        const hasOnChange = hasJSXAttribute(node, 'onChange');
        const hasReadOnly = hasJSXAttribute(node, 'readOnly');
        const hasDisabled = hasJSXAttribute(node, 'disabled');

        if (hasValue && hasDefaultValue) {
          context.report({ node, messageId: 'mixedMode', data: { element: name, controlled: 'value', uncontrolled: 'defaultValue' } });
        }
        if (hasChecked && hasDefaultChecked) {
          context.report({ node, messageId: 'mixedMode', data: { element: name, controlled: 'checked', uncontrolled: 'defaultChecked' } });
        }
        if (hasValue && !hasOnChange && !hasReadOnly && !hasDisabled) {
          context.report({ node, messageId: 'missingOnChange', data: { element: name, prop: 'value' } });
        }
        if (hasChecked && !hasOnChange && !hasReadOnly && !hasDisabled) {
          context.report({ node, messageId: 'missingOnChange', data: { element: name, prop: 'checked' } });
        }
      },
    };
  },
});
