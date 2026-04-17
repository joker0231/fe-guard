import { RuleTester } from '@typescript-eslint/rule-tester';
import rule from '../../../src/rules/ai-smell/no-full-module-import';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-full-module-import', rule, {
  valid: [
    // 按需导入 lodash 子路径
    { code: "import get from 'lodash/get';" },
    { code: "import debounce from 'lodash/debounce';" },
    // lodash-es 按需
    { code: "import { get } from 'lodash-es';" },
    // 小库不受限
    { code: "import dayjs from 'dayjs';" },
    // antd 具名导入
    { code: "import { Button, Table } from 'antd';" },
    // @ant-design/icons 具名导入
    { code: "import { UserOutlined } from '@ant-design/icons';" },
    // rxjs 具名导入
    { code: "import { Observable } from 'rxjs';" },
    // 普通工具库默认导入不受限
    { code: "import React from 'react';" },
    // type-only 默认导入（lodash 不会导致 bundle 污染）
    { code: "import type Lodash from 'lodash';" },
    // type-only namespace import
    { code: "import type * as Antd from 'antd';" },
  ],
  invalid: [
    // lodash 默认导入
    {
      code: "import _ from 'lodash';",
      errors: [{ messageId: 'fullDefaultImport' }],
    },
    // moment 默认导入
    {
      code: "import moment from 'moment';",
      errors: [{ messageId: 'fullDefaultImport' }],
    },
    // ramda 默认导入
    {
      code: "import R from 'ramda';",
      errors: [{ messageId: 'fullDefaultImport' }],
    },
    // @ant-design/icons 默认导入
    {
      code: "import Icons from '@ant-design/icons';",
      errors: [{ messageId: 'fullDefaultImport' }],
    },
    // rxjs 默认导入
    {
      code: "import rxjs from 'rxjs';",
      errors: [{ messageId: 'fullDefaultImport' }],
    },
    // namespace import antd
    {
      code: "import * as Antd from 'antd';",
      errors: [{ messageId: 'namespaceImport' }],
    },
    // namespace import @mui/material
    {
      code: "import * as Mui from '@mui/material';",
      errors: [{ messageId: 'namespaceImport' }],
    },
    // namespace import lodash
    {
      code: "import * as _ from 'lodash';",
      errors: [{ messageId: 'namespaceImport' }],
    },
    // namespace import date-fns
    {
      code: "import * as df from 'date-fns';",
      errors: [{ messageId: 'namespaceImport' }],
    },
    // namespace import rxjs
    {
      code: "import * as rx from 'rxjs';",
      errors: [{ messageId: 'namespaceImport' }],
    },
  ],
});