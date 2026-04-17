import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import rule from '../../../src/rules/render-safety/no-unstable-key';

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

ruleTester.run('no-unstable-key', rule, {
  valid: [
    { code: 'const el = <div key={item.id} />' },
    { code: 'const el = <div key={index} />' },
    { code: 'const el = <div key={`${user.id}-${i}`} />' },
    { code: 'const el = <div key="static-key" />' },
    { code: 'const el = <div key={user.id || "fallback"} />' },
    // 非key属性使用Math.random是允许的
    { code: 'const el = <div data-random={Math.random()} />' },
  ],

  invalid: [
    {
      code: 'const el = <div key={Math.random()} />',
      errors: [{ messageId: 'unstableKey' }],
    },
    {
      code: 'const el = <div key={Date.now()} />',
      errors: [{ messageId: 'unstableKey' }],
    },
    {
      code: 'const el = <div key={new Date()} />',
      errors: [{ messageId: 'unstableKey' }],
    },
    {
      code: 'const el = <div key={new Date().getTime()} />',
      errors: [{ messageId: 'unstableKey' }],
    },
    {
      code: 'const el = <div key={performance.now()} />',
      errors: [{ messageId: 'unstableKey' }],
    },
    {
      code: 'const el = <div key={Symbol()} />',
      errors: [{ messageId: 'unstableKey' }],
    },
  ],
});