/**
 * 通用字段 Schema — 唯一真相源
 *
 * ⚠️ 所有通用字段校验必须从此处导入，禁止在组件中内联定义。
 *
 * 留白区域（AI 根据业务调整）：
 * - 修改校验规则只改这里，全局生效
 * - 按业务需求新增字段 schema
 */

import { z } from 'zod';

// ============================================================
// 姓名 / 昵称 Schema
// ============================================================
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(50, 'Name must be at most 50 characters');

// ============================================================
// 手机号 Schema
// 留白区域：AI 根据业务地区调整正则
// ============================================================
export const phoneSchema = z
  .string()
  .regex(
    /^\+?[1-9]\d{1,14}$/,
    'Invalid phone number'
  );

// ============================================================
// URL Schema
// ============================================================
export const urlSchema = z
  .string()
  .url('Invalid URL');

// ============================================================
// 年龄 Schema
// ============================================================
export const ageSchema = z
  .number()
  .int('Age must be an integer')
  .min(1, 'Age must be at least 1')
  .max(150, 'Age must be at most 150');

// ============================================================
// UUID Schema（通用 ID 格式）
// ============================================================
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

// ============================================================
// 非空文本 Schema（标题、描述等）
// ============================================================
export const nonEmptyStringSchema = z
  .string()
  .min(1, 'This field is required')
  .max(500, 'Text is too long');

// ============================================================
// 分页参数 Schema
// ============================================================
export const pageSchema = z
  .number()
  .int()
  .min(1, 'Page must be at least 1');

export const pageSizeSchema = z
  .number()
  .int()
  .min(1, 'Page size must be at least 1')
  .max(100, 'Page size must be at most 100');