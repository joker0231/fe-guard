import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/data-flow/require-storage-key-constants';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('require-storage-key-constants', rule, {
  valid: [
    // Using constant reference
    { code: `localStorage.getItem(STORAGE_KEY_TOKEN);` },
    { code: `sessionStorage.setItem(AUTH_KEY, value);` },
    { code: `localStorage.removeItem(CACHE_KEY);` },
    // Variable reference
    { code: `const key = getStorageKey(); localStorage.getItem(key);` },
    // Not a storage API
    { code: `myStorage.getItem('token');` },
    // Not getItem/setItem/removeItem
    { code: `localStorage.clear();` },
    { code: `localStorage.length;` },
  ],
  invalid: [
    // String literal key in getItem
    {
      code: `localStorage.getItem('auth_token');`,
      errors: [{ messageId: 'noMagicKey' }],
    },
    // String literal key in setItem
    {
      code: `localStorage.setItem('user_data', JSON.stringify(user));`,
      errors: [{ messageId: 'noMagicKey' }],
    },
    // String literal key in removeItem
    {
      code: `sessionStorage.removeItem('session_id');`,
      errors: [{ messageId: 'noMagicKey' }],
    },
    // Template literal key
    {
      code: 'localStorage.getItem(`user_${id}_prefs`);',
      errors: [{ messageId: 'noMagicKey' }],
    },
    // Double-quoted string
    {
      code: `sessionStorage.setItem("theme", "dark");`,
      errors: [{ messageId: 'noMagicKey' }],
    },
  ],
});