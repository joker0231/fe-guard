import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/dark-mode/no-hardcoded-color';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-hardcoded-color', rule, {
  valid: [
    // CSS variable
    { code: `<div style={{ color: 'var(--text-primary)' }}>text</div>` },
    { code: `<div style={{ backgroundColor: 'var(--bg-primary)' }}>text</div>` },
    // Theme token
    { code: `<div style={{ color: theme.colors.text }}>text</div>` },
    // No color property
    { code: `<div style={{ width: 100, height: 200 }}>text</div>` },
    // Non-style attribute
    { code: `<div className="text-red-500">text</div>` },
    // Dynamic values
    { code: `<div style={{ color: currentColor }}>text</div>` },
    // Transparent/inherit
    { code: `<div style={{ color: 'transparent' }}>text</div>` },
    { code: `<div style={{ color: 'inherit' }}>text</div>` },
  ],
  invalid: [
    {
      code: `<div style={{ color: '#333' }}>text</div>`,
      errors: [{ messageId: 'hardcodedColor' }],
    },
    {
      code: `<div style={{ backgroundColor: 'white' }}>text</div>`,
      errors: [{ messageId: 'hardcodedColor' }],
    },
    {
      code: `<div style={{ color: '#333', backgroundColor: '#fff' }}>text</div>`,
      errors: [{ messageId: 'hardcodedColor' }, { messageId: 'hardcodedColor' }],
    },
    {
      code: `<span style={{ color: 'rgb(0, 0, 0)' }}>text</span>`,
      errors: [{ messageId: 'hardcodedColor' }],
    },
    {
      code: `<div style={{ borderColor: 'red' }}>text</div>`,
      errors: [{ messageId: 'hardcodedColor' }],
    },
    {
      code: `<div style={{ color: '#1a2b3c' }}>text</div>`,
      errors: [{ messageId: 'hardcodedColor' }],
    },
  ],
});
