import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import rule from '../../../src/rules/component/no-inline-component-definition';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-inline-component-definition', rule, {
  valid: [
    // 顶层组件只有handlers，没有嵌套组件
    {
      code: `
        function Parent() {
          const handleClick = () => { console.log('click') };
          return <div onClick={handleClick}>hi</div>;
        }
      `,
    },
    // 小写函数返回JSX（render helper），不算组件
    {
      code: `
        function Parent() {
          const renderHeader = () => <div>header</div>;
          return <div>{renderHeader()}</div>;
        }
      `,
    },
    // 顶层定义的多个组件，没有嵌套
    {
      code: `
        function Child() { return <span/>; }
        function Parent() { return <Child/>; }
      `,
    },
    // 非组件函数内嵌套函数（普通工具函数，不返回JSX）
    {
      code: `
        function Parent() {
          const compute = () => 42;
          return <div>{compute()}</div>;
        }
      `,
    },
    // 非组件外层（小写名），内部大写函数不检查
    {
      code: `
        function helper() {
          const Inner = () => <span/>;
          return Inner;
        }
      `,
    },
  ],

  invalid: [
    // 函数声明嵌套
    {
      code: `
        function Parent() {
          function Child() { return <span/>; }
          return <Child/>;
        }
      `,
      errors: [{ messageId: 'inlineComponent' }],
    },
    // const + 箭头嵌套
    {
      code: `
        function Parent() {
          const Child = () => <span/>;
          return <Child/>;
        }
      `,
      errors: [{ messageId: 'inlineComponent' }],
    },
    // 箭头父组件 + 箭头子组件
    {
      code: `
        const Parent = () => {
          const Child = () => <span/>;
          return <Child/>;
        }
      `,
      errors: [{ messageId: 'inlineComponent' }],
    },
    // const + function expression
    {
      code: `
        function Parent() {
          const Child = function() { return <span/>; };
          return <Child/>;
        }
      `,
      errors: [{ messageId: 'inlineComponent' }],
    },
    // 嵌套组件有块级body且有return
    {
      code: `
        function Parent() {
          const Inner = () => {
            const x = 1;
            return <div>{x}</div>;
          };
          return <Inner/>;
        }
      `,
      errors: [{ messageId: 'inlineComponent' }],
    },
  ],
});