import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useList } from './use-list';

function createWrapper(): React.FC<{ children: React.ReactNode }> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
}

describe('useList', () => {
  it('初始状态 isLoading=true，data=[]', () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(
      () =>
        useList({
          queryKey: ['test-initial'],
          queryFn,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('成功加载非空数据 → isEmpty=false', async () => {
    const queryFn = vi.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const { result } = renderHook(
      () =>
        useList<{ id: number }>({
          queryKey: ['test-success'],
          queryFn,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('成功加载空数组 → isEmpty=true', async () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(
      () =>
        useList({
          queryKey: ['test-empty'],
          queryFn,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  it('请求失败 → isError=true, error有值', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('network error'));
    const { result } = renderHook(
      () =>
        useList({
          queryKey: ['test-error'],
          queryFn,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('network error');
    expect(result.current.isEmpty).toBe(false); // 错误时不算empty
  });

  it('refetch 可以重新请求', async () => {
    let callCount = 0;
    const queryFn = vi.fn().mockImplementation(() => {
      callCount += 1;
      return Promise.resolve([{ id: callCount }]);
    });

    const { result } = renderHook(
      () =>
        useList<{ id: number }>({
          queryKey: ['test-refetch'],
          queryFn,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.data).toEqual([{ id: 1 }]);

    await act(async () => {
      await result.current.refetch();
    });

    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual([{ id: 2 }]);
  });

  it('enabled=false → 不执行 queryFn', () => {
    const queryFn = vi.fn().mockResolvedValue([]);
    renderHook(
      () =>
        useList({
          queryKey: ['test-disabled'],
          queryFn,
          enabled: false,
        }),
      { wrapper: createWrapper() },
    );

    expect(queryFn).not.toHaveBeenCalled();
  });
});