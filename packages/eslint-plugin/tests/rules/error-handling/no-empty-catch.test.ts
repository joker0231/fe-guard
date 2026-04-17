import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import rule from '../../../src/rules/error-handling/no-empty-catch';

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

ruleTester.run('no-empty-catch', rule, {
  valid: [
    // console.error 记录
    { code: 'try { foo() } catch (e) { console.error(e) }' },
    // logger.error 记录
    { code: 'try { foo() } catch (e) { logger.error(e) }' },
    // throw 重新抛出
    { code: 'try { foo() } catch (e) { throw e }' },
    // return 降级
    { code: 'function f() { try { foo() } catch (e) { return null } }' },
    // 自定义上报函数
    { code: 'try { foo() } catch (e) { reportError(e) }' },
    // handleError
    { code: 'try { foo() } catch (e) { handleError(e) }' },
    // if 分支处理
    { code: 'try { foo() } catch (e) { if (e.code) console.error(e) }' },
    // await logger
    { code: 'async function f() { try { await foo() } catch (e) { await logger.error(e) } }' },
  ],

  invalid: [
    // 完全空
    {
      code: 'try { foo() } catch (e) {}',
      errors: [{ messageId: 'emptyCatch' }],
    },
    // 只有空语句
    {
      code: 'try { foo() } catch (e) { ; }',
      errors: [{ messageId: 'emptyCatch' }],
    },
    // 无参数catch
    {
      code: 'try { foo() } catch {}',
      errors: [{ messageId: 'emptyCatch' }],
    },
    // 只有无关赋值，没有处理
    {
      code: 'try { foo() } catch (e) { const x = 1 }',
      errors: [{ messageId: 'emptyCatch' }],
    },
    // 只有无关函数调用（不匹配handler模式）
    {
      code: 'try { foo() } catch (e) { doSomething() }',
      errors: [{ messageId: 'emptyCatch' }],
    },
    // 普通方法调用不算处理
    {
      code: 'try { foo() } catch (e) { x.y() }',
      errors: [{ messageId: 'emptyCatch' }],
    },
  ],
});