import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/visual-integrity/no-hardcoded-pixel-width';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-hardcoded-pixel-width', rule, {
  valid: [
    // Percentage width
    { code: '<div style={{ width: \'100%\' }}>content</div>' },
    // Under threshold
    { code: '<div style={{ width: 200 }}>content</div>' },
    // Exactly 400 (not exceeding)
    { code: '<div style={{ width: 400 }}>content</div>' },
    // No inline style
    { code: '<div className="container">content</div>' },
    // Auto width
    { code: '<div style={{ width: \'auto\' }}>content</div>' },
  ],
  invalid: [
    {
      code: '<div style={{ width: 1200 }}>content</div>',
      errors: [{
        messageId: 'hardcodedWidth' as const,
        data: { value: '1200' },
      }],
    },
    {
      code: '<div style={{ width: \'800px\' }}>content</div>',
      errors: [{ messageId: 'hardcodedWidth' as const }],
    },
    {
      code: '<div style={{ minWidth: 500 }}>content</div>',
      errors: [{
        messageId: 'hardcodedWidth' as const,
        data: { value: '500' },
      }],
    },
    {
      code: '<div style={{ maxWidth: 600 }}>content</div>',
      errors: [{ messageId: 'hardcodedWidth' as const }],
    },
  ],
});
