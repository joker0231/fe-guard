import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/event-handler/no-empty-handler';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-empty-handler', rule, {
  valid: [
    // Handler with implementation
    { code: '<button onClick={() => doSomething()}>OK</button>' },
    { code: '<button onClick={handleClick}>OK</button>' },
    { code: '<input onChange={(e) => setValue(e.target.value)} />' },
    // Non-event props are fine
    { code: '<div className={() => {}}>test</div>' },
    // Arrow with expression body (not block)
    { code: '<button onClick={() => console.log("clicked")}>OK</button>' },
    // Function with body
    { code: '<button onClick={function() { doSomething(); }}>OK</button>' },
  ],
  invalid: [
    {
      code: '<button onClick={() => {}}>提交</button>',
      errors: [{ messageId: 'emptyHandler' }],
    },
    {
      code: '<input onChange={() => {}} />',
      errors: [{ messageId: 'emptyHandler' }],
    },
    {
      code: '<div onMouseEnter={function() {}}>hover</div>',
      errors: [{ messageId: 'emptyHandler' }],
    },
    {
      code: '<form onSubmit={() => {}}>form</form>',
      errors: [{ messageId: 'emptyHandler' }],
    },
  ],
});
