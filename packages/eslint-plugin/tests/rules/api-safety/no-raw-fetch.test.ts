import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/api-safety/no-raw-fetch';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-raw-fetch', rule, {
  valid: [
    // Using httpClient (not raw fetch)
    {
      code: "httpClient.get('/api/users');",
    },
    {
      code: "httpClient.post('/api/tasks', { title: 'New Task' });",
    },
    // Not a fetch/axios call
    {
      code: "myFetch('/api');",
    },
    {
      code: "customAxios.get('/api');",
    },
    // Allowed file: http-client implementation
    {
      code: "fetch('/api/data');",
      filename: '/project/src/lib/http-client.ts',
    },
    {
      code: "fetch('/api/data');",
      filename: '/project/src/lib/api-client.ts',
    },
    {
      code: "fetch('/api/data');",
      filename: '/project/src/utils/http-request.ts',
    },
    // Allowed file with custom pattern
    {
      code: "fetch('/api/data');",
      options: [{ allowedFiles: ['**/services/base*'] }],
      filename: '/project/src/services/base-client.ts',
    },
  ],
  invalid: [
    // Direct fetch
    {
      code: "fetch('/api/users');",
      errors: [{ messageId: 'noRawFetch' }],
    },
    // fetch with options
    {
      code: "fetch('/api/users', { method: 'POST', body: JSON.stringify(data) });",
      errors: [{ messageId: 'noRawFetch' }],
    },
    // window.fetch
    {
      code: "window.fetch('/api/users');",
      errors: [{ messageId: 'noRawFetch' }],
    },
    // axios direct call
    {
      code: "axios('/api/users');",
      errors: [{ messageId: 'noRawAxios' }],
    },
    // axios.get
    {
      code: "axios.get('/api/users');",
      errors: [{ messageId: 'noRawAxios' }],
    },
    // axios.post
    {
      code: "axios.post('/api/users', { name: 'test' });",
      errors: [{ messageId: 'noRawAxios' }],
    },
    // axios.put
    {
      code: "axios.put('/api/users/1', { name: 'updated' });",
      errors: [{ messageId: 'noRawAxios' }],
    },
    // axios.delete
    {
      code: "axios.delete('/api/users/1');",
      errors: [{ messageId: 'noRawAxios' }],
    },
    // axios.create
    {
      code: "const instance = axios.create({ baseURL: '/api' });",
      errors: [{ messageId: 'noRawAxios' }],
    },
    // new XMLHttpRequest
    {
      code: "const xhr = new XMLHttpRequest();",
      errors: [{ messageId: 'noRawXHR' }],
    },
    // In a routes file (not allowed)
    {
      code: "fetch('/api/tasks');",
      filename: '/project/src/routes/tasks.tsx',
      errors: [{ messageId: 'noRawFetch' }],
    },
    // In a component file (not allowed)
    {
      code: "const res = await fetch('/api/data');",
      filename: '/project/src/components/DataList.tsx',
      errors: [{ messageId: 'noRawFetch' }],
    },
  ],
});
// 补充测试：扩展的网络请求旁路检测
import rule2 from '../../../src/rules/api-safety/no-raw-fetch';

const ruleTester2 = new RuleTester({
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester2.run('no-raw-fetch (extended bypass detection)', rule2, {
  valid: [
    // ✅ 在HTTP client实现文件中可以使用fetch
    {
      code: "const res = await fetch(url, options);",
      filename: '/project/src/lib/http-client.ts',
    },
    // ✅ 正常创建非script元素
    {
      code: "document.createElement('div');",
    },
    // ✅ 给非Image对象赋值src
    {
      code: "videoElement.src = '/video.mp4';",
    },
  ],
  invalid: [
    // ❌ navigator.sendBeacon
    {
      code: "navigator.sendBeacon('/analytics', data);",
      errors: [{ messageId: 'noSendBeacon' }],
    },
    // ❌ document.createElement('script') — JSONP
    {
      code: "const script = document.createElement('script');",
      errors: [{ messageId: 'noDynamicScript' }],
    },
    // ❌ new EventSource
    {
      code: "const es = new EventSource('/events');",
      errors: [{ messageId: 'noRawEventSource' }],
    },
    // ❌ new Worker
    {
      code: "const worker = new Worker('worker.js');",
      errors: [{ messageId: 'noRawWorker' }],
    },
    // ❌ new SharedWorker
    {
      code: "const sw = new SharedWorker('shared.js');",
      errors: [{ messageId: 'noRawWorker' }],
    },
    // ❌ new Image().src = url (直接形式)
    {
      code: "new Image().src = '/track?event=click';",
      errors: [{ messageId: 'noImageBeacon' }],
    },
    // ❌ Image beacon with variable (img/image/pixel/beacon pattern)
    {
      code: "const img = new Image(); img.src = '/track?event=view';",
      errors: [{ messageId: 'noImageBeacon' }],
    },
  ],
});
