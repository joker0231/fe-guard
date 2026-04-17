import { createRule } from '../../utils/rule-helpers';

const ALLOWED_NATIVE_ELEMENTS = new Set(['div']);

export default createRule({
  name: 'restrict-native-elements',
  meta: {
    type: 'problem',
    docs: { description: 'Only allow <div> as native HTML element; all others must use wrapped components' },
    schema: [],
    messages: {
      restrictedElement:
        '禁止使用原生<{{name}}>元素。请使用封装组件替代：\n' +
        '<button> → <Button>，<input> → <Input>，<a> → <Link>，\n' +
        '<img> → <Image>，<span>/<p> → <Text>，\n' +
        '<h1>-<h6> → <Heading>，<form> → <Form>，\n' +
        '<select> → <Select>，<textarea> → <Textarea>，\n' +
        '<table> → <Table>，<dialog> → <Dialog>，\n' +
        '<label> → <Label>，<ul>/<ol>/<li> → <List>/<ListItem>',
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXOpeningElement(node) {
        const nameNode = node.name;
        // Only check simple JSX identifiers (not member expressions like Foo.Bar)
        if (nameNode.type !== 'JSXIdentifier') return;

        const name = nameNode.name;
        // Native HTML elements start with lowercase
        if (name[0] !== name[0].toLowerCase() || name[0] === name[0].toUpperCase()) return;
        // Additional guard: must start with a-z
        if (!/^[a-z]/.test(name)) return;

        if (!ALLOWED_NATIVE_ELEMENTS.has(name)) {
          context.report({
            node: nameNode,
            messageId: 'restrictedElement',
            data: { name },
          });
        }
      },
    };
  },
});