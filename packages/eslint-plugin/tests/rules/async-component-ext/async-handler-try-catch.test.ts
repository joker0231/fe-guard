import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/async-component-ext/async-handler-try-catch';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('async-handler-try-catch', rule, {
  valid: [
    // Async handler with all awaits inside try-catch
    {
      code: `
        <button onClick={async () => {
          try {
            await saveData();
          } catch (e) {
            handleError(e);
          }
        }}>Save</button>
      `,
    },
    // Synchronous handler — no problem
    {
      code: `<button onClick={() => doSync()}>Sync</button>`,
    },
    // Multiple awaits all inside try-catch
    {
      code: `
        <button onClick={async () => {
          try {
            await fetchData();
            await processData();
          } catch (e) {
            showError(e);
          }
        }}>Load</button>
      `,
    },
    // Async but no await — no problem
    {
      code: `
        <button onClick={async () => {
          console.log('async but no await');
        }}>OK</button>
      `,
    },
  ],
  invalid: [
    // Async with await but no try-catch
    {
      code: `
        <button onClick={async () => {
          await saveData();
          navigate('/success');
        }}>Save</button>
      `,
      errors: [{ messageId: 'missingTryCatch' }],
    },
    // Form submit with await but no try-catch
    {
      code: `
        <form onSubmit={async (e) => {
          e.preventDefault();
          await submitForm(data);
        }}>Submit</form>
      `,
      errors: [{ messageId: 'missingTryCatch' }],
    },
  ],
});
