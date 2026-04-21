/**
 * Schema 统一导出 — 唯一入口
 *
 * 所有字段 schema 从此处导入：
 *   import { passwordSchema, emailSchema } from '@shared/schemas';
 *
 * ⚠️ 新增字段 schema 时：
 * 1. 在对应分类文件中定义（auth.ts / common.ts）
 * 2. 在此处 re-export
 */

// 认证相关
export {
  passwordSchema,
  emailSchema,
  usernameSchema,
} from './auth';

// 通用字段
export {
  nameSchema,
  phoneSchema,
  urlSchema,
  ageSchema,
  uuidSchema,
  nonEmptyStringSchema,
  pageSchema,
  pageSizeSchema,
} from './common';