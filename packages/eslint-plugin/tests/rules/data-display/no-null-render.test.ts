import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/data-display/no-null-render';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-null-render', rule, {
  valid: [
    // Nullish coalescing
    { code: `<p>{user.nickname ?? '暂无昵称'}</p>` },
    // Logical OR fallback
    { code: `<span>{order.remark || '-'}</span>` },
    // Conditional expression
    { code: `<span>{user.name ? user.name : 'Anonymous'}</span>` },
    // Static text (not a MemberExpression)
    { code: `<span>{'static text'}</span>` },
    // Safe property names
    { code: `<div>{items.length}</div>` },
    { code: `<div>{item.id}</div>` },
    // Safe objects
    { code: `<span>{Math.PI}</span>` },
    // this expression
    { code: `<span>{this.props.name}</span>` },
    // Non-optional MemberExpression in JSXElement children skipped (covered by no-undefined-render)
    { code: `<p>{user.nickname}</p>` },
    // Specific data-display fields skipped (date/boolean/enum/number)
    { code: `<p>{order.createdAt}</p>` },
    { code: `<p>{user.isActive}</p>` },
  ],
  invalid: [
    // MemberExpression inside JSX attribute value — not covered by no-undefined-render
    {
      code: `<Component title={config.label} />`,
      errors: [{ messageId: 'nullRender' }],
    },
  ],
});
