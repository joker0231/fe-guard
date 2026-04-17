/**
 * useList — 列表统一管理 Hook
 *
 * 屏蔽 loading/error/empty/success 四态处理，让业务代码简洁。
 * 基于 TanStack Query 实现。
 *
 * 使用：
 *   const { data, isLoading, isError, isEmpty, error, refetch } = useList({
 *     queryKey: ['users'],
 *     queryFn: () => fetch('/api/users').then(r => r.json()),
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (isError) return <ErrorView error={error} />;
 *   if (isEmpty) return <Empty />;
 *   return <UserList items={data} />;
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface UseListOptions<T> {
  queryKey: unknown[];
  queryFn: () => Promise<T[]>;
  enabled?: boolean;
}

export interface UseListResult<T> {
  data: T[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isEmpty: boolean;
  refetch: () => Promise<void>;
}

export function useList<T>(options: UseListOptions<T>): UseListResult<T> {
  const { queryKey, queryFn, enabled = true } = options;

  const query = useQuery<T[], Error>({
    queryKey,
    queryFn,
    enabled,
  });

  const refetch = useCallback(async (): Promise<void> => {
    try {
      await query.refetch();
    } catch (e) {
      logger.error('[useList] refetch failed', e);
    }
  }, [query]);

  const data: T[] = query.data ?? [];
  const isLoading = query.isLoading;
  const isError = query.isError;
  const error: Error | null = query.error ?? null;
  const isEmpty = !isLoading && !isError && data.length === 0;

  return {
    data,
    isLoading,
    isError,
    error,
    isEmpty,
    refetch,
  };
}