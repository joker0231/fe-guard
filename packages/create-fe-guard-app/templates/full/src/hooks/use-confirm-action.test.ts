import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useConfirmAction } from './use-confirm-action';

describe('useConfirmAction', () => {
  it('初始状态 isOpen=false, isConfirming=false', () => {
    const { result } = renderHook(() =>
      useConfirmAction({ onConfirm: vi.fn() }),
    );

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isConfirming).toBe(false);
    expect(result.current.title).toBe('确认操作');
    expect(result.current.description).toBe('确定要执行此操作吗？');
  });

  it('trigger 打开弹窗', () => {
    const { result } = renderHook(() =>
      useConfirmAction({ onConfirm: vi.fn(), title: '删除', description: '不可撤销' }),
    );

    act(() => {
      result.current.trigger();
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.title).toBe('删除');
    expect(result.current.description).toBe('不可撤销');
  });

  it('confirm 执行 onConfirm 并关闭弹窗', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useConfirmAction({ onConfirm }));

    act(() => {
      result.current.trigger();
    });
    expect(result.current.isOpen).toBe(true);

    await act(async () => {
      await result.current.confirm();
    });

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isConfirming).toBe(false);
  });

  it('confirm 执行期间 isConfirming=true', async () => {
    let resolveFn!: () => void;
    const onConfirm = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveFn = resolve;
        }),
    );
    const { result } = renderHook(() => useConfirmAction({ onConfirm }));

    act(() => {
      result.current.trigger();
    });

    let confirmPromise!: Promise<void>;
    act(() => {
      confirmPromise = result.current.confirm();
    });

    await waitFor(() => {
      expect(result.current.isConfirming).toBe(true);
    });

    // 执行中 cancel 不关闭
    act(() => {
      result.current.cancel();
    });
    expect(result.current.isOpen).toBe(true);

    // 完成
    await act(async () => {
      resolveFn();
      await confirmPromise;
    });

    expect(result.current.isConfirming).toBe(false);
    expect(result.current.isOpen).toBe(false);
  });

  it('onConfirm 抛错 → 向上抛出，isOpen 保持', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('删除失败'));
    const { result } = renderHook(() => useConfirmAction({ onConfirm }));

    act(() => {
      result.current.trigger();
    });

    await expect(
      act(async () => {
        await result.current.confirm();
      }),
    ).rejects.toThrow('删除失败');

    expect(result.current.isConfirming).toBe(false);
    expect(result.current.isOpen).toBe(true); // 失败时保持打开让用户重试
  });

  it('cancel 关闭弹窗（非执行中）', () => {
    const { result } = renderHook(() => useConfirmAction({ onConfirm: vi.fn() }));

    act(() => {
      result.current.trigger();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.cancel();
    });
    expect(result.current.isOpen).toBe(false);
  });
});