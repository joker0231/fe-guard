import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/security/no-hardcoded-secret';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-hardcoded-secret', rule, {
  valid: [
    // 环境变量引用
    { code: 'const apiKey = process.env.API_KEY;' },
    { code: 'const secret = process.env.SECRET;' },
    { code: 'const token = import.meta.env.VITE_TOKEN;' },
    { code: 'const config = { apiKey: process.env.API_KEY };' },
    { code: 'const password = process.env["PASSWORD"];' },
    // 空字符串/占位符
    { code: 'const apiKey = "";' },
    { code: 'const apiKey = "your-api-key-here";' },
    { code: 'const secret = "replace-me";' },
    { code: 'const token = "xxxxxxxx";' },
    { code: 'const password = "placeholder";' },
    // 非敏感变量名
    { code: 'const name = "John";' },
    { code: 'const url = "https://example.com";' },
    { code: 'const longString = "a".repeat(100);' },
    // 短字符串（8字符及以下且不匹配强模式）
    { code: 'const apiKey = "abc";' },
    { code: 'const secret = "hello";' },
    // 测试文件中的字符串（但测试文件本身被跳过）
    {
      code: 'const apiKey = "sk-test1234567890abc";',
      filename: 'src/foo.test.ts',
    },
    {
      code: 'const apiKey = "sk-test1234567890abc";',
      filename: 'src/__tests__/foo.ts',
    },
    // 非字符串值
    { code: 'const apiKey = someFunction();' },
    { code: 'const token = { foo: "bar" };' },
  ],
  invalid: [
    // 变量声明：敏感名称 + 长字符串值
    {
      code: 'const apiKey = "abc123xyz789def";',
      errors: [{ messageId: 'hardcodedByName' }],
    },
    {
      code: 'const secret = "mySecretValue123";',
      errors: [{ messageId: 'hardcodedByName' }],
    },
    {
      code: 'const password = "mypassword123";',
      errors: [{ messageId: 'hardcodedByName' }],
    },
    {
      code: 'const authToken = "abcdefghijklmnop";',
      errors: [{ messageId: 'hardcodedByName' }],
    },
    {
      code: 'const privateKey = "-----BEGIN PRIVATE KEY-----xyz";',
      errors: [{ messageId: 'hardcodedByName' }],
    },
    // 变量声明：短字符串但匹配强模式
    {
      code: 'const apiKey = "sk-abc1234567";',
      errors: [{ messageId: 'hardcodedByName' }],
    },
    // 对象属性：敏感属性名
    {
      code: 'const config = { apiKey: "abc123xyz789def" };',
      errors: [{ messageId: 'hardcodedByName' }],
    },
    {
      code: 'const headers = { Authorization: "Bearer abc123xyz789def456" };',
      errors: [{ messageId: 'hardcodedByName' }],
    },
    {
      code: 'const opts = { password: "mypassword123" };',
      errors: [{ messageId: 'hardcodedByName' }],
    },
    {
      code: 'const obj = { access_token: "abcdefghijklmnop" };',
      errors: [{ messageId: 'hardcodedByName' }],
    },
    // 字符串值模式匹配（变量名不敏感）
    {
      code: 'const header = "sk-abc123xyz789def456";',
      errors: [{ messageId: 'hardcodedByValue' }],
    },
    {
      code: 'const header = "Bearer abc123xyz789def456ghi";',
      errors: [{ messageId: 'hardcodedByValue' }],
    },
    {
      code: 'const ghToken = "ghp_abc123xyz789def456";',
      errors: [{ messageId: 'hardcodedByValue' }],
    },
    {
      code: 'const slack = "xoxb-abc123xyz789def";',
      errors: [{ messageId: 'hardcodedByValue' }],
    },
    {
      code: 'const aws = "AKIAIOSFODNN7EXAMPLE";',
      errors: [{ messageId: 'hardcodedByValue' }],
    },
    // 函数参数中的强模式（属性名非敏感，通过Literal强模式检测）
    {
      code: 'fetch("url", { headers: { "X-Auth": "Bearer abc123xyz789def456ghi" } });',
      errors: [{ messageId: 'hardcodedByValue' }],
    },
  ],
});