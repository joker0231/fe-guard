import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFormSubmit } from './use-form-submit';

describe('useFormSubmit', () => {
  it('初始状态 isSubmitting=false, error=null', () => {
    const { result } = renderHook(() =>
      useFormSubmit({ onSubmit: vi.fn().mockResolvedValue(null) }),
    );

    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('submit 成功 → 调用 onSuccess', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ id: 1, name: 'alice' });
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useFormSubmit<{ name: string }, { id: number; name: string }>({
        onSubmit,
        onSuccess,
      }),
    );

    await act(async () => {
      await result.current.submit({ name: 'alice' });
    });

    expect(onSubmit).toHaveBeenCalledWith({ name: 'alice' });
    expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'alice' }, { name: 'alice' });
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('submit 失败 → error 有值, 调用 onError', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('validation'));
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useFormSubmit<{ name: string }, unknown>({
        onSubmit,
        onError,
      }),
    );

    await act(async () => {
      await result.current.submit({ name: 'x' });
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('validation');
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'validation' }),
      { name: 'x' },
    );
    expect(result.current.isSubmitting).toBe(false);
  });

  it('submit 执行期间 isSubmitting=true', async () => {
    let resolveFn!: (v: unknown) => void;
    const onSubmit = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFn = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useFormSubmit<{ name: string }, unknown>({ onSubmit }),
    );

    let submitPromise!: Promise<void>;
    act(() => {
      submitPromise = result.current.submit({ name: 'a' });
    });

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(true);
    });

    await act(async () => {
      resolveFn(null);
      await submitPromise;
    });

    expect(result.current.isSubmitting).toBe(false);
  });

  it('reset 清空 error 和 isSubmitting', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('err'));
    const { result } = renderHook(() =>
      useFormSubmit<{ v: number }, unknown>({ onSubmit }),
    );

    await act(async () => {
      await result.current.submit({ v: 1 });
    });
    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('非 Error 抛出 → 包装为 Error', async () => {
    const onSubmit = vi.fn().mockRejectedValue('string error');
    const { result } = renderHook(() =>
      useFormSubmit<unknown, unknown>({ onSubmit }),
    );

    await act(async () => {
      await result.current.submit({});
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('string error');
  });
});