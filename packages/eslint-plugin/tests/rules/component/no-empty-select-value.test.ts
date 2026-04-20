import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/component/no-empty-select-value';

const tester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

tester.run('no-empty-select-value', rule, {
  valid: [
    // 正常 value
    { code: '<Select.Item value="option1">Option 1</Select.Item>' },
    { code: '<SelectItem value="option1">Option 1</SelectItem>' },
    // 动态 value（无法静态检测，不报）
    { code: '<Select.Item value={item.id}>{item.name}</Select.Item>' },
    // 非目标组件
    { code: '<Input value="" />' },
    { code: '<div value="" />' },
    // 其他匹配组件有值
    { code: '<Select.Option value="a">A</Select.Option>' },
    { code: '<Listbox.Option value="b">B</Listbox.Option>' },
    { code: '<ComboboxOption value="c">C</ComboboxOption>' },
  ],
  invalid: [
    // value=""
    {
      code: '<Select.Item value="">请选择</Select.Item>',
      errors: [{ messageId: 'emptyValue' }],
    },
    // value={""}
    {
      code: '<Select.Item value={""}>请选择</Select.Item>',
      errors: [{ messageId: 'emptyValue' }],
    },
    // value={``} 空模板字面量
    {
      code: '<Select.Item value={``}>请选择</Select.Item>',
      errors: [{ messageId: 'emptyValue' }],
    },
    // SelectItem 空 value
    {
      code: '<SelectItem value="">请选择</SelectItem>',
      errors: [{ messageId: 'emptyValue' }],
    },
    // 缺少 value prop
    {
      code: '<Select.Item>无 value</Select.Item>',
      errors: [{ messageId: 'missingValue' }],
    },
    // SelectItem 缺少 value
    {
      code: '<SelectItem>无 value</SelectItem>',
      errors: [{ messageId: 'missingValue' }],
    },
    // Select.Option 空 value
    {
      code: '<Select.Option value="">空</Select.Option>',
      errors: [{ messageId: 'emptyValue' }],
    },
    // Listbox.Option 空 value
    {
      code: '<Listbox.Option value="">空</Listbox.Option>',
      errors: [{ messageId: 'emptyValue' }],
    },
  ],
});