import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/visual-integrity/dynamic-content-overflow';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('dynamic-content-overflow', rule, {
  valid: [
    // Has overflowY handling
    {
      code: `<div style={{ height: 300, overflowY: 'auto' }}>{items.map(i => <div key={i.id}>{i.name}</div>)}</div>`,
    },
    // Auto height
    {
      code: `<div style={{ height: 'auto' }}>{items.map(i => <div key={i.id}>{i.name}</div>)}</div>`,
    },
    // Static content only
    {
      code: `<div style={{ height: 300 }}>Static content</div>`,
    },
    // Has overflow handling
    {
      code: `<div style={{ height: 300, overflow: 'auto' }}>{data}</div>`,
    },
  ],
  invalid: [
    {
      code: `<div style={{ height: 300 }}>{items.map(i => <div key={i.id}>{i.name}</div>)}</div>`,
      errors: [{ messageId: 'missingOverflow' }],
    },
    {
      code: `<div style={{ height: 500 }}>{dynamicContent}</div>`,
      errors: [{ messageId: 'missingOverflow' }],
    },
  ],
});
