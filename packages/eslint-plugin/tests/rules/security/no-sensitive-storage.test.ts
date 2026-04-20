import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/security/no-sensitive-storage';

const tester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaVersion: 2020, sourceType: 'module', ecmaFeatures: { jsx: true } },
  },
});

tester.run('no-sensitive-storage', rule, {
  valid: [
    // Token storage is OK (persist store use case)
    `localStorage.setItem('auth-token', token);`,
    `localStorage.setItem('refresh-token', refreshToken);`,
    `sessionStorage.setItem('session-id', sid);`,
    // Normal storage
    `localStorage.setItem('theme', 'dark');`,
    `localStorage.setItem('language', 'zh-CN');`,
    `localStorage.setItem('user-preference', JSON.stringify(prefs));`,
    // Not setItem
    `localStorage.getItem('last-pwd');`,
    `localStorage.removeItem('last-pwd');`,
    // Not localStorage/sessionStorage
    `myStorage.setItem('password', value);`,
    // Value variable name is not sensitive
    `localStorage.setItem('user-data', formData.email);`,
    `localStorage.setItem('last-login', user.name);`,
  ],
  invalid: [
    // Key contains 'pwd'
    {
      code: `localStorage.setItem('last-pwd', formData.password);`,
      errors: [{ messageId: 'sensitiveKey' }],
    },
    // Key contains 'password'
    {
      code: `localStorage.setItem('user-password', hash);`,
      errors: [{ messageId: 'sensitiveKey' }],
    },
    // Key contains 'secret'
    {
      code: `localStorage.setItem('client-secret', secret);`,
      errors: [{ messageId: 'sensitiveKey' }],
    },
    // Key contains 'credential'
    {
      code: `sessionStorage.setItem('user-credential', cred);`,
      errors: [{ messageId: 'sensitiveKey' }],
    },
    // Key contains 'api_key'
    {
      code: `localStorage.setItem('api_key', key);`,
      errors: [{ messageId: 'sensitiveKey' }],
    },
    // Key contains 'apikey'
    {
      code: `localStorage.setItem('myapikey', key);`,
      errors: [{ messageId: 'sensitiveKey' }],
    },
    // Key contains 'private_key'
    {
      code: `localStorage.setItem('private_key', pk);`,
      errors: [{ messageId: 'sensitiveKey' }],
    },
    // Value is MemberExpression with sensitive property name
    {
      code: `localStorage.setItem('remember-me', formData.password);`,
      errors: [{ messageId: 'sensitiveValue' }],
    },
    // Value is MemberExpression with sensitive property (pwd)
    {
      code: `localStorage.setItem('quick-login', user.pwd);`,
      errors: [{ messageId: 'sensitiveValue' }],
    },
    // Value is Identifier with sensitive name
    {
      code: `localStorage.setItem('backup', password);`,
      errors: [{ messageId: 'sensitiveValue' }],
    },
    // sessionStorage
    {
      code: `sessionStorage.setItem('temp-pwd', tempPwd);`,
      errors: [{ messageId: 'sensitiveKey' }],
    },
    // Template literal key
    {
      code: "localStorage.setItem(`user-password`, val);",
      errors: [{ messageId: 'sensitiveKey' }],
    },
    // Key contains 'access_key'
    {
      code: `localStorage.setItem('access_key', ak);`,
      errors: [{ messageId: 'sensitiveKey' }],
    },
    // Value with secretKey
    {
      code: `localStorage.setItem('config', config.secretKey);`,
      errors: [{ messageId: 'sensitiveValue' }],
    },
  ],
});
