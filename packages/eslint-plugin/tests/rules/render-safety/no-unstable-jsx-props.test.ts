import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/render-safety/no-unstable-jsx-props';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-unstable-jsx-props', rule, {
  valid: [
    // Variable reference (stable)
    { code: '<Component style={styles} />' },
    // Constant reference
    { code: '<Component options={OPTIONS} />' },
    // Callback reference
    { code: '<Component onChange={handleChange} />' },
    // key prop is allowed inline
    { code: '<Component key={`item-${id}`} />' },
    // ref prop is allowed inline
    { code: '<Component ref={(el) => { nodeRef.current = el }} />' },
    // style on native div is allowed
    { code: '<div style={{ color: "red" }} />' },
    // String/number/boolean literals are fine
    { code: '<Component name="hello" />' },
    { code: '<Component count={42} />' },
    { code: '<Component active={true} />' },
    // Ternary expression (not inline literal)
    { code: '<Component value={isActive ? a : b} />' },
    // Template literal
    { code: '<Component className={`btn-${type}`} />' },
    // JSX spread is not an attribute
    { code: '<Component {...props} />' },
  ],
  invalid: [
    // Inline object on custom component
    {
      code: '<Component style={{ color: "red" }} />',
      errors: [{ messageId: 'unstableProp' }],
    },
    // Inline array
    {
      code: '<Component options={[1, 2, 3]} />',
      errors: [{ messageId: 'unstableProp' }],
    },
    // Inline arrow function
    {
      code: '<Component onChange={() => handleChange()} />',
      errors: [{ messageId: 'unstableProp' }],
    },
    // Inline function expression
    {
      code: '<Component onClick={function() { doSomething() }} />',
      errors: [{ messageId: 'unstableProp' }],
    },
    // Inline object as data prop
    {
      code: '<Chart data={{ labels: [], values: [] }} />',
      errors: [{ messageId: 'unstableProp' }],
    },
    // Multiple violations
    {
      code: '<Component style={{ margin: 0 }} onClick={() => {}} />',
      errors: [
        { messageId: 'unstableProp' },
        { messageId: 'unstableProp' },
      ],
    },
    // style on custom component (not native element)
    {
      code: '<CustomButton style={{ padding: 10 }} />',
      errors: [{ messageId: 'unstableProp' }],
    },
    // Inline empty object
    {
      code: '<Component config={{}} />',
      errors: [{ messageId: 'unstableProp' }],
    },
    // Inline empty array
    {
      code: '<Component items={[]} />',
      errors: [{ messageId: 'unstableProp' }],
    },
  ],
});