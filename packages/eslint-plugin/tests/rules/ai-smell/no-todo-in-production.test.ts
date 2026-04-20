import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/ai-smell/no-todo-in-production';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-todo-in-production', rule, {
  valid: [
    // Normal comment
    {
      code: `// This is a normal comment`,
    },
    // Regular block comment
    {
      code: `/* Regular block comment */`,
    },
    // "Done" is not a flagged keyword
    {
      code: `// Done: implemented the feature`,
    },
    // Test files should be skipped
    {
      code: `// TODO: implement this`,
      filename: 'src/utils/api.test.ts',
    },
  ],
  invalid: [
    // TODO comment
    {
      code: `// TODO: implement this`,
      errors: [{ messageId: 'todoComment' }],
    },
    // FIXME comment
    {
      code: `/* FIXME: broken logic */`,
      errors: [{ messageId: 'todoComment' }],
    },
    // HACK comment
    {
      code: `// HACK: temporary workaround`,
      errors: [{ messageId: 'todoComment' }],
    },
    // Deferred promise - "will implement later"
    {
      code: `// Will implement later when API is ready`,
      errors: [{ messageId: 'deferredPromise' }],
    },
    // Deferred promise - "implement later"
    {
      code: `/* implement later after refactor */`,
      errors: [{ messageId: 'deferredPromise' }],
    },
    // Deferred promise - "fix later"
    {
      code: `// fix later when we have time`,
      errors: [{ messageId: 'deferredPromise' }],
    },
    // Deferred promise - "skip for now"
    {
      code: `// skip for now, not critical`,
      errors: [{ messageId: 'deferredPromise' }],
    },
    // Deferred promise - "not implemented"
    {
      code: `// not implemented yet`,
      errors: [{ messageId: 'deferredPromise' }],
    },
    // Deferred promise - "come back to this"
    {
      code: `// come back to this after launch`,
      errors: [{ messageId: 'deferredPromise' }],
    },
  ],
});
