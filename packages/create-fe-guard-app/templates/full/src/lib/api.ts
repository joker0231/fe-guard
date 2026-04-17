import createClient from 'openapi-fetch';
import { z } from 'zod';
import { logger } from './logger';

/**
 * API 客户端
 *
 * 使用方式：
 *   1. 用 openapi-typescript 从后端 OpenAPI schema 生成 paths 类型
 *   2. 替换下面的 `paths` 类型 import
 *   3. 所有 API 调用都通过 apiClient，响应必须经过 Zod 验证
 *
 * 使用：
 *   import { apiClient, parseResponse } from '@/lib/api';
 *   const { data, error } = await apiClient.GET('/users/{id}', { params: { path: { id: '1' } } });
 *   const user = parseResponse(UserSchema, data);
 */

// TODO: 替换为从 OpenAPI schema 生成的类型
// import type { paths } from '@/types/api-schema';
// export const apiClient = createClient<paths>({ baseUrl: '/api' });

// 临时占位（项目接入 OpenAPI 后替换）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiClient = createClient<any>({ baseUrl: '/api' });

/**
 * 校验 API 响应数据
 * 强制所有 I/O 边界数据必须经过 Zod schema 验证
 */
export function parseResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.error(`[API] response validation failed${context ? ` (${context})` : ''}`, {
      issues: result.error.issues,
    });
    throw new Error('API 响应数据格式不正确');
  }
  return result.data;
}

/**
 * 安全调用 API 并捕获错误
 */
export async function safeApiCall<T>(
  fn: () => Promise<T>,
  context: string,
): Promise<{ data: T; error: null } | { data: null; error: Error }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    logger.error(`[API] ${context} failed`, error);
    return { data: null, error };
  }
}