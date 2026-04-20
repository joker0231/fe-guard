import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/joker0231/fe-guard/blob/main/docs/rules/${name}.md`
);

const ALLOWED_NATIVE_ELEMENTS = new Set(['div']);

const DEFAULT_ALLOWED_FILES = [
  '**/components/ui/**',
];

function matchGlob(filepath: string, pattern: string): boolean {
  const regexStr = pattern
    .replace(/\*\*/g, '<<GLOBSTAR>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<GLOBSTAR>>/g, '.*');
  return new RegExp(regexStr).test(filepath);
}

type Options = [{ allowedFiles?: string[] }];

export default createRule<Options, 'restrictedElement'>({
  name: 'restrict-native-elements',
  meta: {
    type: 'problem',
    docs: { description: 'Only allow <div> as native HTML element; all others must use wrapped components' },
    schema: [
      {
        type: 'object',
        properties: {
          allowedFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Glob patterns for files where native elements are allowed (e.g., UI component wrappers)',
          },
        },
        additionalProperties: false,
      },
    ],
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
  defaultOptions: [{}],
  create(context, [options]) {
    const allowedFiles = [...DEFAULT_ALLOWED_FILES, ...(options.allowedFiles ?? [])];
    const filename = context.filename ?? context.getFilename();

    if (allowedFiles.some((pattern) => matchGlob(filename, pattern))) {
      return {};
    }

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const nameNode = node.name;
        if (nameNode.type !== 'JSXIdentifier') return;

        const name = nameNode.name;
        if (name[0] !== name[0].toLowerCase() || name[0] === name[0].toUpperCase()) return;
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
