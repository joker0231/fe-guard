import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import rule from '../../../src/rules/data-flow/require-io-validation';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-io-validation', rule, {
  valid: [
    // 1. fetch响应经Zod.parse验证后使用
    {
      code: `
        async function load() {
          const res = await fetch('/api/users');
          const raw = await res.json();
          const users = UserSchema.parse(raw);
          setUsers(users);
        }
      `,
    },
    // 2. axios响应经safeParse验证
    {
      code: `
        async function load() {
          const res = await axios.get('/api/users');
          const users = UserSchema.safeParse(res.data);
          setUsers(users);
        }
      `,
    },
    // 3. 变量重新赋值为净化后的结果
    {
      code: `
        async function load() {
          let data = await (await fetch('/api/x')).json();
          data = DataSchema.parse(data);
          setData(data);
        }
      `,
    },
    // 4. 直接在sink参数位置净化
    {
      code: `
        async function load() {
          const raw = await (await fetch('/api/x')).json();
          setData(DataSchema.parse(raw));
        }
      `,
    },
    // 5. 带 @io-validated 注释
    {
      code: `
        async function load() {
          // @io-validated
          const raw = await (await fetch('/api/x')).json();
          setData(raw);
        }
      `,
    },
    // 6. validate命名的自定义函数
    {
      code: `
        async function load() {
          const raw = await (await fetch('/api/x')).json();
          const clean = validateUser(raw);
          setUser(clean);
        }
      `,
    },
    // 7. 非IO数据不触发
    {
      code: `
        function load() {
          const data = { name: 'hi' };
          setData(data);
        }
      `,
    },
    // 8. 测试文件跳过（文件名为*.test.ts）
    {
      filename: 'foo.test.ts',
      code: `
        async function load() {
          const raw = await (await fetch('/api/x')).json();
          setData(raw);
        }
      `,
    },
    // 9. JSX渲染净化后的变量
    {
      code: `
        async function Comp() {
          const raw = await (await fetch('/api/x')).json();
          const data = DataSchema.parse(raw);
          return <div>{data}</div>;
        }
      `,
    },
    // 10. sanitizer内联：setState(Schema.parse(await res.json()))
    {
      code: `
        async function load() {
          const res = await fetch('/api/x');
          setData(DataSchema.parse(await res.json()));
        }
      `,
    },
  ],
  invalid: [
    // 1. fetch响应未验证直接setState
    {
      code: `
        async function load() {
          const res = await fetch('/api/users');
          const data = await res.json();
          setUsers(data);
        }
      `,
      errors: [{ messageId: 'taintFlowToSink' }],
    },
    // 2. axios响应.data未验证直接setState
    {
      code: `
        async function load() {
          const res = await axios.get('/api/users');
          setUsers(res.data);
        }
      `,
      errors: [{ messageId: 'taintFlowToSink' }],
    },
    // 3. 一层赋值传播后未验证
    {
      code: `
        async function load() {
          const raw = await (await fetch('/api/x')).json();
          const data = raw;
          setData(data);
        }
      `,
      errors: [{ messageId: 'taintFlowToSink' }],
    },
    // 4. axios直接调用解构.data未验证
    {
      code: `
        async function load() {
          const { data } = await axios.get('/api/x');
          setData(data);
        }
      `,
      errors: [{ messageId: 'taintFlowToSink' }],
    },
    // 5. JSX渲染未验证数据
    {
      code: `
        async function Comp() {
          const raw = await (await fetch('/api/x')).json();
          return <div>{raw}</div>;
        }
      `,
      errors: [{ messageId: 'taintFlowToJsx' }],
    },
    // 6. JSX传参给子组件
    {
      code: `
        async function Comp() {
          const res = await axios.get('/api/x');
          const data = res.data;
          return <Child data={data} />;
        }
      `,
      errors: [{ messageId: 'taintFlowToJsx' }],
    },
    // 7. useState初值是污点
    {
      code: `
        async function load() {
          const raw = await (await fetch('/api/x')).json();
          useState(raw);
        }
      `,
      errors: [{ messageId: 'taintFlowToSink' }],
    },
    // 8. setXxx系列setter
    {
      code: `
        async function load() {
          const raw = await (await fetch('/api/x')).json();
          setItems(raw);
        }
      `,
      errors: [{ messageId: 'taintFlowToSink' }],
    },
  ],
});