/**
 * useLocalStorage — localStorage 持久化状态 Hook（带 Zod 验证）
 *
 * 初始值：尝试读 localStorage → Zod 验证 → 失败/缺失则用 defaultValue
 * setValue：更新 state + 写 localStorage（JSON.stringify）
 * 所有读写都 try-catch（localStorage 可能被禁用或配额超限）
 *
 * 使用：
 *   const PrefSchema = z.object({ theme: z.enum(['light', 'dark']), fontSize: z.number() });
 *   const [pref, setPref] = useLocalStorage({
 *     key: 'user-pref',
 *     schema: PrefSchema,
 *     defaultValue: { theme: 'light', fontSize: 14 },
 *   });
 */

import { useCallback, useState } from 'react';
import type { z } from 'zod';
import { logger } from '@/lib/logger';

export interface UseLocalStorageOptions<T> {
  key: string;
  schema: z.ZodSchema<T>;
  defaultValue: T;
}

function readFromStorage<T>(
  key: string,
  schema: z.ZodSchema<T>,
  defaultValue: T,
): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }
    const parsed: unknown = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      logger.warn(`[useLocalStorage] schema validation failed for key "${key}"`, {
        issues: result.error.issues,
      });
      return defaultValue;
    }
    return result.data;
  } catch (e) {
    logger.warn(`[useLocalStorage] read failed for key "${key}"`, e);
    return defaultValue;
  }
}

function writeToStorage(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    logger.warn(`[useLocalStorage] write failed for key "${key}"`, e);
  }
}

export function useLocalStorage<T>(
  options: UseLocalStorageOptions<T>,
): [T, (value: T) => void] {
  const { key, schema, defaultValue } = options;

  const [value, setValue] = useState<T>(() =>
    readFromStorage(key, schema, defaultValue),
  );

  const setAndPersist = useCallback(
    (next: T): void => {
      setValue(next);
      writeToStorage(key, next);
    },
    [key],
  );

  return [value, setAndPersist];
}