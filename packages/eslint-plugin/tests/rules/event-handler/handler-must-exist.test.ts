import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/event-handler/handler-must-exist';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('handler-must-exist', rule, {
  valid: [
    // Handler defined in scope
    {
      code: `
        const handleClick = () => {};
        <button onClick={handleClick}>OK</button>
      `,
    },
    // Inline arrow function (not an identifier reference)
    { code: '<button onClick={() => {}}>OK</button>' },
    // Member expression (not a bare identifier)
    { code: '<button onClick={props.onClick}>OK</button>' },
    // Function expression
    { code: '<button onClick={function() {}}>OK</button>' },
    // Parameter in scope
    {
      code: `
        function Comp({ onSubmit }) {
          return <button onClick={onSubmit}>OK</button>;
        }
      `,
    },
  ],
  invalid: [
    {
      code: '<button onClick={handleSubmit}>提交</button>',
      errors: [{ messageId: 'handlerNotFound', data: { handlerName: 'handleSubmit' } }],
    },
    {
      code: '<input onChange={onInputChange} />',
      errors: [{ messageId: 'handlerNotFound', data: { handlerName: 'onInputChange' } }],
    },
  ],
});
