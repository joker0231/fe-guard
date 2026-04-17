/**
 * useConfirmAction — 带确认弹窗的操作 Hook
 *
 * 用于删除/退出等危险操作。内部管理 isOpen/isConfirming 状态。
 * confirm() 中 await onConfirm()，完成后关闭弹窗。错误抛出给调用方处理。
 *
 * 使用：
 *   const del = useConfirmAction({
 *     onConfirm: () => api.deleteUser(id),
 *     title: '确认删除',
 *     description: '此操作不可撤销',
 *   });
 *
 *   <Button onClick={del.trigger}>删除</Button>
 *   <Dialog open={del.isOpen} onOpenChange={(v) => !v && del.cancel()}>
 *     <DialogTitle>{del.title}</DialogTitle>
 *     <DialogDescription>{del.description}</DialogDescription>
 *     <Button disabled={del.isConfirming} onClick={del.confirm}>确认</Button>
 *   </Dialog>
 */

import { useCallback, useState } from 'react';
import { logger } from '@/lib/logger';

export interface UseConfirmActionOptions {
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
}

export interface UseConfirmActionResult {
  isOpen: boolean;
  isConfirming: boolean;
  trigger: () => void;
  confirm: () => Promise<void>;
  cancel: () => void;
  title: string;
  description: string;
}

const DEFAULT_TITLE = '确认操作';
const DEFAULT_DESCRIPTION = '确定要执行此操作吗？';

export function useConfirmAction(
  options: UseConfirmActionOptions,
): UseConfirmActionResult {
  const { onConfirm, title = DEFAULT_TITLE, description = DEFAULT_DESCRIPTION } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const trigger = useCallback((): void => {
    setIsOpen(true);
  }, []);

  const cancel = useCallback((): void => {
    if (isConfirming) {
      return;
    }
    setIsOpen(false);
  }, [isConfirming]);

  const confirm = useCallback(async (): Promise<void> => {
    setIsConfirming(true);
    try {
      await onConfirm();
      setIsOpen(false);
    } catch (e) {
      logger.error('[useConfirmAction] onConfirm failed', e);
      throw e;
    } finally {
      setIsConfirming(false);
    }
  }, [onConfirm]);

  return {
    isOpen,
    isConfirming,
    trigger,
    confirm,
    cancel,
    title,
    description,
  };
}