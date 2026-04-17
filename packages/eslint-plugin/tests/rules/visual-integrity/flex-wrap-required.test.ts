import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/visual-integrity/flex-wrap-required';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('flex-wrap-required', rule, {
  valid: [
    // Has flexWrap
    {
      code: `<div style={{ display: 'flex', flexWrap: 'wrap' }}>{tags.map(t => <Tag key={t}>{t}</Tag>)}</div>`,
    },
    // No .map() — static children
    {
      code: `<div style={{ display: 'flex' }}><span>Static</span></div>`,
    },
    // Not flex display
    {
      code: `<div style={{ display: 'block' }}>{items.map(i => <div key={i}>{i}</div>)}</div>`,
    },
    // No display property at all
    {
      code: `<div style={{ gap: 8 }}>{items.map(i => <div key={i}>{i}</div>)}</div>`,
    },
  ],
  invalid: [
    {
      code: `<div style={{ display: 'flex' }}>{tags.map(t => <Tag key={t}>{t}</Tag>)}</div>`,
      errors: [{ messageId: 'missingFlexWrap' }],
    },
    {
      code: `<div style={{ display: 'flex', gap: 8 }}>{items.map(i => <span key={i}>{i}</span>)}</div>`,
      errors: [{ messageId: 'missingFlexWrap' }],
    },
    // Chained .filter().map() should also be detected
    {
      code: `<div style={{ display: 'flex' }}>{items.filter(x => x.active).map(i => <span key={i.id}>{i.name}</span>)}</div>`,
      errors: [{ messageId: 'missingFlexWrap' }],
    },
  ],
});
