/**
 * 认证相关字段 Schema — 唯一真相源
 *
 * ⚠️ 所有涉及认证的字段校验必须从此处导入，禁止在组件中内联定义。
 *
 * 留白区域（AI 根据业务调整）：
 * - 密码强度规则（当前 min(6)，可按业务加 regex）
 * - 用户名格式（当前允许字母数字下划线）
 * - 额外认证字段（验证码、MFA token 等）
 */

import { z } from 'zod';

// ============================================================
// 密码 Schema
// 修改密码规则时只改这里，全局生效
// ============================================================
export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password must be at most 128 characters');

// ============================================================
// 邮箱 Schema
// ============================================================
export const emailSchema = z
  .string()
  .email('Invalid email address');

// ============================================================
// 用户名 Schema
// 留白区域：AI 根据业务调整格式要求
// ============================================================
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Username can only contain letters, numbers, and underscores'
  );