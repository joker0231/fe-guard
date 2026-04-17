import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import rule from '../../../src/rules/state-management/require-lazy-state-init';

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

ruleTester.run('require-lazy-state-init', rule, {
  valid: [
    // 字面量初始值
    { code: 'const [x, setX] = useState(0)' },
    { code: 'const [s, setS] = useState("")' },
    { code: 'const [n, setN] = useState(null)' },
    { code: 'const [b, setB] = useState(true)' },
    // 简单identifier
    { code: 'const [v, setV] = useState(initialValue)' },
    // 对象/数组字面量
    { code: 'const [o, setO] = useState({})' },
    { code: 'const [a, setA] = useState([])' },
    // 已经是lazy
    { code: 'const [v, setV] = useState(() => computeInitial())' },
    { code: 'const [v, setV] = useState(() => expensiveCompute())' },
    // React.useState 变体的lazy
    { code: 'const [v, setV] = React.useState(() => loadFromStorage())' },
    // 非useState的函数调用，无需检测
    { code: 'const x = myFunction(compute())' },
  ],

  invalid: [
    // 函数调用作为初始值
    {
      code: 'const [v, setV] = useState(computeInitial())',
      errors: [{ messageId: 'needsLazyInit' }],
    },
    {
      code: 'const [v, setV] = useState(expensiveCompute())',
      errors: [{ messageId: 'needsLazyInit' }],
    },
    // React.useState 变体
    {
      code: 'const [v, setV] = React.useState(loadFromStorage())',
      errors: [{ messageId: 'needsLazyInit' }],
    },
    // 成员函数调用
    {
      code: 'const [v, setV] = useState(JSON.parse(str))',
      errors: [{ messageId: 'needsLazyInit' }],
    },
    // localStorage 读取
    {
      code: 'const [v, setV] = useState(localStorage.getItem("key"))',
      errors: [{ messageId: 'needsLazyInit' }],
    },
  ],
});