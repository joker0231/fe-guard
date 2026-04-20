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
    // 非目标组件（不包含选择类关键词）
    { code: '<Input value="" />' },
    { code: '<div value="" />' },
    { code: '<FormItem value="" />' },
    // 其他匹配组件有值
    { code: '<Select.Option value="a">A</Select.Option>' },
    { code: '<Listbox.Option value="b">B</Listbox.Option>' },
    { code: '<ComboboxOption value="c">C</ComboboxOption>' },
    // Primitive 命名有值
    { code: '<SelectPrimitive.Item value="valid">OK</SelectPrimitive.Item>' },
    { code: '<RadioPrimitive.Item value="yes">Yes</RadioPrimitive.Item>' },
    // fallback 到非空字符串（合法）
    { code: '<Select.Item value={item.id ?? "default"}>OK</Select.Item>' },
    { code: '<SelectPrimitive.Item value={item.id || "fallback"}>OK</SelectPrimitive.Item>' },
    // RadioGroupItem 有值
    { code: '<RadioGroupItem value="option-a" />' },
    // TabsTrigger 有值
    { code: '<TabsTrigger value="tab1">Tab 1</TabsTrigger>' },
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
    // === 新增：Primitive 命名 ===
    // SelectPrimitive.Item 空 value
    {
      code: '<SelectPrimitive.Item value="">Empty</SelectPrimitive.Item>',
      errors: [{ messageId: 'emptyValue' }],
    },
    // SelectPrimitive.Item 缺少 value
    {
      code: '<SelectPrimitive.Item>No value</SelectPrimitive.Item>',
      errors: [{ messageId: 'missingValue' }],
    },
    // RadioPrimitive.Item 空 value
    {
      code: '<RadioPrimitive.Item value="">Empty</RadioPrimitive.Item>',
      errors: [{ messageId: 'emptyValue' }],
    },
    // === 新增：fallback 空字符串 ===
    // value={x ?? ''}
    {
      code: '<Select.Item value={item.id ?? ""}>Fallback</Select.Item>',
      errors: [{ messageId: 'emptyFallback' }],
    },
    // value={x || ''}
    {
      code: '<SelectPrimitive.Item value={opt.value || ""}>Fallback</SelectPrimitive.Item>',
      errors: [{ messageId: 'emptyFallback' }],
    },
    // value={x ?? ``} 空模板字面量 fallback
    {
      code: '<Select.Item value={item.id ?? ``}>Fallback</Select.Item>',
      errors: [{ messageId: 'emptyFallback' }],
    },
    // 三元表达式 fallback 到空字符串
    {
      code: '<SelectPrimitive.Item value={valid ? id : ""}>Ternary</SelectPrimitive.Item>',
      errors: [{ messageId: 'emptyFallback' }],
    },
    // === 新增：标识符组件 ===
    // RadioGroupItem 空 value
    {
      code: '<RadioGroupItem value="" />',
      errors: [{ messageId: 'emptyValue' }],
    },
    // TabsTrigger 空 value
    {
      code: '<TabsTrigger value="">Tab</TabsTrigger>',
      errors: [{ messageId: 'emptyValue' }],
    },
    // RadioItem 缺少 value
    {
      code: '<RadioItem>No value</RadioItem>',
      errors: [{ messageId: 'missingValue' }],
    },
    // ToggleGroupItem fallback
    {
      code: '<ToggleGroupItem value={x ?? ""}>Toggle</ToggleGroupItem>',
      errors: [{ messageId: 'emptyFallback' }],
    },
  ],
});