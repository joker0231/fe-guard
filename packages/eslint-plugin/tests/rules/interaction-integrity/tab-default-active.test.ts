import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/interaction-integrity/tab-default-active';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('tab-default-active', rule, {
  valid: [
    // Tabs with defaultActiveKey
    {
      code: '<Tabs defaultActiveKey="basic"><TabPane tab="Info" key="basic" /></Tabs>',
    },
    // Tabs with controlled activeKey
    {
      code: '<Tabs activeKey={current} onChange={setCurrent}><TabPane tab="Info" key="basic" /></Tabs>',
    },
    // Collapse with defaultValue
    {
      code: `<Collapse defaultValue={['1']}><Panel key="1" /></Collapse>`,
    },
  ],
  invalid: [
    // Tabs without default or controlled prop
    {
      code: '<Tabs><TabPane tab="Info" key="basic" /><TabPane tab="Security" key="security" /></Tabs>',
      errors: [{ messageId: 'missingDefault' }],
    },
    // Accordion without default or controlled prop
    {
      code: '<Accordion><AccordionItem /></Accordion>',
      errors: [{ messageId: 'missingDefault' }],
    },
  ],
});
