import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/visual-integrity/image-adaptability';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('image-adaptability', rule, {
  valid: [
    // Fully responsive img
    {
      code: `<img src={url} style={{ objectFit: 'cover', maxWidth: '100%' }} />`,
    },
    // Image component with contain and width 100%
    {
      code: `<Image src={url} style={{ objectFit: 'contain', width: '100%' }} />`,
    },
    // Non-image element
    {
      code: `<div style={{ width: 300 }}>content</div>`,
    },
  ],
  invalid: [
    // No style at all
    {
      code: `<img src={url} />`,
      errors: [{ messageId: 'missingAdaptability', data: { element: 'img' } }],
    },
    // Has width/height attributes but no objectFit or maxWidth
    {
      code: `<img src={url} width={300} height={200} />`,
      errors: [{ messageId: 'missingAdaptability', data: { element: 'img' } }],
    },
    // Image component without responsive styles
    {
      code: `<Image src={url} alt="photo" />`,
      errors: [{ messageId: 'missingAdaptability', data: { element: 'Image' } }],
    },
  ],
});
