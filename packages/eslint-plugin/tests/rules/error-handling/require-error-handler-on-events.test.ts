import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import rule from '../../../src/rules/error-handling/require-error-handler-on-events';

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

ruleTester.run('require-error-handler-on-events', rule, {
  valid: [
    // V1: async handler 的 await 在 try-catch 内
    {
      code: `
        const C = () => <button onClick={async () => {
          try { await fetch('/api'); } catch (e) { console.error(e); }
        }} />;
      `,
    },
    // V2: 嵌套的 try-catch（外层 try 包裹多个 await）
    {
      code: `
        const C = () => <form onSubmit={async (e) => {
          try {
            await validate();
            await submit();
          } catch (err) { logger.error(err); }
        }} />;
      `,
    },
    // V3: handler 是引用的变量 → 跳过（规则只管内联函数）
    {
      code: `
        const handler = async () => { await foo(); };
        const C = () => <button onClick={handler} />;
      `,
    },
    // V4: handler 无任何异步调用 → 跳过
    {
      code: `
        const C = () => <button onClick={() => setCount(c => c + 1)} />;
      `,
    },
    // V5: async handler 但没有 await（只同步代码）→ 不报错
    {
      code: `
        const C = () => <button onClick={async () => { setCount(1); }} />;
      `,
    },
    // V6: 非async handler，无 type 服务时无法判断 Promise，不报错
    {
      code: `
        const C = () => <button onClick={() => { submitForm(); }} />;
      `,
    },
    // V7: try-catch 包裹一个 await，另一个 await 也在同一 try 内
    {
      code: `
        const C = () => <input onChange={async (e) => {
          try {
            const v = await parse(e.target.value);
            await save(v);
          } catch (err) {
            console.error(err);
          }
        }} />;
      `,
    },
    // V8: onBlur 的 try-catch
    {
      code: `
        const C = () => <input onBlur={async () => {
          try { await validate(); } catch (e) { handleError(e); }
        }} />;
      `,
    },
    // V9: 非事件属性（className/style/data-*）不检查
    {
      code: `
        const C = () => <div className="foo" data-id="bar" />;
      `,
    },
    // V10: 嵌套函数中的 await（嵌套函数有自己的作用域，不属于 handler）
    {
      code: `
        const C = () => <button onClick={async () => {
          try { await main(); } catch (e) { logger.error(e); }
          const inner = async () => { await other(); };
        }} />;
      `,
    },
  ],

  invalid: [
    // I1: async onClick 内的 await 没有 try-catch
    {
      code: `
        const C = () => <button onClick={async () => {
          await fetch('/api/submit');
          setResult('ok');
        }} />;
      `,
      errors: [{ messageId: 'asyncAwaitNoTryCatch' }],
    },
    // I2: async onSubmit 内有 try 但 await 在 try 之外
    {
      code: `
        const C = () => <form onSubmit={async (e) => {
          e.preventDefault();
          await submit();
          try { clean(); } catch (x) { console.error(x); }
        }} />;
      `,
      errors: [{ messageId: 'asyncAwaitNoTryCatch' }],
    },
    // I3: async onChange 多个 await 都没包
    {
      code: `
        const C = () => <input onChange={async (e) => {
          const data = await parse(e.target.value);
          await save(data);
        }} />;
      `,
      errors: [
        { messageId: 'asyncAwaitNoTryCatch' },
        { messageId: 'asyncAwaitNoTryCatch' },
      ],
    },
    // I4: async onBlur 无 try-catch
    {
      code: `
        const C = () => <input onBlur={async () => {
          await validate();
        }} />;
      `,
      errors: [{ messageId: 'asyncAwaitNoTryCatch' }],
    },
    // I5: try 包了部分 await，另一个 await 裸露
    {
      code: `
        const C = () => <button onClick={async () => {
          try { await step1(); } catch (e) { console.error(e); }
          await step2();
        }} />;
      `,
      errors: [{ messageId: 'asyncAwaitNoTryCatch' }],
    },
    // I6: FunctionExpression 形式的 handler
    {
      code: `
        const C = () => <button onClick={async function() {
          await fetch('/api');
        }} />;
      `,
      errors: [{ messageId: 'asyncAwaitNoTryCatch' }],
    },
    // I7: async handler 中 if 分支内的裸 await
    {
      code: `
        const C = () => <button onClick={async () => {
          if (cond) {
            await risky();
          }
        }} />;
      `,
      errors: [{ messageId: 'asyncAwaitNoTryCatch' }],
    },
    // I8: onFocus async 无 try-catch
    {
      code: `
        const C = () => <input onFocus={async () => {
          await track();
        }} />;
      `,
      errors: [{ messageId: 'asyncAwaitNoTryCatch' }],
    },
  ],
});