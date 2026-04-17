/**
 * useFormSubmit — 表单提交 Hook
 *
 * 统一处理 loading/error/成功回调。
 *
 * 使用：
 *   const { submit, isSubmitting, error, reset } = useFormSubmit({
 *     onSubmit: (values) => api.createUser(values),
 *     onSuccess: (user) => toast.success(`创建成功: ${user.name}`),
 *     onError: (err) => toast.error(err.message),
 *   });
 *
 *   <form onSubmit={handleSubmit(submit)}>
 *     <Button disabled={isSubmitting}>提交</Button>
 *   </form>
 */

import { useCallback, useState } from 'react';
import { logger } from '@/lib/logger';

export interface UseFormSubmitOptions<TValues, TResult> {
  onSubmit: (values: TValues) => Promise<TResult>;
  onSuccess?: (result: TResult, values: TValues) => void;
  onError?: (error: Error, values: TValues) => void;
}

export interface UseFormSubmitResult<TValues> {
  isSubmitting: boolean;
  error: Error | null;
  submit: (values: TValues) => Promise<void>;
  reset: () => void;
}

export function useFormSubmit<TValues, TResult>(
  options: UseFormSubmitOptions<TValues, TResult>,
): UseFormSubmitResult<TValues> {
  const { onSubmit, onSuccess, onError } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const submit = useCallback(
    async (values: TValues): Promise<void> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await onSubmit(values);
        if (onSuccess) {
          onSuccess(result, values);
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        logger.error('[useFormSubmit] submit failed', err);
        setError(err);
        if (onError) {
          onError(err, values);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, onSuccess, onError],
  );

  const reset = useCallback((): void => {
    setError(null);
    setIsSubmitting(false);
  }, []);

  return {
    isSubmitting,
    error,
    submit,
    reset,
  };
}