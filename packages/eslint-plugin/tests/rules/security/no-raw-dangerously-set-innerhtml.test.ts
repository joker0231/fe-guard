import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/security/no-raw-dangerously-set-innerhtml';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-raw-dangerously-set-innerhtml', rule, {
  valid: [
    // DOMPurify.sanitize is safe
    {
      code: `<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />`,
    },
    // sanitizeHtml is safe
    {
      code: `<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />`,
    },
    // Static string literal is safe
    {
      code: `<div dangerouslySetInnerHTML={{ __html: '<b>static</b>' }} />`,
    },
    // Template literal with no expressions is safe
    {
      code: `<div dangerouslySetInnerHTML={{ __html: \`<b>static</b>\` }} />`,
    },
  ],
  invalid: [
    // Raw variable is unsafe
    {
      code: `<div dangerouslySetInnerHTML={{ __html: userInput }} />`,
      errors: [{ messageId: 'unsanitized' }],
    },
    // Member expression is unsafe
    {
      code: `<div dangerouslySetInnerHTML={{ __html: data.content }} />`,
      errors: [{ messageId: 'unsanitized' }],
    },
    // Unknown sanitize() function is NOT trusted
    {
      code: `<div dangerouslySetInnerHTML={{ __html: sanitize(content) }} />`,
      errors: [{ messageId: 'unsanitized' }],
    },
  ],
});
