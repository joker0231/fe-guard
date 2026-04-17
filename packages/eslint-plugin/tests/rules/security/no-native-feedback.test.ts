import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/security/no-native-feedback';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-native-feedback', rule, {
  valid: [
    // Wrapped feedback API is fine
    { code: 'feedback.info("Operation successful")' },
    { code: 'feedback.confirm("Are you sure?")' },
    { code: 'message.success("Done")' },
    // React rendering is fine
    { code: 'setContent(<div dangerouslySetInnerHTML={{ __html: sanitized }} />)' },
    // Other function calls are fine
    { code: 'console.log("debug")' },
    { code: 'window.location.href = "/home"' },
    { code: 'document.getElementById("app")' },
    // Reading innerHTML/outerHTML is fine (only assignment is forbidden)
    { code: 'const html = element.innerHTML' },
    { code: 'const outer = element.outerHTML' },
    // insertAdjacentText is fine (only insertAdjacentHTML is forbidden)
    { code: 'element.insertAdjacentText("beforeend", "text")' },
  ],
  invalid: [
    // Direct alert
    {
      code: 'alert("Hello")',
      errors: [{ messageId: 'forbidden' }],
    },
    // Direct confirm
    {
      code: 'confirm("Are you sure?")',
      errors: [{ messageId: 'forbidden' }],
    },
    // Direct prompt
    {
      code: 'prompt("Enter value")',
      errors: [{ messageId: 'forbidden' }],
    },
    // Direct eval
    {
      code: 'eval("1+1")',
      errors: [{ messageId: 'forbidden' }],
    },
    // window.alert
    {
      code: 'window.alert("Hello")',
      errors: [{ messageId: 'forbidden' }],
    },
    // window.confirm
    {
      code: 'window.confirm("Sure?")',
      errors: [{ messageId: 'forbidden' }],
    },
    // window.prompt
    {
      code: 'window.prompt("Enter")',
      errors: [{ messageId: 'forbidden' }],
    },
    // document.write
    {
      code: 'document.write("<h1>Hello</h1>")',
      errors: [{ messageId: 'forbidden' }],
    },
    // document.writeln
    {
      code: 'document.writeln("<p>text</p>")',
      errors: [{ messageId: 'forbidden' }],
    },
    // window.eval
    {
      code: 'window.eval("1+1")',
      errors: [{ messageId: 'forbidden' }],
    },
    // innerHTML assignment
    {
      code: 'element.innerHTML = "<div>content</div>"',
      errors: [{ messageId: 'forbidden' }],
    },
    // innerHTML assignment via member
    {
      code: 'document.body.innerHTML = html',
      errors: [{ messageId: 'forbidden' }],
    },
    // outerHTML assignment
    {
      code: 'element.outerHTML = "<div>replaced</div>"',
      errors: [{ messageId: 'forbidden' }],
    },
    // insertAdjacentHTML
    {
      code: 'element.insertAdjacentHTML("beforeend", "<p>injected</p>")',
      errors: [{ messageId: 'forbidden' }],
    },
    // insertAdjacentHTML on document element
    {
      code: 'document.body.insertAdjacentHTML("afterbegin", html)',
      errors: [{ messageId: 'forbidden' }],
    },
  ],
});