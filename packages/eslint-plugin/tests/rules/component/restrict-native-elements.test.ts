import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/component/restrict-native-elements';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('restrict-native-elements', rule, {
  valid: [
    // div is allowed
    { code: '<div>content</div>' },
    { code: '<div className="wrapper"><div>inner</div></div>' },
    // Component (uppercase) is always allowed
    { code: '<Button onClick={handleClick}>Submit</Button>' },
    { code: '<Input value={val} onChange={handleChange} />' },
    { code: '<Image src="photo.jpg" alt="photo" />' },
    { code: '<Text>hello</Text>' },
    { code: '<Heading level={1}>Title</Heading>' },
    { code: '<Link href="/home">Home</Link>' },
    // Member expression components are allowed
    { code: '<Form.Item label="Name"><Input /></Form.Item>' },
    // Self-closing div
    { code: '<div />' },
  ],
  invalid: [
    {
      code: '<button onClick={handleClick}>Submit</button>',
      errors: [{ messageId: 'restrictedElement' }],
    },
    {
      code: '<input type="text" value={val} />',
      errors: [{ messageId: 'restrictedElement' }],
    },
    {
      code: '<a href="/home">Home</a>',
      errors: [{ messageId: 'restrictedElement' }],
    },
    {
      code: '<img src="photo.jpg" alt="photo" />',
      errors: [{ messageId: 'restrictedElement' }],
    },
    {
      code: '<span>text</span>',
      errors: [{ messageId: 'restrictedElement' }],
    },
    {
      code: '<p>paragraph</p>',
      errors: [{ messageId: 'restrictedElement' }],
    },
    {
      code: '<h1>Title</h1>',
      errors: [{ messageId: 'restrictedElement' }],
    },
    {
      code: '<form onSubmit={handleSubmit}><div /></form>',
      errors: [{ messageId: 'restrictedElement' }],
    },
    {
      code: '<select><option value="a">A</option></select>',
      errors: [{ messageId: 'restrictedElement' }, { messageId: 'restrictedElement' }],
    },
    {
      code: '<textarea rows={3} />',
      errors: [{ messageId: 'restrictedElement' }],
    },
    {
      code: '<table><tr><td>cell</td></tr></table>',
      errors: [{ messageId: 'restrictedElement' }, { messageId: 'restrictedElement' }, { messageId: 'restrictedElement' }],
    },
    {
      code: '<label htmlFor="name">Name</label>',
      errors: [{ messageId: 'restrictedElement' }],
    },
    {
      code: '<ul><li>item</li></ul>',
      errors: [{ messageId: 'restrictedElement' }, { messageId: 'restrictedElement' }],
    },
    {
      code: '<dialog open>modal</dialog>',
      errors: [{ messageId: 'restrictedElement' }],
    },
    {
      code: '<nav><div>menu</div></nav>',
      errors: [{ messageId: 'restrictedElement' }],
    },
  ],
});