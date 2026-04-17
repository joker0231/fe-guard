import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/side-effects/require-cleanup-bindings';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-cleanup-bindings', rule, {
  valid: [
    // setInterval with clearInterval cleanup
    {
      code: `
        useEffect(() => {
          const id = setInterval(() => tick(), 1000);
          return () => clearInterval(id);
        }, []);
      `,
    },
    // addEventListener with removeEventListener cleanup
    {
      code: `
        useEffect(() => {
          const handler = () => {};
          window.addEventListener('resize', handler);
          return () => window.removeEventListener('resize', handler);
        }, []);
      `,
    },
    // .subscribe() with .unsubscribe() cleanup
    {
      code: `
        useEffect(() => {
          const sub = observable.subscribe(handler);
          return () => sub.unsubscribe();
        }, []);
      `,
    },
    // Non-useEffect code with setTimeout (rule does not apply)
    {
      code: `
        function doStuff() {
          setTimeout(() => console.log('done'), 100);
        }
      `,
    },
    // setTimeout with clearTimeout cleanup
    {
      code: `
        useEffect(() => {
          const timer = setTimeout(() => setDone(true), 1000);
          return () => clearTimeout(timer);
        }, []);
      `,
    },
  ],
  invalid: [
    // setInterval without any cleanup return
    {
      code: `
        useEffect(() => {
          const id = setInterval(() => tick(), 1000);
        }, []);
      `,
      errors: [{ messageId: 'missingCleanup' }],
    },
    // addEventListener without removeEventListener in cleanup
    {
      code: `
        useEffect(() => {
          window.addEventListener('resize', handler);
          return () => {};
        }, []);
      `,
      errors: [{ messageId: 'missingCleanup' }],
    },
    // Both setInterval and addEventListener, only clearing the interval
    {
      code: `
        useEffect(() => {
          const id = setInterval(() => tick(), 1000);
          window.addEventListener('scroll', handler);
          return () => clearInterval(id);
        }, []);
      `,
      errors: [{ messageId: 'missingCleanup' }],
    },
    // .on() without .off() cleanup
    {
      code: `
        useEffect(() => {
          emitter.on('event', handler);
        }, []);
      `,
      errors: [{ messageId: 'missingCleanup' }],
    },
  ],
});
