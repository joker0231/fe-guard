import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/visual-integrity/text-overflow-handling';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('text-overflow-handling', rule, {
  valid: [
    // Has overflow handling
    {
      code: `<div style={{ width: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>`,
    },
    // Percentage width — not fixed
    {
      code: `<div style={{ width: '100%' }}>{user.name}</div>`,
    },
    // Static text only
    {
      code: `<div style={{ width: 200 }}>Static text</div>`,
    },
    // Auto width
    {
      code: `<div style={{ width: 'auto' }}>{user.name}</div>`,
    },
  ],
  invalid: [
    {
      code: `<div style={{ width: 200 }}>{user.biography}</div>`,
      errors: [{ messageId: 'missingOverflow' }],
    },
    {
      code: `<span style={{ maxWidth: 150 }}>{item.title}</span>`,
      errors: [{ messageId: 'missingOverflow' }],
    },
  ],
});
